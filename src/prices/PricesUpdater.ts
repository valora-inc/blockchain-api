import { Knex } from 'knex'
import { logger } from '../logger'

import { ExchangeRateManager, PriceByAddress } from '@valora/exchanges'
import { updateFirebase } from '../firebase'
import tokenInfoCache, { TokenInfo } from '../helpers/TokenInfoCache'
import PricesService from './PricesService'
import asyncPool from 'tiny-async-pool'

const FIREBASE_NODE_KEY = '/tokensInfo'
const MAX_CONCURRENCY = 30
export const ONE_DAY_IN_MS = 1000 * 60 * 60 * 24

function addPeggedPrices(prices: PriceByAddress) {
  const returnedPrices = { ...prices }
  tokenInfoCache.getTokensInfo().forEach((token: TokenInfo) => {
    if (token.pegTo && prices[token.pegTo]) {
      returnedPrices[token.address] = prices[token.pegTo]
    }
  })

  return returnedPrices
}

export async function updateCurrentPrices({
  exchangeRateManager,
}: {
  exchangeRateManager: ExchangeRateManager
}) {
  logger.info('Updating current prices in firebase')

  const fetchTime = Date.now()
  const prices = addPeggedPrices(
    await exchangeRateManager.calculatecUSDPrices(),
  )

  const tokenAddresses = tokenInfoCache.getTokensAddresses()

  const updateObject = tokenAddresses.reduce(
    (result: any, tokenAddress: string) => {
      const price = prices[tokenAddress.toLowerCase()]

      if (price) {
        result[`${tokenAddress}/usdPrice`] = price.toString()
        result[`${tokenAddress}/priceFetchedAt`] = fetchTime
      }

      return result
    },
    {},
  )

  await updateFirebase(FIREBASE_NODE_KEY, updateObject)
  logger.info('Updated current prices in firebase')
}

export async function updateHistoricalPrices({
  pricesService,
}: {
  pricesService: PricesService
}) {
  logger.info('Updating historical prices in firebase')
  const tokenAddresses = tokenInfoCache.getTokensAddresses()

  await updateLastDayPrices(pricesService, tokenAddresses)
  logger.info('Updated historical prices in firebase')
}

async function updateLastDayPrices(
  pricesService: PricesService,
  tokenAddresses: string[],
) {
  const lastDay = new Date(Date.now() - 1 * ONE_DAY_IN_MS)
  await asyncPool(
    MAX_CONCURRENCY,
    tokenAddresses,
    async (tokenAddress: string) => {
      try {
        const lastDayPrice = await pricesService.getTokenTocUSDPrice(
          tokenAddress,
          lastDay,
        )
        await updateFirebase(
          `${FIREBASE_NODE_KEY}/${tokenAddress}/historicalUsdPrices/lastDay`,
          {
            price: lastDayPrice.toString(),
            at: lastDay.getTime(),
          },
        )
      } catch (error) {
        logger.warn({
          type: 'ERROR_UPDATING_LAST_DAY_PRICE',
          tokenAddress,
          error,
        })
      }
    },
  )
}

export async function storeHistoricalPrices({
  db,
  exchangeRateManager,
}: {
  db: Knex
  exchangeRateManager: ExchangeRateManager
}) {
  logger.info('Storing historical prices')

  const fetchTime = new Date(Date.now())
  const prices = addPeggedPrices(
    await exchangeRateManager.calculatecUSDPrices(),
  )
  const cUSDAddress = exchangeRateManager.cUSDTokenAddress

  const batchInsertItems = Object.entries(prices)
    .filter(([token, _]) => token !== cUSDAddress)
    .map(([token, price]) => ({
      token,
      base_token: cUSDAddress,
      price: price.toString(),
      at: fetchTime.toISOString(),
      fetched_from: 'Exchange library',
    }))

  await db('historical_token_prices')
    .insert(batchInsertItems)
    .catch((error) => {
      logger.error({
        type: 'ERROR_INSERTING_TOKEN_PRICES',
        error,
      })
    })

  logger.info('Stored historical prices')
}
