const Web3 = require('web3')
const BigNumber = require('bignumber.js')
const Token = require('./Token')
const pairABI = require('../resources/abis/pair.json')

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

module.exports = LiquidityPool
