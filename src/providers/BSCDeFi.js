const Web3 = require('web3')
const web3 = new Web3('https://bsc-dataseed1.binance.org:443')

const api = require('bscscan-api').init('YourApiKey')

const BigNumber = require('bignumber.js')
const InputDataDecoder = require('ethereum-input-data-decoder')

const NotSupportedPlatformError = require('../errors/NotSupportedPlatformError')

const tokenABI = require('./resources/abis/token.json')
const pairABI = require('./resources/abis/pair.json')

// PancakeSwap
const pancakeSwapABI = require('./resources/abis/pancakeSwap.json')
const pancakeSwapAddress = '0x73feaa1eE314F8c655E354234017bE2193C9E24E'

// Auto
const autoFarmChefABI = require('./resources/abis/autoFarmV2.json')
const autoFarmAddress = '0x0895196562C7868C5Be92459FaE7f877ED450452'

// BVault
const bVaultABI = require('./resources/abis/bvault.json')
const bVaultAddress = '0xB390B07fcF76678089cb12d8E615d5Fe494b01Fb' // AdminUpgradeabilityProxy -> BvaultsBank

class Token {
  constructor (address) {
    this.address = address
    this.contract = new web3.eth.Contract(tokenABI, address)
  }

  async init () {
    this.symbol = await this.contract.methods.symbol().call()
    this.decimals = await this.contract.methods.decimals().call()
    return this
  }
}

class LiquidityPool {
  constructor (address) {
    this.address = address
    this.contract = new web3.eth.Contract(pairABI, address)
  }

  async refresh () {
    this.totalSupply = await this.contract.methods.totalSupply().call()
    const reserves = await this.contract.methods.getReserves().call()
    this.reserves0 = reserves._reserve0
    this.reserves1 = reserves._reserve1

    const token0Address = await this.contract.methods.token0().call()
    this.token0 = await (new Token(token0Address)).init()

    const token1Address = await this.contract.methods.token1().call()
    this.token1 = await (new Token(token1Address)).init()
  }

  tokenAmount (lpTokenAmount) {
    const proportion = BigNumber(lpTokenAmount).dividedBy(this.totalSupply)
    const token0Amount = Web3.utils.fromWei(proportion.multipliedBy(this.reserves0).integerValue().toFixed())
    const token1Amount = Web3.utils.fromWei(proportion.multipliedBy(this.reserves1).integerValue().toFixed())
    return { token0Amount, token1Amount }
  }

  static async isLP (address) {
    try {
      const contract = new web3.eth.Contract(pairABI, address)
      await contract.methods.token0().call()
      return true
    } catch (e) {
      return false
    }
  }
}

/**
 * Calculate the number of tokens equivalent of the LP token amount
 * @param {string} lpAddress - Liquidity pool address
 * @param {string} lpTokenAmount - LP Token amount
 * @returns {object} Returns the equivalent number of tokens.
 */
async function getTokensEquivalent (lpAddress, lpTokenAmount) {
  const isLP = await LiquidityPool.isLP(lpAddress)
  if (!isLP) {
    // Single asset vault
    const token = new Token(lpAddress)
    await token.init()
    const result = {}
    result[token.symbol] = parseFloat(Web3.utils.fromWei(lpTokenAmount))
    return result
  }

  const lp = new LiquidityPool(lpAddress)
  await lp.refresh()
  const amounts = lp.tokenAmount(lpTokenAmount)
  const result = {}
  result[lp.token0.symbol] = parseFloat(amounts.token0Amount)
  result[lp.token1.symbol] = parseFloat(amounts.token1Amount)
  return result
}

class MasterChef {
  constructor (chefABI, address, pendingMethodName) {
    this.address = address
    this.contract = new web3.eth.Contract(chefABI, address)
    this.decoder = new InputDataDecoder(chefABI)
    this.pendingMethodName = pendingMethodName
  }

  lpTransactions (walletTx, poolID) {
    const chefTx = walletTx.filter(t => t.to.toUpperCase() === this.address.toUpperCase())
    return chefTx.map(t => {
      const decoded = this.decoder.decodeData(t.input)
      if (decoded.method !== 'deposit' && decoded.method !== 'withdraw') {
        return null
      }
      const poolIDTx = decoded.inputs[0].toString(10)
      if (poolIDTx !== poolID.toString()) {
        return null
      }

      let lpTokenTx = parseFloat(Web3.utils.fromWei(decoded.inputs[1].toString(10)))
      if (decoded.method === 'withdraw') {
        lpTokenTx *= -1
      }
      return {
        type: decoded.method,
        hash: t.hash,
        amount: lpTokenTx,
        timestamp: t.timeStamp
      }
    }).filter(t => t !== null)
  }

  static totalDeposited (lpTransactions) {
    return lpTransactions.reduce((a, b) => a + b.amount, 0)
  }

  async getStakedLPAmount (poolID, walletAddress) {
    const userInfo = await this.contract.methods.userInfo(poolID, walletAddress).call()
    return userInfo['0']
  }

  async getPendingReward (poolID, walletAddress) {
    const pendingReward = await this.contract.methods[this.pendingMethodName](poolID, walletAddress).call()

    const tokenName = this.pendingMethodName.replace('pending', '').toUpperCase()

    const rewards = {}
    rewards[tokenName] = parseFloat(Web3.utils.fromWei(pendingReward))
    return rewards
  }

  async stakedPool (poolID, walletAddress, tx) {
    let lpTokenAmount = await this.getStakedLPAmount(poolID, walletAddress)
    if ((new BigNumber(Web3.utils.fromWei(lpTokenAmount))).comparedTo(0.01) === -1) {
      return
    }

    const pendingReward = await this.getPendingReward(poolID, walletAddress)

    const { 0: lpAddress } = await this.contract.methods.poolInfo(poolID).call()
    const tokens = await getTokensEquivalent(lpAddress, lpTokenAmount)

    const lpTransactions = this.lpTransactions(tx, poolID)
    const totalDeposited = MasterChef.totalDeposited(lpTransactions)

    lpTokenAmount = parseFloat(Web3.utils.fromWei(lpTokenAmount))
    return {
      poolID, lpTokenAmount, totalDeposited, pendingReward, tokens, lpTransactions
    }
  }

  async listStakedPools (walletAddress, tx) {
    const poolLength = await this.contract.methods.poolLength().call()

    let pools = []
    for (let poolID = 1; poolID < poolLength; poolID++) {
      pools.push(this.stakedPool(poolID, walletAddress, tx))
    }

    pools = await Promise.all(pools)

    return pools.filter(pool => pool)
  }
}

class AutoFarmChef extends MasterChef {
  constructor () {
    super(autoFarmChefABI, autoFarmAddress)
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

class BVaultChef extends MasterChef {
  constructor () {
    super(bVaultABI, bVaultAddress)
    this.contract = new web3.eth.Contract(bVaultABI, bVaultAddress)
  }

  async getStakedLPAmount (poolID, walletAddress) {
    return await this.contract.methods.stakedWantTokens(poolID, walletAddress).call()
  }

  async getSinglePendingReward (poolID, walletAddress, rewardID) {
    const pendingReward = await this.contract.methods.pendingReward(poolID, rewardID, walletAddress).call()
    const rewardInfo = await this.contract.methods.rewardPoolInfo(rewardID).call()
    const token = new Token(rewardInfo.rewardToken)
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

class PancakeSwapChef extends MasterChef {
  constructor () {
    super(pancakeSwapABI, pancakeSwapAddress, 'pendingCake')
  }
}

class PancakeSwapCloneChef extends MasterChef {
  constructor (address, pendingMethodName) {
    const newChefABI = pancakeSwapABI.map(method => {
      if (method.name !== 'pendingCake') {
        return method
      }
      const newMethod = { ...method }
      newMethod.name = pendingMethodName
      return newMethod
    })
    super(newChefABI, address, pendingMethodName)
  }
}

const defiPlatforms = {
  alpaca: new PancakeSwapCloneChef('0xA625AB01B08ce023B2a342Dbb12a16f2C8489A8F', 'pendingAlpaca'),
  autoFarm: new AutoFarmChef(),
  pancakeSwap: new PancakeSwapChef(),
  bVault: new BVaultChef(),
  goose: new PancakeSwapCloneChef('0xe70E9185F5ea7Ba3C5d63705784D8563017f2E57', 'pendingEgg'),
  saltSwap: new PancakeSwapCloneChef('0xB4405445fFAcF2B86BC2bD7D1C874AC739265658', 'pendingSalt')
}

/**
 * Binance Smart Chain DeFi provider
 */
class BSCDeFi {
  static get isExchange () {
    return false
  }

  static get availablePlatforms () {
    return Object.keys(defiPlatforms)
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
    this.defiPlatforms = platforms
    return this
  }

  async exec () {
    const txResult = await api.account.txlist(this.walletAddress, 1, 'latest', 1, 10000, 'desc')
    const walletTransactions = txResult.result

    const promises = this.defiPlatforms.map(platformName => {
      if (!(platformName in defiPlatforms)) {
        throw new NotSupportedPlatformError(platformName + ' is not a supported platform')
      }
      const platform = defiPlatforms[platformName]
      return platform.listStakedPools(this.walletAddress, walletTransactions)
    })
    return await Promise.all(promises)
  }
}

module.exports = BSCDeFi
