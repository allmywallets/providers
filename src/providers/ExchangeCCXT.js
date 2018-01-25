const ccxt = require('ccxt')
const cryptocurrencies = require('cryptocurrencies');

const AbstractExchangeExplorer = require('./AbstractExchangeProvider')
const NotSupportedCurrencyError = require('../errors/NotSupportedCurrencyError')


const ExchangeFactory = {
  getAvailableExchanges: () => {
    return ccxt.exchanges
  },

  getExchange: (exchangeName) => {

    const exchange = new ccxt[exchangeName]()
    if (!exchange.hasCORS) {
      exchange.proxy = 'https://cors-anywhere.herokuapp.com/'
    }

    /**
     * CCXT library exchange
     */
    class ExchangeCCXT extends AbstractExchangeExplorer {
      constructor (parameters) {
        super(parameters)
      }

      static get info() {
        return {
          name: exchange.name,
          url: exchange.urls.www,
          network: 'exchange',
          provider: exchangeName
        }
      }

      static _setExchangeCredentials (walletIdentifier) {
        Object.keys(walletIdentifier).forEach(key => {
          exchange[key] = walletIdentifier[key]
        })
      }

      static async getSupportedCurrencies () {
        const currenciesRes = await exchange.fetchMarkets()
        const currencies = {}
        currenciesRes.forEach(market => {
          currencies[market.base] = {name: cryptocurrencies[market.base] || market.base, ticker: market.base}
        })

        return currencies
      }

      async _checkApiKeyPermission (walletIdentifier) {
        // TODO
        ExchangeCCXT._setExchangeCredentials(walletIdentifier)
        console.log(await exchange.cancelOrder('1234567890'))
        return true
      }

      async _getAllNonZeroBalances (walletIdentifier) {
        ExchangeCCXT._setExchangeCredentials(walletIdentifier)
        const balancesRes = await exchange.fetchBalance()
        const balances = []
        const nonZeroBalanceTickers = []
        Object.keys(balancesRes.total).forEach(ticker => {
          const amount = balancesRes.total[ticker]
          if (amount === 0) return
          nonZeroBalanceTickers.push(ticker)
          balances.push(amount)
        })

        return {balances, nonZeroBalanceTickers}
      }

      async _getBalances (walletIdentifier) {
        ExchangeCCXT._setExchangeCredentials(walletIdentifier)
        const balancesRes = await exchange.fetchBalance()
        const balances = []
        this.tickers.forEach(ticker => {
          const amount = balancesRes.total[ticker]
          if (typeof amount === 'undefined') {
            throw new NotSupportedCurrencyError(`${ticker} is not supported`)
          }
          balances.push(amount)
        })

        return balances
      }

      _parseTransactions (transactionsRes) {
        return transactionsRes.map(tx => {
          delete tx.info
          tx.type = tx.side
          delete tx.side
          return tx
        })
      }

      async _fetchTransactions (walletIdentifier, tickers) {
        ExchangeCCXT._setExchangeCredentials(walletIdentifier)
        await exchange.loadMarkets()

        const transactions = []
        for (let i = 0; i < tickers.length; i++) {
          transactions[i] = []
        }

        const promises = []

        exchange.symbols.forEach(symbol => {
          const split = symbol.split('/')
          const ticker1 = split[0]
          const ticker2 = split[1]

          if (tickers.includes(ticker1) && tickers.includes(ticker2)) {
            promises.push((async () => {
              let marketTransactionsRes = await exchange.fetchMyTrades(symbol)
              let marketTransactions = this._parseTransactions(marketTransactionsRes)

              const index1 = tickers.indexOf(ticker1)
              transactions[index1] = transactions[index1].concat(marketTransactions)

              const index2 = tickers.indexOf(ticker2)
              transactions[index2] = transactions[index2].concat(marketTransactions)
            })())
          }
        })

        await Promise.all(promises)

        return transactions
      }

      async _fetchAddresses (walletIdentifier, nonZeroBalanceTickers) {
        ExchangeCCXT._setExchangeCredentials(walletIdentifier)
        const promises = []
        nonZeroBalanceTickers.forEach(ticker => {
          promises.push(exchange.fetchDepositAddress(ticker))
        })

        const depositAddressesRes = await Promise.all(promises)

        return depositAddressesRes.map(res => res.address || res.currency)
      }

      static getWalletIdentifierParameters () {
        const parameters = []

        Object.keys(exchange.requiredCredentials).forEach(credential => {
          const isRequired = exchange.requiredCredentials[credential]
          if (isRequired) {
            parameters.push(
              {
                type: 'input',
                inputType: 'text',
                label: `${exchangeName} ${credential}`,
                model: `wallets.${credential}`,
                autocomplete: 'off',
                required: true
              }
            )
          }
        })

        return parameters
      }
    }
    return ExchangeCCXT
  }
}

module.exports = ExchangeFactory
