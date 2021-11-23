import { Knex } from 'knex'
import { logger } from '../logger'

import {
  ExchangeRateManager,
  Config as ExchangeRateConfig,
} from '@valora/exchanges'

export async function updatePrices({
  db,
  exchangeRateManager,
  exchangeRateConfig,
}: {
  db: Knex
  exchangeRateManager: ExchangeRateManager
  exchangeRateConfig: ExchangeRateConfig
}) {
  logger.debug('Updating prices')

  const fetchTime = new Date(Date.now())
  const prices = await exchangeRateManager.calculatecUSDPrices()
  const cUSDAddress = exchangeRateConfig.tokenAddresses.cUSD

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
