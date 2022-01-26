import BigNumber from 'bignumber.js'
import { Knex } from 'knex'
import { HistoricalPriceRow } from '../database/types'
import ExchangeRateAPI from '../currencyConversion/ExchangeRateAPI'
import { logger } from '../logger'
import { DataSource, DataSourceConfig } from 'apollo-datasource'
import { USD } from '../currencyConversion/consts'

const TABLE_NAME = 'historical_token_prices'
const MAX_TIME_GAP = 1000 * 60 * 60 * 4 // 4 hours

// Note: I need this class to extend a DataSource in order to be able to add it as a datasource in apollo.
export default class PricesService<TContext = any> extends DataSource {
  constructor(
    private readonly db: Knex,
    private readonly exchangeRateAPI: ExchangeRateAPI,
    private readonly cUSDAddress: string,
  ) {
    super()
  }

  initialize(config: DataSourceConfig<TContext>): void {
    this.exchangeRateAPI.initialize(config)
  }

  /**
   * It returns an estimated price in given local currency of given token at given date.
   * To do it, it uses this route: token -> cUSD -> USD -> localCurrency.
   * It query the db to obtain the rate from token -> cUSD and then it uses ExchangeRateAPI to
   * obtain the rate USD -> localCurrency.
   * It assumes cUSD -> USD rate is 1. TODO: Use real rate
   *
   * @param tokenAddress token address - e.g. '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73'
   * @param localCurrency local currency code - e.g. 'USD'
   * @param date
   * @throws An error if the price can't be calculated
   */
  async getTokenToLocalCurrencyPrice(
    tokenAddress: string,
    localCurrency: string,
    date: Date,
  ): Promise<BigNumber> {
    const tokenAddressLowerCase = tokenAddress.toLowerCase()
    try {
      const cUSDPrice = await this.getcUSDPrice(tokenAddressLowerCase, date)
      const usdToLocalCurrencyPrice = await this.usdToLocalCurrency(
        localCurrency,
        date,
      )
      if (!usdToLocalCurrencyPrice) {
        throw new Error('Failed to calculate local currency price')
      }
      return cUSDPrice.times(usdToLocalCurrencyPrice)
    } catch (e) {
      logger.error({
        type: 'ERROR_CALCULATE_LOCAL_CURRENCY_PRICE',
        tokenAddress,
        localCurrency,
        date,
        error: (e as Error)?.message,
      })
      throw e
    }
  }

  private async getcUSDPrice(
    tokenAddress: string,
    date: Date,
  ): Promise<BigNumber> {
    if (tokenAddress === this.cUSDAddress) {
      return new BigNumber(1)
    }

    const isoDate = date.toISOString()
    const prevPriceRow = await this.db<HistoricalPriceRow>(TABLE_NAME)
      .where({
        token: tokenAddress,
        base_token: this.cUSDAddress,
      })
      .andWhere('at', '<=', isoDate)
      .orderBy('at', 'desc')
      .first()

    if (!prevPriceRow) {
      throw new Error(
        `Couldn't find entries in the db before ${date} for token: ${tokenAddress}`,
      )
    }

    const prevDate = new Date(prevPriceRow.at)
    if (date.getTime() - prevDate.getTime() > MAX_TIME_GAP) {
      throw new Error(
        `Couldn't calculate price for ${tokenAddress} at ${date}, the lastest price we have is at ${prevDate}`,
      )
    }

    return new BigNumber(prevPriceRow.price)
  }

  private async usdToLocalCurrency(
    localCurrency: string,
    date: Date,
  ): Promise<BigNumber> {
    if (localCurrency === USD) {
      return new BigNumber(1)
    }

    return await this.exchangeRateAPI.getExchangeRate({
      sourceCurrencyCode: USD,
      currencyCode: localCurrency,
      timestamp: date.getTime(),
    })
  }
}
