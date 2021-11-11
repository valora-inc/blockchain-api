import { Knex } from 'knex'
import { logger } from '../logger'

import { createNewManager, configs } from '@valora/exchanges'

export async function updatePrices(db: Knex) {
  logger.debug('Updating prices')

  if (!process.env.EXCHANGES_ENV) {
    logger.error('EXCHANGES_ENV is missing, skipping prices update')
    return
  }

  const config = configs[process.env.EXCHANGES_ENV]

  if (!config) {
    logger.error(`Couldn't obtain exchanges config, skipping prices update`)
    return
  }

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
