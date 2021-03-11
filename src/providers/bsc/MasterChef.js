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
    if ((new BigNumber(Web3.utils.fromWei(lpTokenAmount))).comparedTo(0.01) === -1) {
      return
    }

    const pendingReward = await this.getPendingReward(poolID, walletAddress)

    const { 0: lpAddress } = await this.contract.methods.poolInfo(poolID).call()
    const tokens = await getTokensEquivalent(this.web3, lpAddress, lpTokenAmount)

    const lpTransactions = this.lpTransactions(tx, poolID)
    const totalDeposited = MasterChef.totalDeposited(lpTransactions)

    lpTokenAmount = parseFloat(Web3.utils.fromWei(lpTokenAmount))
    return {
      poolID, lpTokenAmount, totalDeposited, pendingReward, tokens, lpTransactions
    }
  }

  async getPoolLength () {
    return await this.contract.methods.poolLength().call()
  }

  async listStakedPools (walletAddress, tx) {
    const poolLength = await this.getPoolLength()

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

  async refresh () {
    this.totalSupply = await this.contract.methods.totalSupply().call()
    const reserves = await this.contract.methods.getReserves().call()
    this.reserves0 = reserves._reserve0
    this.reserves1 = reserves._reserve1

    const token0Address = await this.contract.methods.token0().call()
    this.token0 = await (new Token(this.web3, token0Address)).init()

    const token1Address = await this.contract.methods.token1().call()
    this.token1 = await (new Token(this.web3, token1Address)).init()
  }

  tokenAmount (lpTokenAmount) {
    const proportion = BigNumber(lpTokenAmount).dividedBy(this.totalSupply)
    const token0Amount = Web3.utils.fromWei(proportion.multipliedBy(this.reserves0).integerValue().toFixed())
    const token1Amount = Web3.utils.fromWei(proportion.multipliedBy(this.reserves1).integerValue().toFixed())
    return { token0Amount, token1Amount }
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

/**
 * Calculate the number of tokens equivalent of the LP token amount
 * @param {string} lpAddress - Liquidity pool address
 * @param {string} lpTokenAmount - LP Token amount
 * @returns {object} Returns the equivalent number of tokens.
 */
async function getTokensEquivalent (web3, lpAddress, lpTokenAmount) {
  const isLP = await LiquidityPool.isLP(web3, lpAddress)
  if (!isLP) {
    // Single asset vault
    const token = new Token(web3, lpAddress)
    await token.init()
    const result = {}
    result[token.symbol] = parseFloat(Web3.utils.fromWei(lpTokenAmount))
    return result
  }

  const lp = new LiquidityPool(web3, lpAddress)
  await lp.refresh()
  const amounts = lp.tokenAmount(lpTokenAmount)
  const result = {}
  result[lp.token0.symbol] = parseFloat(amounts.token0Amount)
  result[lp.token1.symbol] = parseFloat(amounts.token1Amount)
  return result
}

module.exports = MasterChef
