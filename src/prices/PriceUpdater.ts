import { Knex } from 'knex'
import { logger } from '../logger'

import { createNewManager, getConfigForEnv } from '@valora/exchanges'

export async function updatePrices(db: Knex) {
  logger.debug('Updating prices')

  const config = getConfigForEnv(process.env.EXCHANGES_ENV ?? 'test')
  const manager = createNewManager(config)
  const cUSDAddress = config.tokenAddresses.cUSD

  const fetchTime = new Date(Date.now())
  const prices = await manager.calculatecUSDPrices()

  const batchInsertItems = Object.entries(prices).map(([token, price]) => ({
    token,
    base_token: cUSDAddress,
    price: price.toString(),
    at: fetchTime.toISOString(),
  }))

  db('historical_token_prices')
    .insert(batchInsertItems)
    .catch((e) => {
      logger.error(`Prices couldn't be stored in DB: ${(e as Error)?.message}`)
    })
}
