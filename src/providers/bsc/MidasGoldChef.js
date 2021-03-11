const MasterChef = require('./MasterChef')

// Midas Gold
const midasGoldABI = require('../resources/abis/midasGold.json')
const midasGoldAddress = '0x8f0A813D39F019a2A98958eDbf5150d3a06Cd20f' // AdminUpgradeabilityProxy -> MdgRewardPool

class MidasGoldChef extends MasterChef {
  constructor (web3) {
    super(web3, midasGoldABI, midasGoldAddress, 'pendingReward', 'MDG')
  }

  async getPoolLength () {
    return 21
  }
}

module.exports = MidasGoldChef
