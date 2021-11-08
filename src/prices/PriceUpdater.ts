import { Knex } from 'knex'
import { logger } from '../logger'

import { createNewManager, getConfigForEnv } from '@valora/exchanges'

export async function updatePrices(db: Knex) {
  logger.debug('Updating prices')
  const config = getConfigForEnv(process.env.DEPLOY_ENV ?? 'local')
  const manager = createNewManager(config)
  const cUSDAddress = config.tokenAddresses.cUSD

  const fetchTime = new Date()
  const prices = await manager.calculatecUSDPrices()
  for (const [token, price] of Object.entries(prices)) {
    db('historical_token_prices')
      .insert({
        token: token,
        base_token: cUSDAddress,
        price: price.toString(),
        at: fetchTime,
      })
      .catch((e) => {
        logger.error(
          `Prices couldn't be stored in DB: ${(e as Error)?.message}`,
        )
      })
  }
}
