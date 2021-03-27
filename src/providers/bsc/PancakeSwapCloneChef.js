const MasterChef = require('./MasterChef')

// PancakeSwap
const pancakeSwapABI = require('../resources/abis/pancakeSwap.json')

class PancakeSwapCloneChef extends MasterChef {
  constructor (web3, address, pendingMethodName, tokenSymbol, rewardPerBlockName = '') {
    const ABISymbol = pendingMethodName.replace('pending', '').toLowerCase()
    rewardPerBlockName = rewardPerBlockName !== '' ? rewardPerBlockName : ABISymbol + 'PerBlock'
    const newChefABI = pancakeSwapABI
      .map(replaceABIMap('pendingCake', pendingMethodName))
      .map(replaceABIMap('cakePerBlock', rewardPerBlockName))
    super(web3, newChefABI, address, pendingMethodName, tokenSymbol)
    this.rewardPerBlockName = rewardPerBlockName
  }

  async getRewardPerBlock () {
    try {
      return await this.contract.methods[this.rewardPerBlockName]().call()
    } catch (e) {
      return await MasterChef.prototype.getRewardPerBlock.call(this)
    }
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
