const MasterChef = require('./MasterChef')

// PancakeSwap
const pancakeSwapABI = require('../resources/abis/pancakeSwap.json')

class PancakeSwapCloneChef extends MasterChef {
  constructor (web3, address, pendingMethodName, tokenSymbol = '') {
    const newChefABI = pancakeSwapABI.map(method => {
      if (method.name !== 'pendingCake') {
        return method
      }
      const newMethod = { ...method }
      newMethod.name = pendingMethodName
      return newMethod
    })
    super(web3, newChefABI, address, pendingMethodName)
  }
}

module.exports = PancakeSwapCloneChef
