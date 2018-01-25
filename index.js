const ExchangeCCXTFactory = require('./src/providers/ExchangeCCXT')


const providers = {}
const classes = [
  require('./src/providers/BitcoinBlockExplorer'),
  require('./src/providers/CryptoID'),
  require('./src/providers/EthereumEtherscan'),
  require('./src/providers/IotaNative'),
  require('./src/providers/MockExplorer'),
]

classes.forEach(Provider => {
  providers[Provider.info.network + '.' + Provider.info.provider] = Provider
})

ExchangeCCXTFactory.getAvailableExchanges().forEach(exchangeName => {
  const Exchange = ExchangeCCXTFactory.getExchange(exchangeName)
  providers[Exchange.info.network + '.' + Exchange.info.provider] = Exchange
})

module.exports = {
  providers,
  list: function () {
    return Object.keys(providers)
  }
}
