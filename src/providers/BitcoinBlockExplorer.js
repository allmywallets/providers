const AbstractExplorer = require('./AbstractProvider')

const API_URL = 'https://blockexplorer.com/api'

/**
 * Bitcoin blockchain explorer for https://blockexplorer.com/
 */
class BitcoinBlockExplorer extends AbstractExplorer {
  static getSupportedCurrencies () {
    return {BTC: {name: 'Bitcoin', ticker: 'BTC'}}
  }

  static get info() {
    return {
      name: 'Block Explorer',
      url: 'https://blockexplorer.com/',
      network: 'bitcoin',
      provider: 'blockexplorer',
      description: 'Block Explorer is a Bitcoin blockchain explorer',
      hasCORS: true
    }
  }

  static getDefaultTicker () {
    return 'BTC'
  }

  async _getBalances (address) {
    let btcBalance = await this._fetchJson(`${API_URL}/addr/${address}/balance`).then(amount => amount / 1e8)
    return [btcBalance]
  }

  async _getTransactions (address) {
    const res = await this._fetchJson(`${API_URL}/txs/?address=${address}`)
    const transactions = res.txs

    transactions.forEach(tx => {
      tx.timeStamp = tx.time
      delete tx.time

      tx.id = tx.txid
      delete tx.txid

      tx.vin.forEach(vin => {
        if (vin.addr === address) {
          tx.type = 'out'
          tx.from = address
          tx.to = '?'
          tx.amount = vin.value
          return false
        }
      })

      tx.vout.forEach(vout => {
        if (vout.scriptPubKey.addresses[0] === address) {
          tx.type = 'in'
          tx.from = '?'
          tx.to = address
          tx.amount = vout.value
          return false
        }
      })
    })

    return [transactions]
  }
}

module.exports = BitcoinBlockExplorer
