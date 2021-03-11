const Web3 = require('web3')

const AutoFarmChef = require('./bsc/AutoFarmChef')
const BVaultChef = require('./bsc/BVaultChef')
const MidasGoldChef = require('./bsc/MidasGoldChef')
const PancakeSwapChef = require('./bsc/PancakeSwapChef')
const PancakeSwapCloneChef = require('./bsc/PancakeSwapCloneChef')

const api = require('bscscan-api').init('YourApiKey')

const NotSupportedPlatformError = require('../errors/NotSupportedPlatformError')

/**
 * Binance Smart Chain DeFi provider
 */
class BSCDeFi {
  constructor (node = 'https://bsc-dataseed1.binance.org:443') {
    const web3 = new Web3(node)

    this.defiPlatforms = {
      acryptos: new PancakeSwapCloneChef(web3, '0x96c8390BA28eB083A784280227C37b853bc408B7', 'pendingSushi', 'ACS'),
      alpaca: new PancakeSwapCloneChef(web3, '0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F', 'pendingAlpaca'),
      apeSwap: new PancakeSwapCloneChef(web3, '0x5c8D727b265DBAfaba67E050f2f739cAeEB4A6F9', 'pendingCake', 'BANANA'),
      autoFarm: new AutoFarmChef(web3),
      bVault: new BVaultChef(web3),
      cafeSwap: new PancakeSwapCloneChef(web3, '0xc772955c33088a97D56d0BBf473d05267bC4feBB', 'pendingCake', 'BREW'),
      coralFarm: new PancakeSwapCloneChef(web3, '0x713e34640ef300a0B178a9688458BbA8b1FA35A7', 'pendingCrl'),
      goose: new PancakeSwapCloneChef(web3, '0xe70E9185F5ea7Ba3C5d63705784D8563017f2E57', 'pendingEgg'),
      kebab: new PancakeSwapCloneChef(web3, '0x76FCeffFcf5325c6156cA89639b17464ea833ECd', 'pendingCake', 'KEBAB'),
      midasGold: new MidasGoldChef(web3),
      pancakeSwap: new PancakeSwapChef(web3),
      ramen: new PancakeSwapCloneChef(web3, '0x97dd424b4628c8d3bd7fcf3a4e974cebba011651', 'pendingCake', 'RAMEN'),
      saltSwap: new PancakeSwapCloneChef(web3, '0xB4405445fFAcF2B86BC2bD7D1C874AC739265658', 'pendingSalt'),
      slime: new PancakeSwapCloneChef(web3, '0x4B0073A79f2b46Ff5a62fA1458AAc86Ed918C80C', 'pendingReward', 'SLIME')
    }
  }

  static get isExchange () {
    return false
  }

  static get isDeFi () {
    return true
  }

  availablePlatforms () {
    return Object.keys(this.defiPlatforms)
  }

  static get info () {
    return {
      name: 'BSCDeFi',
      url: 'https://www.binance.org/en/smartChain',
      network: 'bsc',
      provider: 'defi',
      description: 'Binance Smart Chain DeFi provider',
      hasCORS: true
    }
  }

  /**
   * Set the wallet address
   * @param {String} address
   */
  address (address) {
    this.walletAddress = address
    return this
  }

  /**
   * Set the defi platforms to fetch
   * @param {[String]} platforms
   */
  platforms (platforms) {
    this.defiPlatformsName = platforms
    return this
  }

  async exec () {
    const txResult = await api.account.txlist(this.walletAddress, 1, 'latest', 1, 10000, 'desc')
    const walletTransactions = txResult.result

    const promises = this.defiPlatformsName.map(platformName => {
      if (!(platformName in this.defiPlatforms)) {
        throw new NotSupportedPlatformError(platformName + ' is not a supported platform')
      }
      const platform = this.defiPlatforms[platformName]
      return platform.listStakedPools(this.walletAddress, walletTransactions)
    })
    return await Promise.all(promises)
  }
}

module.exports = BSCDeFi
