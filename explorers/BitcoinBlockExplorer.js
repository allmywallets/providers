const AbstractExplorer = require('./AbstractExplorer')

if (typeof window === 'undefined') {
  fetch = require('node-fetch')
}

const API_URL = 'https://blockexplorer.com/api'

class BitcoinBlockExplorer extends AbstractExplorer {
  constructor (proxy) {
    super()
  }

  async getBalance (address) {
    return fetch(`${API_URL}/addr/${address}/balance`).then((response) => response.json())
  }

  async getTransactions (address) {
    const res = await fetch(`${API_URL}/txs/?address=${address}`).then((response) => response.json())
    const transactions = res.txs

    transactions.forEach(tx => {
      tx.timeStamp = tx.time
      delete tx.time

      tx.id = tx.txid
      delete tx.txid

      tx.vin.forEach(vin => {
        if (vin.addr === address) {
          tx.from = address
          tx.to = '?'
          tx.amount = vin.value
          return false
        }
      })

      tx.vout.forEach(vout => {
        if (vout.scriptPubKey.addresses[0] === address) {
          tx.from = '?'
          tx.to = address
          tx.amount = vout.value
          return false
        }
      })
    })

    return transactions
  }
}

module.exports = BitcoinBlockExplorer