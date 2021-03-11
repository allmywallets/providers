const Web3 = require('web3')
const MasterChef = require('./MasterChef')

// Auto
const autoFarmChefABI = require('../resources/abis/autoFarmV2.json')
const autoFarmAddress = '0x0895196562C7868C5Be92459FaE7f877ED450452'

class AutoFarmChef extends MasterChef {
  constructor (web3) {
    super(web3, autoFarmChefABI, autoFarmAddress)
    this.contract = new web3.eth.Contract(autoFarmChefABI, autoFarmAddress)
  }

  async getStakedLPAmount (poolID, walletAddress) {
    return await this.contract.methods.stakedWantTokens(poolID, walletAddress).call()
  }

  async getPendingReward (poolID, walletAddress) {
    const pendingReward = await this.contract.methods.pendingAUTO(poolID, walletAddress).call()

    return {
      AUTO: parseFloat(Web3.utils.fromWei(pendingReward))
    }
  }
}

module.exports = AutoFarmChef
