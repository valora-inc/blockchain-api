import { ExchangeRateManager } from '@valora/exchanges'
import express, { Router } from 'express'
import { Knex } from 'knex'
import { logger } from './logger'
import PricesService from './prices/PricesService'
import {
  storeHistoricalPrices,
  updateCurrentPrices,
  updateHistoricalPrices,
} from './prices/PricesUpdater'

function addEndpoint(
  router: Router,
  path: string,
  errorType: string,
  asyncFn: () => Promise<void>,
) {
  router.get(path, async (req, res) => {
    // App Engine sets this header if and only if the request is from a cron.
    if (!req.headers['x-appengine-cron']) {
      logger.warn('Request does not contain header x-appengine-cron')
      res.status(401).send()
      return
    }

    try {
      await asyncFn()
      res.status(204).send()
    } catch (error) {
      logger.error({
        type: errorType,
        error,
      })
      res.status(500).send()
    }
  })
}

export function cronRouter({
  db,
  pricesService,
  exchangeRateManager,
}: {
  db: Knex
  pricesService: PricesService
  exchangeRateManager: ExchangeRateManager
}): Router {
  const router: Router = express.Router()

  addEndpoint(
    router,
    '/update-current-prices',
    'ERROR_UPDATING_CURRENT_PRICES',
    async () => {
      await updateCurrentPrices({ exchangeRateManager })
    },
  )

  addEndpoint(
    router,
    '/update-historical-prices',
    'ERROR_UPDATING_HISTORICAL_PRICES',
    async () => {
      await updateHistoricalPrices({ pricesService })
    },
  )

  addEndpoint(
    router,
    '/store-prices',
    'ERROR_UPDATING_HISTORICAL_PRICES',
    async () => {
      await storeHistoricalPrices({ db, exchangeRateManager })
    },
  )

  return router
}
