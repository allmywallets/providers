import Balance from '../model/Balance'
import Wallet from '../model/Wallet'
import AbstractProvider from './AbstractProvider'

export default class IOTAProvider extends AbstractProvider {
  constructor (parameters) {
    super()

    this.node = parameters.node
    this.name = parameters.name
    this.address = parameters.address
  }

  async getWalletData () {
    const headers = new Headers()
    headers.append('X-IOTA-API-Version', '1')

    return fetch(this.node, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        addresses: [this.address],
        command: 'getBalances',
        threshold: 3
      })
    })
      .then(response => response.json())
      .then((data) => {
        const balance = new Balance('Iota', 'miota', data.balances[0], [])

        return new Wallet(this.name, [balance], new Date())
      })
  }

  getParametersList () {
    return {
      address: {
        type: String
      }
    }
  }
}