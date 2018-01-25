const test = require('ava')
const providers = require('../')

const testAddresses = require('./fixtures.json').addresses

const providerName = 'ethereum.etherscan'
const Provider = providers.providers[providerName]

const address = testAddresses[providerName]

test(`[${providerName}] Custom tokens`, async t => {
  const customTokens = {'MKR': {contractAddress: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', ticker: 'MKR', name: 'Maker'}}
  let explorer = new Provider({customTokens})
  const res = await explorer
      .address(address)
      .currency('MKR')
      .fetch(['balances', 'transactions'])
      .exec()

  t.not(res, undefined)
  t.not(res[0], undefined)
  t.not(res[0].transactions, undefined)
  t.not(res[0].balances, undefined)
  t.not(res[0].balances[0] instanceof Number, true)
})

test(`[${providerName}] Get tokens`, async t => {
  let explorer = new Provider()
  const res = await explorer
      .address(address)
      .currency('BAT')
      .fetch(['balances', 'transactions'])
      .exec()

  t.not(res, undefined)
  t.not(res[0], undefined)
  t.not(res[0].transactions, undefined)
  t.not(res[0].balances, undefined)
  t.not(res[0].balances[0] instanceof Number, true)
})
