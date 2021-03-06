const AbstractExplorer = require('./AbstractProvider')
const ERC20Token = require('./resources/ERC20Tokens.json')

const API_URL = 'https://api.etherscan.io/api'

class EthereumEtherscan extends AbstractExplorer {
  constructor (parameters) {
    super()

    if (parameters && parameters.customTokens) {
      this.supportedCurrencies = Object.assign(this.supportedCurrencies, parameters.customTokens)
    }
    this.apiKey = parameters.apiKey
  }

  static get info () {
    return {
      name: 'Etherscan',
      url: 'https://etherscan.io/',
      network: 'ethereum',
      provider: 'etherscan',
      description: 'Etherscan is an Ethereum block explorer.',
      hasCORS: true
    }
  }

  getSupportedCurrencies () {
    const currencies = { ETH: { name: 'Ethereum', ticker: 'ETH', decimals: 18 } }
    return Object.assign(currencies, ERC20Token)
  }

  static getDefaultTicker () {
    return 'ETH'
  }

  async _getBalances (address) {
    const promises = []
    this.tickers.forEach(ticker => {
      if (ticker === this.constructor.getDefaultTicker()) { // ETH
        promises.push(this._fetchJson(`${API_URL}?module=account&action=balance&address=${address}&sort=desc&tag=latest&apikey=${this.apiKey}`))
      } else { // Tokens
        promises.push(this._fetchJson(`${API_URL}?module=account&action=tokenbalance&contractaddress=${this.supportedCurrencies[ticker].contractAddress}&address=${address}&tag=latest&apikey=${this.apiKey}`))
      }
    })

    const results = await Promise.all(promises)

    const balances = []
    for (let i = 0; i < this.tickers.length; i++) {
      const ticker = this.tickers[i]
      const decimals = this.supportedCurrencies[ticker].decimals || 18
      balances.push(results[i].result / Math.pow(10, decimals))
    }

    return balances
  }

  async _getTransactions (address) {
    const res = await this._fetchJson(`${API_URL}?module=account&action=txlist&address=${address}&sort=desc&tag=latest&apikey=${this.apiKey}`)
    const apiResTransactions = res.result
    if (typeof apiResTransactions === 'string') {
      throw apiResTransactions
    }

    for (const tx of apiResTransactions) {
      tx.type = tx.from === this.address ? 'out' : 'in'

      tx.id = tx.hash
      delete tx.hash

      tx.amount = tx.value
      delete tx.value
    }

    // TODO : Retrieve correct transactions for tokens
    const transactions = []
    this.tickers.forEach(() => {
      transactions.push(apiResTransactions)
    })

    return transactions
  }

  static getProviderParameters () {
    return [{
      type: 'input',
      inputType: 'text',
      label: 'API KEY',
      model: 'apiKey'
    },
    {
      type: 'input',
      inputType: 'text',
      label: 'Custom tokens (optional)',
      model: 'customTokens'
    }
    ]
  }
}

module.exports = EthereumEtherscan
