const tokenABI = require('../resources/abis/token.json')
const Web3 = require('web3')

class Token {
  constructor (web3, address) {
    this.address = address
    this.contract = new web3.eth.Contract(tokenABI, address)
  }

  async init () {
    this.symbol = await this.contract.methods.symbol().call()
    this.decimals = await this.contract.methods.decimals().call()
    this.totalSupply = Web3.utils.fromWei(await this.contract.methods.totalSupply().call())
    return this
  }

  stakedTokenEquivalent (lpTokenAmount) {
    const result = {}
    result[this.symbol] = parseFloat(lpTokenAmount)
    return result
  }

  share (lpTokenAmount) {
    return lpTokenAmount / this.totalSupply // TODO might not be correct
  }
}

module.exports = Token
