const Explorer = require('./index').explorer('ethereum.etherscan')
const explorer = new Explorer();

(async function () {
  const res = await explorer
      .address('0xb794f5ea0ba39494ce839613fffba74279579268')
      .fetch(['transactions', 'balances'])
      .exec()

  console.log(res[0].balances)
  console.log(res[0].transactions)
}()).catch(console.log)
