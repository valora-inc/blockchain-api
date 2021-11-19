import PricesService from '../../src/prices/PricesService'
import { initDatabase } from '../../src/database/db'
import { Knex } from 'knex'

const tableName = 'historical_token_prices'

const mockcUSDAddress = 'cUSD'
const mockDate = 1487076708000
const token = 'bitcoin'
const fakeToken = 'fake'
const localCurrency = 'USD'
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
    db = await initDatabase()
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
    await addHistoricPrice(token, '62000', 20000) // 20 seconds after
    await addHistoricPrice(token, '58000', 30000) // 30 seconds after
    await addHistoricPrice(token, '10000', 30000 + 6 * HOURS) // 6 hours and 30 seconds after
    await addHistoricPrice(token, '12000', 40000 + 6 * HOURS) // 6 hours and 40 seconds after
    await addHistoricPrice(fakeToken, '1000', 12000) // Different token

    await assertQueryExpectedValue(5000, '62000')
    await assertQueryExpectedValue(7500, '61000')
    await assertQueryExpectedValue(10000, '60000')
    await assertQueryExpectedValue(12500, '60500')
    await assertQueryExpectedValue(15000, '61000')
    await assertQueryExpectedValue(30000, '58000')
    await assertQueryThrowsError(100000)
    await assertQueryExpectedValue(35000 + 6 * HOURS, '11000')
    await assertQueryThrowsError(45000 + 6 * HOURS)
  })

  it('should return expected price when exchage API returns different than 1', async () => {
    mockGetExchangeRate.mockReturnValue(1.2)
    await addHistoricPrice(token, '64000', 0)
    await addHistoricPrice(token, '60000', 10000) // 10 seconds after
    await addHistoricPrice(token, '62000', 20000) // 20 seconds after
    await addHistoricPrice(token, '58000', 30000) // 30 seconds after
    await addHistoricPrice(fakeToken, '1000', 12000) // Different token

    await assertQueryExpectedValue(0, '76800')
    await assertQueryExpectedValue(5000, '74400')
    await assertQueryExpectedValue(7500, '73200')
    await assertQueryExpectedValue(10000, '72000')
    await assertQueryExpectedValue(12500, '72600')
    await assertQueryExpectedValue(15000, '73200')
    await assertQueryThrowsError(32000)
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
        sourceCurrencyCode: mockcUSDAddress,
        currencyCode: localCurrency,
        timestamp: queryDate.getTime(),
      }),
    )
  }
})
