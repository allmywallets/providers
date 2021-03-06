const NotSupportedCurrencyError = require('../errors/NotSupportedCurrencyError')

const isNode = (typeof window === 'undefined') && !(typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) // eslint-disable-line no-eval, no-undef
const fetchImplementation = isNode ? eval('require')('node-fetch') : fetch // eslint-disable-line no-eval, no-undef

/**
 * A block/DAGchain explorer
 */
class AbstractExplorer {
  constructor (parameters) {
    this.parameters = parameters

    this._addresses = []
    this.tickers = []
    this.elementsToFetch = []

    this.proxy = ''

    if (!this.constructor.dynamicSupportedCurrencies) {
      this.supportedCurrencies = this.getSupportedCurrencies()
    }
  }

  setProxy (proxy) {
    this.proxy = proxy
  }

  static get info () {
    throw new Error('This method should be implemented by child class')
  }

  /**
   * Returns true if the class represents an Exchange otherwise false
   * @returns {boolean}
   */
  static get isExchange () {
    return false
  }

  /**
   * Returns the default ticker that will be selected when no currency is provided
   * @returns {String}
   */
  static getDefaultTicker () {
    return 'BTC'
  }

  async checkAddresses (addresses) {

  }

  async checkWallets (wallets) {

  }

  async checkParameters () {

  }

  static get dynamicSupportedCurrencies () {
    return false
  }

  /**
   * Returns the supported currencies
   * @returns {[object]}
   */
  getSupportedCurrencies () {
    return { BTC: { name: 'AbstractExplorerCoin', ticker: 'BTC' } }
  }

  /**
   * Used for Exchange or special blockchain with multiple identifier for a wallet
   * Example wallet object : {apikey: 'AAA', secret: 'BBB'}
   * Use the method address for classic blockchain @see AbtractExplorer.address
   * @param {object} wallet
   */
  wallet (wallet) {
    this._addresses.push(wallet)
    return this
  }

  /**
   * Multiple wallet version of wallet method @see AbtractExplorer.wallet
   * @param {[object]} wallets
   */
  wallets (wallets) {
    wallets.forEach(wallets => this.wallet(wallets))
    return this
  }

  /**
   * Set the wallet address
   * @param {String} address
   */
  address (address) {
    this._addresses.push(address)
    return this
  }

  /**
   * Multiple address version of address method @see AbtractExplorer.address
   * @param {[object]} addresses
   */
  addresses (addresses) {
    this._addresses = []
    addresses.forEach(address => this.address(address))
    return this
  }

  /**
   * Returns true if the ticker is supported by the Explorer, false otherwise
   * @returns {boolean}
   */
  isTickerSupported (ticker) {
    return !!this.supportedCurrencies[ticker]
  }

  /**
   * Set the currency
   * If no currency is set, the default Currency will be returned for a blockchain,
   * the list of all not null balances for an exchange
   * @param {String} ticker
   */
  currency (ticker) {
    if (!this.constructor.dynamicSupportedCurrencies && !this.isTickerSupported(ticker)) { // For exchange there is the supportedCurrencies is not filled
      throw new NotSupportedCurrencyError(`${ticker} is not supported`)
    }

    this.tickers.push(ticker)
    return this
  }

  /**
   * Multiple currency version of currency method @see AbtractExplorer.currency
   * @param {[object]} tickers
   */
  currencies (tickers) {
    this.tickers = []
    tickers.forEach(ticker => this.currency(ticker))
    return this
  }

  /**
   * Set the elements to fetch
   * @param {[String]} fetchs
   */
  fetch (fetchs) {
    this.elementsToFetch = fetchs
    return this
  }

  /**
   * Set the maximum number of transaction return
   * @param {Number} fetchs
   */
  transactionsLimit (limit) {
    this.transactionsLimit = limit
    return this
  }

  /**
   * Set the date to fetch transaction from
   * @param {Date} startDate
   */
  transactionsStartDate (startDate) {
    throw new Error('Not yet implemented')
  }

  /**
   * Return the parameters needed for the constructor
   * @returns {object}
   */
  static getProviderParameters () {
    return []
  }

  /**
   * Get the information needed to identify an account
   * @returns {object}
   */
  static getWalletIdentifierParameters () {
    return [{
      type: 'input',
      inputType: 'text',
      label: `${this.getDefaultTicker()} addresses`,
      model: 'addresses',
      required: true
    }]
  }

  /**
   * Return the selected currencies as ticker
   * @returns {[Object]}
   */
  getSelectedCurrencies () {
    return this.tickers.map(ticker => this.supportedCurrencies[ticker])
  }

  async _getBalances (address) {
    throw new Error('This method should be implemented by child class')
  }

  async _getTransactions (address) {
    throw new Error('This method should be implemented by child class')
  }

  async _getAddresses (address) {
    return this.tickers.map(ticker => address)
  }

  async _setResultBalances (address, result) {
    result.balances = await this._getBalances(address)
  }

  async _setResultTransactions (address, result) {
    result.transactions = await this._getTransactions(address)
  }

  async _setResultAddresses (address, result) {
    result.addresses = await this._getAddresses(address)
  }

  /**
   * Execute the request
   * @throws {OnlyEmptyBalancesFound}
   * @returns {Promise<object>}
   */
  async exec () {
    const promises = []
    const wallets = []

    if (this.tickers.length === 0) {
      this.tickers.push(this.constructor.getDefaultTicker())
    }

    this._addresses.forEach(address => {
      const wallet = {}
      if (this.elementsToFetch.includes('balances')) {
        promises.push(this._setResultBalances(address, wallet))
      }

      if (this.elementsToFetch.includes('transactions')) {
        promises.push(this._setResultTransactions(address, wallet))
      }

      if (this.elementsToFetch.includes('addresses')) {
        promises.push(this._setResultAddresses(address, wallet))
      }

      wallets.push(wallet)
    })

    await Promise.all(promises)

    return wallets
  }

  async _fetchJson (url, options = {}) {
    const response = await fetchImplementation(this.proxy + url, options)
    return response.json().catch(() => {
      throw new Error(`Failed to parse JSON: ${response.status} ${response.statusText}`)
    })
  }
}

module.exports = AbstractExplorer
