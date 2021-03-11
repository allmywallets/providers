const Web3 = require('web3')
const MasterChef = require('./MasterChef')
const Token = require('./Token')

// BVault
const bVaultABI = require('../resources/abis/bvault.json')
const bVaultAddress = '0xB390B07fcF76678089cb12d8E615d5Fe494b01Fb' // AdminUpgradeabilityProxy -> BvaultsBank

class BVaultChef extends MasterChef {
  constructor (web3) {
    super(web3, bVaultABI, bVaultAddress)
    this.contract = new web3.eth.Contract(bVaultABI, bVaultAddress)
  }

  async getStakedLPAmount (poolID, walletAddress) {
    return await this.contract.methods.stakedWantTokens(poolID, walletAddress).call()
  }

  async getSinglePendingReward (poolID, walletAddress, rewardID) {
    const pendingReward = await this.contract.methods.pendingReward(poolID, rewardID, walletAddress).call()
    const rewardInfo = await this.contract.methods.rewardPoolInfo(rewardID).call()
    const token = new Token(this.web3, rewardInfo.rewardToken)
    await token.init()

    const reward = {}
    reward[token.symbol] = parseFloat(Web3.utils.fromWei(pendingReward))
    return reward
  }

  async getPendingReward (poolID, walletAddress) {
    const rewardPoolLength = await this.contract.methods.rewardPoolLength().call()
    let rewards = []
    for (let rewardID = 0; rewardID < rewardPoolLength; rewardID++) {
      rewards.push(this.getSinglePendingReward(poolID, walletAddress, rewardID))
    }
    rewards = await Promise.all(rewards)
    return rewards.reduce((acc, reward) => {
      return { ...acc, ...reward }
    })
  }
}
module.exports = BVaultChef
