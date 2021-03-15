const MasterChef = require('./MasterChef')

// PancakeSwap
const pancakeSwapABI = require('../resources/abis/pancakeSwap.json')

class PancakeSwapCloneChef extends MasterChef {
  constructor (web3, address, pendingMethodName, tokenSymbol) {
    const ABISymbol = pendingMethodName.replace('pending', '').toLowerCase()

    const newChefABI = pancakeSwapABI
      .map(replaceABIMap('pendingCake', pendingMethodName))
      .map(replaceABIMap('cakePerBlock', ABISymbol + 'PerBlock'))
    super(web3, newChefABI, address, pendingMethodName, tokenSymbol)
  }
}

function replaceABIMap (methodToReplace, newMethodName) {
  return method => {
    if (method.name !== methodToReplace) {
      return method
    }
    const newMethod = { ...method }
    newMethod.name = newMethodName
    return newMethod
  }
}

module.exports = PancakeSwapCloneChef
