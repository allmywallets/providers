const AbstractExplorer = require('./AbstractProvider')
const NotSupportedCurrencyError = require('../errors/NotSupportedCurrencyError')

const API_URL = 'https://chainz.cryptoid.info/'

/**
 *  CryptoID blockchain explorers https://chainz.cryptoid.info/
 */
class CryptoID extends AbstractExplorer {
  constructor (parameters) {
    super()

    this.parameters = parameters || {}
    this.supportedCurrencies = {BTC: {name: 'Bitcoin', ticker: 'BTC'}}
  }

  static get info () {
    return {
      name: 'CryptoID',
      url: 'https://chainz.cryptoid.info/',
      documentation: 'https://raw.githubusercontent.com/allmywallets/providers-docs/master/api.crytoid/how-to.md',
      network: 'api',
      provider: 'cryptoid',
      description: 'CryptoID provides multiple blockchains explorers.',
      hasCORS: false
    }
  }

  async getSupportedCurrencies () {
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'origin': '.',
      'x-requested-with': '.'
    }
    const currencies = await this._fetchJson(`${API_URL}/explorer/api.dws?q=summary`, {headers})
    const newCurrencies = {}

    for (let curr in currencies) {
      newCurrencies[curr.toUpperCase()] = {name: currencies[curr].name, ticker: curr.toUpperCase()}
    }
    return newCurrencies
  }

  static get dynamicSupportedCurrencies () {
    return true
  }

  async _getBalances (address) {
    if (!this.parameters.apiKey) {
      throw new Error('Api key is required for CryptoID, request it here https://chainz.cryptoid.info/api.key.dws')
    }

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'origin': '.',
      'x-requested-with': '.'
    }

    const balances = []
    const promises = []
    this.tickers.forEach(async ticker => {
      promises.push(this._fetchJson(`${API_URL}/${ticker.toLowerCase()}/api.dws?q=getbalance&a=${address}&key=${this.parameters.apiKey}`, {headers})
                                    .catch(() => { throw new NotSupportedCurrencyError(`${ticker} is not supported`) }))
    })
    let apiBalances = await Promise.all(promises)
    apiBalances.forEach(balance => {
      balances.push(balance)
    })

    return balances
  }

  async _getTransactions (address) {
    const transactions = []
    this.tickers.forEach(ticker => {
      transactions.push([])
    })

    return transactions
  }

  static getProviderParameters () {
    return [{
      type: 'input',
      inputType: 'text',
      label: 'CryptoID api key, redeem it here https://chainz.cryptoid.info/api.key.dws',
      model: 'apiKey',
      required: true
    }]
  }
}

module.exports = CryptoID
