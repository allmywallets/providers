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
const provider = new Provider({ apiKey: process.env.ETHERSCAN_API_KEY });

(async function () {
  const res = await provider
    .address('0x2f5218c475f152152ac9787db76b9eea7e59c3d8')
    .fetch(['transactions', 'balances'])
    .exec()

  console.log(res[0].balances)
}()).catch(console.log)
```

You can run the code above
```
node demo.js
```

## Run the tests
Make sure to set up your env vars
- `YOBIT_API_KEY`
- `YOBIT_SECRET`
- `CRYPTOID_API_KEY`
- `ETHERSCAN_API_KEY`
```
npm test
```
