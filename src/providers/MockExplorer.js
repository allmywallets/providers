const AbstractExplorer = require('./AbstractProvider')

class MockExplorer extends AbstractExplorer {

  static get info() {
    return {
      name: 'Mock Explorer',
      url: 'https://mockexplorer.org/',
      network: 'bitcoin',
      provider: 'mockexplorer',
      description: 'Mock Explorer',
      hasCORS: true
    }
  }

  getSupportedCurrencies () {
    return {MOC: {name: 'MockCoin', ticker: 'MOC'}}
  }

  static getDefaultTicker () {
    return 'MOC'
  }

  async _getBalances (address) {
    return [42]
  }

  async _getTransactions (address) {
    return [[
      {timeStamp: '1513683799', id: '', from: 'fromAddress', to: 'toAddress', amount: 1, type: 'in'},
      {timeStamp: '1513253473', id: '', from: 'fromAddress', to: 'toAddress', amount: 1, type: 'out'}
    ]]
  }
}

module.exports = MockExplorer
