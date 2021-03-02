const data = {
  'addresses': {
    'bitcoin.mockexplorer': 'address',
    'bitcoin.blockexplorer': '15jdxjFhXUsp2xuycmKnjw8yk1WsVon69c',
    'ethereum.etherscan': '0xB13CE87F4f0519B54f768847Bda0389cEF0d479B',
    'iota.native': 'VXVFLFCTLG9BHZEJHDUMIATTZGQSXUAPRHYMOALPKGICJPTMEJXWT9KHBKYFTLPQABOSGZUCUUZDWXPRZ',
    'api.cryptoid': '15jdxjFhXUsp2xuycmKnjw8yk1WsVon69c',
    'exchange.yobit': { 'apiKey': process.env.YOBIT_API_KEY, 'secret': process.env.YOBIT_SECRET }
  },

  'parameters': {
    'api.cryptoid': { 'apiKey': process.env.CRYPTOID_API_KEY },
    'ethereum.etherscan': { 'apiKey': process.env.ETHERSCAN_API_KEY }
  }
}

module.exports = data
