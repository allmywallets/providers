const AbstractExplorer = require('./AbstractProvider')

/**
 * IotaNative
 */
class IotaNative extends AbstractExplorer {
  constructor (parameters) {
    super()

    this.parameters = parameters || {}
    this.parameters.node = this.parameters.node || 'https://node.cbus.io:443'

    this.headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-IOTA-API-Version': '1'
    }
  }

  static get info () {
    return {
      name: 'IOTA',
      url: 'https://iota.org/',
      network: 'iota',
      provider: 'native',
      description: 'Iota native uses the official API to communicate with a node.',
      hasCORS: true
    }
  }

  getSupportedCurrencies () {
    return { IOTA: { name: 'Iota', ticker: 'IOTA' } }
  }

  static getDefaultTicker () {
    return 'IOTA'
  }

  async iotaApiRequest (body) {
    const res = await this._fetchJson(this.parameters.node, {
      method: 'POST',
      headers: this.headers,
      body
    })

    if (res.error) {
      switch (res.error) {
        case 'Invalid addresses input':
          console.log(JSON.parse(body).addresses)
          throw new Error(`Addresses starting with ${JSON.parse(body).addresses.map(add => `"${add.substring(0, 5)}"`)} are invalid or not attached to the Tangle`)
        default:
          throw new Error(body + ' ' + res.error)
      }
    }

    return res
  }

  async _getBalances (address) {
    const res = await this.iotaApiRequest(JSON.stringify({
      addresses: [address],
      command: 'getBalances',
      threshold: 100
    }))

    return [parseInt(res.balances[0])]
  }

  async _getTransactions (address) {
    await this.iotaApiRequest(JSON.stringify({
      addresses: [address],
      command: 'findTransactions',
      threshold: 100
    }))
    // TODO
    return [[]]
  }

  static getProviderParameters () {
    return [{
      type: 'select',
      label: 'Node',
      model: 'node',
      values: ['https://iota.thathost.net', 'https://iri3-api.iota.fm:443'],
      required: true
    }]
  }
}

module.exports = IotaNative
