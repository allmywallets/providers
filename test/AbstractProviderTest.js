const test = require('ava')
const providers = require('../')
const testAddresses = require('./fixtures.json').addresses
const testParameters = require('./fixtures.json').parameters
const NotSupportedCurrencyError = require('../src/errors/NotSupportedCurrencyError')
const OnlyEmptyBalancesFound = require('../src/errors/OnlyEmptyBalancesFound')

const providersName = providers.list()
let Providers = []
for (let i = 0; i < providersName.length; i++) {
  const Provider = providers.providers[providersName[i]]
  Providers[i] = Provider
}

for (let i = 0; i < Providers.length; i++) {
  const Provider = Providers[i]
  const providerName = providersName[i]
  if (Provider.isExchange && providerName !== 'exchange.poloniex') continue // Not necessary to test for all ccxt exchange

  let address = testAddresses[providerName]
  let parameters = testParameters[providerName]
  if (!address) {
    address = require('./fixturesExchanges.json').addresses[providerName]
  }

  test(`[${providerName}] attributes`, async t => {
    const explorer = new Provider(parameters)
    t.not(explorer.constructor.getDefaultTicker(), undefined)
    t.not(explorer.supportedCurrencies, undefined)

    t.not(Provider.info, undefined)
    t.not(Provider.info.name, undefined)
    t.not(Provider.info.url, undefined)
    t.not(Provider.info.network, undefined)
    t.not(Provider.info.provider, undefined)
    t.not(Provider.info.description, undefined)
    t.not(Provider.info.hasCORS, undefined)
  })

  if (Provider.isExchange) {
    test(`[${providerName}] Throws empty balances`, async t => {
      const explorer = new Provider(parameters)
      await t.throws(
        explorer
          .address(address)
          .fetch(['balances'])
          .exec(), OnlyEmptyBalancesFound)
    })
  }
  test(`[${providerName}] fetch only balances`, async t => {
    const explorer = new Provider(parameters)
    if (Provider.isExchange) { explorer.currency('BTC') }
    const res = await explorer
        .address(address)
        .fetch(['balances'])
        .exec()

    t.not(res, undefined)

    const firstCurrency = res[0]

    t.not(firstCurrency, undefined)
    t.is(firstCurrency.transactions, undefined, 'We fetch only balances')

    const balances = firstCurrency.balances
    t.not(balances, undefined)
    t.is(balances.length, 1)
    t.is(typeof balances[0], 'number')

    t.is(explorer.getSelectedCurrencies() instanceof Array, true)
    t.is(explorer.getSelectedCurrencies().length, 1)
    t.not(explorer.getSelectedCurrencies()[0].ticker, undefined)
    t.not(explorer.getSelectedCurrencies()[0].name, undefined)
  })

  test(`[${providerName}] fetch only transactions`, async t => {
    const explorer = new Provider(parameters)
    if (Provider.isExchange) { explorer.currency('BTC') }
    const res = await explorer
        .address(address)
        .fetch(['transactions'])
        .exec()

    t.not(res, undefined)

    const firstCurrency = res[0]

    t.not(firstCurrency, undefined)
    t.is(firstCurrency.balances, undefined, 'We fetch only transactions')
    t.is(firstCurrency.transactions.length, 1)

    const transactions = firstCurrency.transactions[0]
    t.not(transactions, undefined)
    transactions.forEach(tx => {
      t.not(tx.timeStamp, undefined)
      t.not(tx.id, undefined)
      t.not(tx.from, undefined)
      t.not(tx.to, undefined)
      t.not(tx.amount, undefined)
      t.not(tx.type, undefined)
      t.is(tx.type === 'in' || tx.type === 'out', true)
    })
  })

  test(`[${providerName}] Not supported currency`, async t => {
    const explorer = new Provider(parameters)

    const fakeTickerName = 'NOT SUPPORTED TICKER'
    let error
    if (Provider.dynamicSupportedCurrencies) {
      error = await t.throws(explorer
          .currency(fakeTickerName)
          .address(address)
          .fetch(['balances'])
          .exec(), NotSupportedCurrencyError)
    } else {
      error = await t.throws(() => explorer.currency(fakeTickerName), NotSupportedCurrencyError)
    }
    t.is(error.message, `${fakeTickerName} is not supported`)
  })

  test(`[${providerName}] Supported currencies`, async t => {
    const supportedCurrencies = await Provider.getSupportedCurrencies()
    t.not(supportedCurrencies, undefined)
    for (const currency in supportedCurrencies) {
      t.not(supportedCurrencies[currency], undefined)
      t.not(supportedCurrencies[currency].name, undefined)
      t.not(supportedCurrencies[currency].ticker, undefined)
    }
  })

  test(`[${providerName}] fetch only balances and addresses`, async t => {
    const explorer = new Provider(parameters)
    if (Provider.isExchange) { explorer.currency('BTC') }
    const res = await explorer
        .address(address)
        .fetch(['balances', 'addresses'])
        .exec()

    t.not(res, undefined)

    const firstCurrency = res[0]

    t.not(firstCurrency, undefined)
    t.is(firstCurrency.transactions, undefined, 'We fetch only balances')

    const balances = firstCurrency.balances
    t.not(balances, undefined)
    t.is(balances.length, 1)
    t.is(typeof balances[0], 'number')

    t.is(explorer.getSelectedCurrencies() instanceof Array, true)
    t.is(explorer.getSelectedCurrencies().length, 1)
    t.not(explorer.getSelectedCurrencies()[0].ticker, undefined)
    t.not(explorer.getSelectedCurrencies()[0].name, undefined)

    const addresses = firstCurrency.addresses
    t.not(addresses, undefined)
    t.is(addresses.length, 1)
    t.is(typeof addresses[0], 'string')
  })
}
