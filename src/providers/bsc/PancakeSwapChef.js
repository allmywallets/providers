const MasterChef = require('./MasterChef')

// PancakeSwap
const pancakeSwapABI = require('../resources/abis/pancakeSwap.json')
const pancakeSwapAddress = '0x73feaa1eE314F8c655E354234017bE2193C9E24E'

class PancakeSwapChef extends MasterChef {
  constructor (web3) {
    super(web3, pancakeSwapABI, pancakeSwapAddress, 'pendingCake')
  }
}
module.exports = PancakeSwapChef
