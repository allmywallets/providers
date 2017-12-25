const NotSupportedCurrencyError = require('./errors/NotSupportedCurrencyError')

/**
 * A block/DAGchain explorer
 */
class AbstractExplorer {
  constructor (params) {
    this.params = params

    this._addresses = []
    this.wallets = []

    this.tickers = []
    this.elementsToFetch = []

    this.defaultTicker = 'AEC'
    this.supportedCurrencies = {AEC: {name: 'AbstractExplorerCoin', ticker: 'AEC'}}
  }

  /**
   * Used for special blockchain with multiple identifier for a wallet
   * Example wallet object : {address1: '0x', address2: '0x'}
   * Use the method address for classic blockchain @see AbtractExplorer.address
   * @param {object} wallet
   */
  wallet (wallet) {
    this.wallets.push(wallet)
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
   * @param {String} ticker
   */
  currency (ticker) {
    if (!this.isTickerSupported(ticker)) {
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
   * Return the params needed for the constructor
   * @returns {object}
   */
  static getExplorerParams () {
    return [{
      type: 'input',
      inputType: 'text',
      label: 'API key (optional)',
      model: 'apiKey'
    }]
  }

  /**
   * Get the information needed to identify an account
   * @returns {object}
   */
  static getAddressParam () {
    return [{
      type: 'input',
      inputType: 'text',
      label: 'AbstractExplorer address',
      model: 'address',
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

  async _getBalances (address, result) {
    throw new Error('This method should be implemented by child class')
  }
  async _getTransactions (address, result) {
    throw new Error('This method should be implemented by child class')
  }

  /**
   * Execute the request
   * @returns {Promise<object>}
   */
  async exec () {
    let promises = []
    let wallets = []

    if (this.tickers.length === 0) {
      this.tickers.push(this.supportedCurrencies[this.defaultTicker].ticker)
    }

    this._addresses.forEach(address => {
      const wallet = {}
      if (this.elementsToFetch.includes('balances')) {
        promises.push(this._getBalances(address, wallet))
      }

      if (this.elementsToFetch.includes('transactions')) {
        promises.push(this._getTransactions(address, wallet))
      }

      wallets.push(wallet)
    })

    await Promise.all(promises)

    // Reset
    this.tickers = []
    this._addresses = []

    return wallets
  }

  static async _fetchJson (url) {
    // TODO : require('node-fetch')
    return fetch(url).then((response) => response.json())
  }
}

module.exports = AbstractExplorer

/*
// config
  {
    explorer: 'BitcoinBlockExplorer',

    // Specific
    explorerParams: {node: 'https://iota.thathost.net', apiKey: '16546548'}, // Returned by explorer a.getParams()

    // Mandatory
    walletIdentifier : {address: '13213213212313213'},

    // optional
    currencies: ['BTC']
  }

// Example
  explorer = TrucExplorer(parameters);
  explorer
    .wallets([{address: '0x010101'}, {address: '0x001010'}])
    .currencies(['ETH', 'NEO', 'GAS'])
    .transactionsLimit([5, 5, 5])
    .transactionsStartDate([5, 5, 5])
    .units(['miota', 'satoshi', 'lol'])
    .fetch(['balances', 'transactions', 'sandwich'])
    .exec()

  // out
  {
     [{
      balances : [
      {name: 'bitcoin', balance: 9}, {name: 'lol', balance: 9}
    ],
    transactions : [
      [new Transaction(), new Transaction()],
      [new Transaction(), new Transaction()]
    ]
  },
  ]
}

*/
