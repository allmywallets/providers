const ExchangeCCXTFactory = require('./src/providers/ExchangeCCXT')

module.exports = {
  explorer: function (explorerName) {
    switch (explorerName) {
      case 'binance.binance':
        return require('./src/providers/ExchangeBinance')
      case 'bitcoin.blockexplorer':
        return require('./src/providers/BitcoinBlockExplorer')
      case 'cryptoid.cryptoid':
        return require('./src/providers/CryptoID')
      case 'ethereum.etherscan':
        return require('./src/providers/EthereumEtherscan')
      case 'iota.native':
        return require('./src/providers/IotaNative')
      case 'poloniex.poloniex':
        return require('./src/providers/ExchangePoloniex')
      case 'bitcoin.mockexplorer':
        return require('./src/providers/MockExplorer')
      default:
        const split = explorerName.split('.')
        if (split && split.length === 2 && split[0] === 'exchange') {
          const exchangeName = split[1]
          return ExchangeCCXTFactory.getExchange(exchangeName)
        }

        throw new Error(explorerName + ' explorer does not exist')
    }
  },
  list: function () {
    const providers = ['binance.binance', 'bitcoin.blockexplorer', 'cryptoid.cryptoid', 'ethereum.etherscan', 'iota.native', 'poloniex.poloniex', 'bitcoin.mockexplorer']
    return providers.concat(ExchangeCCXTFactory.getAvailableExchanges().map(exchangeName => 'exchange.' + exchangeName))
  }
}
