const tokenABI = require('../resources/abis/token.json')

class Token {
  constructor (web3, address) {
    this.address = address
    this.contract = new web3.eth.Contract(tokenABI, address)
  }

  async init () {
    this.symbol = await this.contract.methods.symbol().call()
    this.decimals = await this.contract.methods.decimals().call()
    return this
  }
}

module.exports = Token
