import PricesService from '../../src/prices/PricesService'
import { initDatabase } from '../../src/database/db'
import { Knex } from 'knex'
import { USD } from '../../src/currencyConversion/consts'

const tableName = 'historical_token_prices'

const mockcUSDAddress = 'cUSD'
const mockDate = 1487076708000
const token = 'bitcoin'
const fakeToken = 'fake'
const localCurrency = 'EUR'
const HOURS = 1000 * 3600

const mockGetExchangeRate = jest.fn()

const mockExchangeAPI = {
  getExchangeRate: (args: any) => mockGetExchangeRate(args),
}

describe('PricesService', () => {
  let db: Knex
  let priceService: PricesService

  beforeEach(async () => {
    jest.clearAllMocks()
    db = await initDatabase({ client: 'sqlite3' })
    // @ts-ignore
    priceService = new PricesService(db, mockExchangeAPI, mockcUSDAddress)
  })

  afterEach(async () => {
    await db.destroy()
  })

  it('should return expected price', async () => {
    mockGetExchangeRate.mockReturnValue(1)
    await addHistoricPrice(token, '64000', 0)
    await addHistoricPrice(token, '60000', 10000) // 10 seconds after
    await addHistoricPrice(fakeToken, '1000', 12000) // Different token

    await assertQueryExpectedValue(5000, '64000')
    await assertQueryExpectedValue(7500, '64000')
    await assertQueryExpectedValue(10000, '60000')
    await assertQueryExpectedValue(12500, '60000')
    await assertQueryThrowsError(12000 + 4 * HOURS)
  })

  it('should return expected price when exchage API returns different than 1', async () => {
    mockGetExchangeRate.mockReturnValue(1.2)
    await addHistoricPrice(token, '64000', 0)
    await addHistoricPrice(token, '60000', 10000) // 10 seconds after
    await addHistoricPrice(fakeToken, '1000', 12000) // Different token

    await assertQueryExpectedValue(5000, '76800')
    await assertQueryExpectedValue(7500, '76800')
    await assertQueryExpectedValue(10000, '72000')
    await assertQueryExpectedValue(12500, '72000')
    await assertQueryThrowsError(12000 + 4 * HOURS)
  })

  it('should throw an exception when db does not contain enough info', async () => {
    await assertQueryThrowsError(5000)
  })

  async function addHistoricPrice(
    token: string,
    price: string,
    dateOffset: number,
  ) {
    await db(tableName).insert({
      base_token: mockcUSDAddress,
      token,
      price,
      at: new Date(mockDate + dateOffset).toISOString(),
    })
  }

  async function assertQueryThrowsError(dateOffset: number) {
    const queryDate = new Date(mockDate + dateOffset)
    const query = async () =>
      await priceService.getTokenToLocalCurrencyPrice(
        token,
        localCurrency,
        queryDate,
      )

    await expect(query).rejects.toThrowError()
  }

  async function assertQueryExpectedValue(
    dateOffset: number,
    expectedValue: string,
  ) {
    const queryDate = new Date(mockDate + dateOffset)
    const price = await priceService.getTokenToLocalCurrencyPrice(
      token,
      localCurrency,
      queryDate,
    )
    expect(price.toString()).toBe(expectedValue)

    expect(mockGetExchangeRate).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceCurrencyCode: USD,
        currencyCode: localCurrency,
        timestamp: queryDate.getTime(),
      }),
    )
  }
})
