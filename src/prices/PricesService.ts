import BigNumber from 'bignumber.js'
import { Knex } from 'knex'
import ExchangeRateAPI from '../currencyConversion/ExchangeRateAPI'
import { configs } from '@valora/exchanges'
import { logger } from '../logger'

const TABLE_NAME = 'historical_token_prices'

export default class PricesService {
  db: Knex
  exchangeAPI: ExchangeRateAPI
  cUSDAddress: string

  constructor(db: Knex, exchangeAPI: ExchangeRateAPI) {
    this.db = db
    this.exchangeAPI = exchangeAPI
    this.cUSDAddress = getcUSDFromConfig()
  }

  /**
   * It returns an estimated price in given local currency of given token at given date.
   * To do it, it uses this route: token -> cUSD -> localCurrency
   *
   * @param token token address - e.g. '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73'
   * @param localCurrency local currency code - e.g. 'USD'
   * @param date
   * @throws An error if the price can't be calculated
   */
  async getTokenToLocalCurrencyPrice(
    token: string,
    localCurrency: string,
    date: Date,
  ): Promise<BigNumber> {
    try {
      const cUSDPrice = await this.getcUSDPrice(token, date)
      const cUSDToLocalCurrencyPrice = await this.cUSDToLocalCurrency(
        localCurrency,
        date,
      )
      return cUSDPrice.times(cUSDToLocalCurrencyPrice)
    } catch (e) {
      logger.error({
        type: 'ERROR_CALCULATE_LOCAL_CURRENCY_PRICE',
        token,
        localCurrency,
        date,
        error: (e as Error)?.message,
      })
      throw e
    }
  }

  private async getcUSDPrice(token: string, date: Date): Promise<BigNumber> {
    const isoDate = date.toISOString()
    const prevPriceRow = await this.db(TABLE_NAME)
      .first()
      .where({
        token: token,
        base_token: this.cUSDAddress,
      })
      .andWhere('at', '<=', isoDate)
      .orderBy('at', 'desc')

    const nextPriceRow = await this.db(TABLE_NAME)
      .first()
      .where({
        token: token,
        base_token: this.cUSDAddress,
      })
      .andWhere('at', '>=', isoDate)
      .orderBy('at', 'asc')

    // Should we check if prev_price.at and next_price.at are relative close?
    // Let's say less than 4 hours. And if not failing instead of returning the estimated price?
    if (!prevPriceRow || !nextPriceRow) {
      throw new Error(
        `Couldn't find entries in the db to calculate cUSD prices for ${token} at ${date}`,
      )
    }

    return this.estimatePrice(prevPriceRow, nextPriceRow, date)
  }

  // It returns a linnear estimation of the price using previous and next known prices.
  private estimatePrice(prevPriceRow: any, nextPriceRow: any, date: Date) {
    const queryTimestamp = date.getTime()
    const prevTimestamp = new Date(prevPriceRow.at).getTime()
    const prevPrice = new BigNumber(prevPriceRow.price)
    const nextTimestamp = new Date(nextPriceRow.at).getTime()
    const nextPrice = new BigNumber(nextPriceRow.price)

    if (nextTimestamp === prevTimestamp) {
      return prevPrice
    }

    // Linnear estimation
    return prevPrice
      .times(nextTimestamp - queryTimestamp)
      .plus(nextPrice.times(queryTimestamp - prevTimestamp))
      .dividedBy(nextTimestamp - prevTimestamp)
  }

  private async cUSDToLocalCurrency(
    localCurrency: string,
    date: Date,
  ): Promise<BigNumber> {
    return await this.exchangeAPI.getExchangeRate({
      sourceCurrencyCode: this.cUSDAddress,
      currencyCode: localCurrency,
      timestamp: date.getTime(),
    })
  }
}

function getcUSDFromConfig(): string {
  if (!process.env.EXCHANGES_ENV) {
    throw new Error(`EXCHANGES_ENV is missing, can't create PriceService`)
  }

  const config = configs[process.env.EXCHANGES_ENV]

  if (!config) {
    throw new Error(
      `Couldn't obtain exchanges config, can't create PriceService`,
    )
  }

  return config.tokenAddresses.cUSD
}
