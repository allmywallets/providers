# Providers
Library to retrieve balances and transactions from a variety of cryptocurrencies explorers and exchanges

[![npm (scoped)](https://img.shields.io/npm/v/@allmywallets/providers.svg)](https://www.npmjs.com/package/@allmywallets/providers)


## Installation
```
npm install @allmywallets/providers
```

## Usage
``` js
const Explorer = require('@allmywallets/providers').explorer('ethereum.etherscan')
const explorer = new Explorer()

(async function () {
  const res = await explorer
      .address('0xb794f5ea0ba39494ce839613fffba74279579268')
      .fetch(['transactions', 'balances'])
      .exec()

  console.log(res[0].balances)
}()).catch(console.log)

```
