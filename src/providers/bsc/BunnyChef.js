const Web3 = require('web3')

const MasterChef = require('./MasterChef')
const Token = require('./Token')
const LiquidityPool = require('./LiquidityPool')

// PancakeSwap
const bunnyVaultABI = require('../resources/abis/bunny.json')

class BunnyChef extends MasterChef {
  constructor (web3) {
    super(web3, bunnyVaultABI)

    this.vaults = [
      // https://github.com/PancakeBunny-finance/Bunny#cake-maximizer---deposit-flip-earn-cake
      '0xEDfcB78e73f7bA6aD2D829bf5D462a0924da28eD',
      '0x3f139386406b0924eF115BAFF71D0d30CC090Bd5',
      '0xCBd4472cbeB7229278F841b2a81F1c0DF1AD0058',
      '0x41dF17D1De8D4E43d5493eb96e01100908FCcc4f',
      '0x92a0f75a0f07C90a7EcB65eDD549Fa6a45a4975C',
      '0xE07BdaAc4573a00208D148bD5b3e5d2Ae4Ebd0Cc',
      '0xa5B8cdd3787832AdEdFe5a04bF4A307051538FF2',
      '0x866FD0028eb7fc7eeD02deF330B05aB503e199d4',
      // https://github.com/PancakeBunny-finance/Bunny#auto-compounding-flip---deposit-flip-earn-flip
      '0x7eaaEaF2aB59C2c85a17BEB15B110F81b192e98a',
      '0x0137d886e832842a3B11c568d5992Ae73f7A792e',
      '0xE02BCFa3D0072AD2F52eD917a7b125e257c26032',
      '0x1b6e3d394f1D809769407DEA84711cF57e507B99',
      '0xC1aAE51746bEA1a1Ec6f17A4f75b422F8a656ee6',
      '0xa59EFEf41040e258191a4096DC202583765a43E7',
      '0xC0314BbE19D4D5b048D3A3B974f0cA1B2cEE5eF3'
    ]
  }

  async listStakedPools (walletAddress, tx) {
    let pools = []
    for (let poolID = 0; poolID < this.vaults.length; poolID++) {
      pools.push(this.stakedPool(poolID, walletAddress, tx))
    }

    pools = await Promise.all(pools)

    return pools.filter(pool => pool)
  }

  lpTransactions (walletTx, lpAddress) {
    const chefTx = walletTx.filter(t => t.to.toUpperCase() === lpAddress.toUpperCase())

    let lastWithdrawAllTime = 0

    return chefTx.map(t => {
      const decoded = this.decoder.decodeData(t.input)

      if (decoded.method === 'withdrawAll') {
        lastWithdrawAllTime = lastWithdrawAllTime === 0 ? parseInt(t.timeStamp) : lastWithdrawAllTime
        return null
      }

      if (decoded.method !== 'deposit' && decoded.method !== 'withdraw') {
        return null
      }

      let lpTokenTx = parseFloat(Web3.utils.fromWei(decoded.inputs[0].toString(10)))
      if (decoded.method === 'withdraw') {
        lpTokenTx *= -1
      }

      return {
        type: decoded.method,
        hash: t.hash,
        amount: lpTokenTx,
        timestamp: t.timeStamp
      }
    }).filter(t => t !== null)
      .filter(t => parseInt(t.timestamp) > lastWithdrawAllTime)
  }

  async stakedPool (poolID, walletAddress, tx) {
    const lpAddress = this.vaults[poolID]
    const vault = new BunnyVault(this.web3, lpAddress)
    await vault.init()
    const lpTokenAmount = await vault.balanceOf(walletAddress)

    if (lpTokenAmount === 0) {
      return
    }

    const tokens = await vault.stakedTokenEquivalent(lpTokenAmount)
    const lpTransactions = this.lpTransactions(tx, lpAddress)
    const totalDeposited = MasterChef.totalDeposited(lpTransactions)

    const rewardPerYear = 0
    const pendingReward = 0

    return {
      poolID, lpTokenAmount, totalDeposited, pendingReward, tokens, rewardPerYear, lpAddress, lpTransactions
    }
  }
}

class BunnyVault {
  constructor (web3, address) {
    this.web3 = web3
    this.contract = new web3.eth.Contract(bunnyVaultABI, address)
  }

  async init () {
    const lpAddress = await this.contract.methods.stakingToken().call()
    const isLP = await LiquidityPool.isLP(this.web3, lpAddress)
    const Pool = isLP ? LiquidityPool : Token
    const pool = new Pool(this.web3, lpAddress)
    await pool.init()
    this.pool = pool
  }

  async profit (walletAddress) {
    const rewardTokenAddress = await this.contract.methods.rewardsToken().call()
    const rewardToken = new Token(this.web3, rewardTokenAddress)
    await rewardToken.init()
    const result = {}
    result[rewardToken.symbol] = parseFloat(Web3.utils.fromWei(await this.contract.methods.earned(walletAddress).call()))
    return result
  }

  async balanceOf (walletAddress) {
    return parseFloat(Web3.utils.fromWei(await this.contract.methods.balanceOf(walletAddress).call()))
  }

  async stakedTokenEquivalent (lpTokenAmount) {
    return this.pool.stakedTokenEquivalent(lpTokenAmount)
  }
}

module.exports = BunnyChef
