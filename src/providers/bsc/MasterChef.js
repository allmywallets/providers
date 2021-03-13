const Web3 = require('web3')

const BigNumber = require('bignumber.js')
const Token = require('./Token')
const LiquidityPool = require('./LiquidityPool')

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

module.exports = MasterChef
