import { RESTDataSource } from 'apollo-datasource-rest'
import BigNumber from 'bignumber.js'
import { logger } from '../logger'
import { EXCHANGE_RATES_API } from '../config'
import { metrics } from '../metrics'
import { CurrencyConversionArgs } from '../resolvers'
import { formatDateString } from '../utils'
import { USD } from './consts'
const { performance } = require('perf_hooks')
interface ExchangeRateApiResult {
  success: boolean
  quotes: { [currencyCode: string]: number }
  base: string
  date: string
}

// ttl in seconds!
const MIN_TTL = 12 * 3600 // 12 hours

export default class ExchangeRateAPI extends RESTDataSource {
  exchangeRatesAPIAccessKey: string

  constructor({
    exchangeRatesAPIAccessKey,
  }: {
    exchangeRatesAPIAccessKey: string
  }) {
    super()
    this.exchangeRatesAPIAccessKey = exchangeRatesAPIAccessKey
    this.baseURL = EXCHANGE_RATES_API
  }

  async getExchangeRate({
    sourceCurrencyCode,
    currencyCode,
    timestamp,
  }: CurrencyConversionArgs): Promise<BigNumber> {
    if (!currencyCode) {
      throw new Error('No currency code specified')
    }

    try {
      const date = timestamp ? new Date(timestamp) : new Date()
      const fetchedRate = await this.queryExchangeRate(
        sourceCurrencyCode || USD,
        currencyCode,
        date,
      )

      return new BigNumber(fetchedRate)
    } catch (error) {
      logger.error(error, {
        type: 'ERROR_FETCHING_EXCHANGE_RATE',
        sourceCurrencyCode,
        currencyCode,
        timestamp,
      })
      throw error
    }
  }

  private async queryExchangeRate(
    sourceCurrencyCode: string,
    currencyCode: string,
    date: Date,
  ) {
    // Record time at beginning of execution
    const t0 = performance.now()
    const pair = `${sourceCurrencyCode}/${currencyCode}`
    const path = `/historical`
    const params = {
      access_key: this.exchangeRatesAPIAccessKey,
      date: formatDateString(date),
      source: sourceCurrencyCode,
    }
    const result = await this.get<ExchangeRateApiResult>(path, params, {
      cacheOptions: { ttl: this.getCacheTtl(date) },
    })
    if (result.success !== true) {
      throw new Error(`Invalid response result: ${JSON.stringify(result)}`)
    }
    const rate = result.quotes[`${sourceCurrencyCode}${currencyCode}`]
    if (rate === undefined) {
      throw new Error(`No matching data for ${pair}`)
    }

    // Record time at end of execution
    const t1 = performance.now()
    metrics.setQueryExchangeRateDuration(t1 - t0)
    return rate
  }

  // Returns ttl (in seconds)
  private getCacheTtl(date: Date) {
    if (Date.now() - date.getTime() >= 24 * 3600 * 1000) {
      // Cache indefinitely if requesting a date prior to the last 24 hours
      return Number.MAX_SAFE_INTEGER
    } else {
      return MIN_TTL
    }
  }
}
