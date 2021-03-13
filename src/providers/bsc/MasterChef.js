const Web3 = require('web3')

const BigNumber = require('bignumber.js')
const pairABI = require('../resources/abis/pair.json')
const Token = require('./Token')

const InputDataDecoder = require('ethereum-input-data-decoder')

class MasterChef {
  constructor (web3, chefABI, address, pendingMethodName, pendingSymbol = '') {
    this.web3 = web3
    this.address = address
    this.contract = new web3.eth.Contract(chefABI, address)
    this.decoder = new InputDataDecoder(chefABI)
    this.pendingMethodName = pendingMethodName
    this.pendingSymbol = pendingSymbol
  }

  lpTransactions (walletTx, poolID) {
    const chefTx = walletTx.filter(t => t.to.toUpperCase() === this.address.toUpperCase())
    return chefTx.map(t => {
      const decoded = this.decoder.decodeData(t.input)
      if (decoded.method !== 'deposit' && decoded.method !== 'withdraw') {
        return null
      }
      const poolIDTx = decoded.inputs[0].toString(10)
      if (poolIDTx !== poolID.toString()) {
        return null
      }

      let lpTokenTx = parseFloat(Web3.utils.fromWei(decoded.inputs[1].toString(10)))
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
  }

  static totalDeposited (lpTransactions) {
    return lpTransactions.reduce((a, b) => a + b.amount, 0)
  }

  async getStakedLPAmount (poolID, walletAddress) {
    const userInfo = await this.contract.methods.userInfo(poolID, walletAddress).call()
    return userInfo['0']
  }

  async getPendingReward (poolID, walletAddress) {
    const pendingReward = await this.contract.methods[this.pendingMethodName](poolID, walletAddress).call()

    let tokenName = this.pendingSymbol
    if (tokenName === '') {
      tokenName = this.pendingMethodName.replace('pending', '').toUpperCase()
    }

    const rewards = {}
    rewards[tokenName] = parseFloat(Web3.utils.fromWei(pendingReward))
    return rewards
  }

  async stakedPool (poolID, walletAddress, tx) {
    let lpTokenAmount = await this.getStakedLPAmount(poolID, walletAddress)
    lpTokenAmount = parseFloat(Web3.utils.fromWei(lpTokenAmount))

    if ((new BigNumber(lpTokenAmount)).comparedTo(0.01) === -1) {
      return
    }

    const pendingReward = await this.getPendingReward(poolID, walletAddress)

    const { 0: lpAddress, allocPoint } = await this.contract.methods.poolInfo(poolID).call()

    const isLP = await LiquidityPool.isLP(this.web3, lpAddress)
    const Pool = isLP ? LiquidityPool : Token
    const pool = new Pool(this.web3, lpAddress)
    await pool.init()
    const tokens = pool.stakedTokenEquivalent(lpTokenAmount)

    const lpTransactions = this.lpTransactions(tx, poolID)
    const totalDeposited = MasterChef.totalDeposited(lpTransactions)

    const poolRewardPerBlock = Web3.utils.fromWei(BigNumber(allocPoint).dividedBy(this.totalAllocPoint).multipliedBy(this.rewardPerBlock).integerValue().toFixed())
    const userPoolRewardPerBlock = poolRewardPerBlock * pool.share(lpTokenAmount)
    const rewardPerYear = userPoolRewardPerBlock * 3600 * 24 * 365 / 3

    return {
      poolID, lpTokenAmount, totalDeposited, pendingReward, tokens, rewardPerYear, lpAddress, lpTransactions
    }
  }

  async getPoolLength () {
    return await this.contract.methods.poolLength().call()
  }

  async listStakedPools (walletAddress, tx) {
    const poolLength = await this.getPoolLength()
    this.totalAllocPoint = await this.contract.methods.totalAllocPoint().call()

    try {
      this.rewardPerBlock = await this.contract.methods.cakePerBlock().call() // TODO change reward per block
    } catch (e) {
      this.rewardPerBlock = 0
    }

    let pools = []
    for (let poolID = 1; poolID < poolLength; poolID++) {
      pools.push(this.stakedPool(poolID, walletAddress, tx))
    }

    pools = await Promise.all(pools)

    return pools.filter(pool => pool)
  }
}

class LiquidityPool {
  constructor (web3, address) {
    this.address = address
    this.contract = new web3.eth.Contract(pairABI, address)
    this.web3 = web3
  }

  async init () {
    this.totalSupply = Web3.utils.fromWei(await this.contract.methods.totalSupply().call())
    const reserves = await this.contract.methods.getReserves().call()
    this.reserves0 = Web3.utils.fromWei(reserves._reserve0)
    this.reserves1 = Web3.utils.fromWei(reserves._reserve1)

    const token0Address = await this.contract.methods.token0().call()
    this.token0 = await (new Token(this.web3, token0Address)).init()

    const token1Address = await this.contract.methods.token1().call()
    this.token1 = await (new Token(this.web3, token1Address)).init()
  }

  /**
   * Calculate the number of tokens equivalent of the LP token amount
   * @param {string} lpTokenAmount - LP Token amount
   * @returns {object} Returns the equivalent number of tokens.
   */
  stakedTokenEquivalent (lpTokenAmount) {
    const proportion = BigNumber(lpTokenAmount).dividedBy(this.totalSupply)
    const token0Amount = proportion.multipliedBy(this.reserves0).toFixed()
    const token1Amount = proportion.multipliedBy(this.reserves1).toFixed()

    const result = {}
    result[this.token0.symbol] = parseFloat(token0Amount)
    result[this.token1.symbol] = parseFloat(token1Amount)
    return result
  }

  share (lpTokenAmount) {
    return lpTokenAmount / this.totalSupply
  }

  static async isLP (web3, address) {
    try {
      const contract = new web3.eth.Contract(pairABI, address)
      await contract.methods.token0().call()
      return true
    } catch (e) {
      return false
    }
  }
}

module.exports = MasterChef
