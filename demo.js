const Provider = require('./index').providers['ethereum.etherscan']
const provider = new Provider();

(async function () {
  const res = await provider
      .address('0x2f5218c475f152152ac9787db76b9eea7e59c3d8')
      .fetch(['transactions', 'balances'])
      .exec()

  console.log(res[0].balances)
}()).catch(console.log)
