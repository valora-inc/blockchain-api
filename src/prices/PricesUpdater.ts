import { Knex } from 'knex'
import { logger } from '../logger'

import { ExchangeRateManager } from '@valora/exchanges'

export async function updatePrices({
  db,
  exchangeRateManager,
}: {
  db: Knex
  exchangeRateManager: ExchangeRateManager
}) {
  logger.debug('Updating prices')

  const fetchTime = new Date(Date.now())
  const prices = await exchangeRateManager.calculatecUSDPrices()
  const cUSDAddress = exchangeRateManager.cUSDTokenAddress

  const batchInsertItems = Object.entries(prices).map(([token, price]) => ({
    token,
    base_token: cUSDAddress,
    price: price.toString(),
    at: fetchTime.toISOString(),
    fetched_from: 'Exchange library',
  }))

  db('historical_token_prices')
    .insert(batchInsertItems)
    .catch((error) => {
      logger.error({
        type: 'ERROR_INSERTING_TOKEN_PRICES',
        error,
      })
    })
}
