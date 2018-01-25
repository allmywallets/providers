# Providers
Library to retrieve balances and transactions from a variety of cryptocurrencies explorers and exchanges

[![npm (scoped)](https://img.shields.io/npm/v/@allmywallets/providers.svg)](https://www.npmjs.com/package/@allmywallets/providers)


## Installation
```
npm install @allmywallets/providers
```

## Usage
``` js
const Provider = require('@allmywallets/providers').providers['ethereum.etherscan']
const provider = new Provider();

(async function () {
  const res = await provider
      .address('0x2f5218c475f152152ac9787db76b9eea7e59c3d8')
      .fetch(['transactions', 'balances'])
      .exec()

  console.log(res[0].balances)
}()).catch(console.log)
```
