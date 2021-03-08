const test = require('ava')
const NotSupportedPlatformError = require('../src/errors/NotSupportedPlatformError')
const providerName = 'bsc.defi'

const BSCDeFi = require('../').providers[providerName]

test(`[${providerName}] platforms`, async t => {
  const defi = new BSCDeFi()
  const platforms = BSCDeFi.availablePlatforms
  const platformPools = await defi
    .address('0xD9d3dd56936F90ea4c7677F554dfEFD45eF6Df0F')
    .platforms(platforms)
    .exec()
  t.is(platformPools.length, platforms.length)
  platformPools.forEach(pools => {
    pools.forEach(pool => {
      t.not(pool.poolID, undefined)
      t.not(pool.tokens, undefined)
      t.not(pool.lpTokenAmount, undefined)
      t.not(pool.totalDeposited, undefined)
      t.not(pool.pendingReward, undefined)
      t.not(pool.lpTransactions, undefined)

      pool.lpTransactions.forEach(tx => {
        t.not(tx.type, undefined)
        t.not(tx.hash, undefined)
        t.not(tx.amount, undefined)
        t.not(tx.timestamp, undefined)
      })
    })
  })
})

test(`[${providerName}] not supported platform`, async t => {
  const defi = new BSCDeFi()
  await t.throwsAsync(() => defi
    .address('0xD9d3dd56936F90ea4c7677F554dfEFD45eF6Df0F')
    .platforms(['notSupported'])
    .exec(), { instanceOf: NotSupportedPlatformError })
})

test(`[${providerName}] list available platforms`, async t => {
  t.not(BSCDeFi.availablePlatforms, undefined)
})
