import PricesService from '../../src/prices/PricesService'
import { initDatabase } from '../../src/database/db'
import { Knex } from 'knex'
import { USD } from '../../src/currencyConversion/consts'

const tableName = 'historical_token_prices'

const mockcUSDAddress = 'cusd_address'
const mockDate = 1487076708000
const defaultToken = 'bitcoin'
const fakeToken = 'fake'
const defaultLocalCurrency = 'EUR'
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
    jest.clearAllMocks()
    await db.destroy()
  })

  it('should return expected price', async () => {
    mockGetExchangeRate.mockReturnValue(1)
    await addHistoricPrice(defaultToken, '64000', 0)
    await addHistoricPrice(defaultToken, '60000', 10000) // 10 seconds after
    await addHistoricPrice(fakeToken, '1000', 12000) // Different token

    await expectQueryValue(5000, '64000')
    await expectQueryValue(7500, '64000')
    await expectQueryValue(10000, '60000')
    await expectQueryValue(12500, '60000')
    await expectQueryThrowsError(12000 + 4 * HOURS)
  })

  it('should return expected price when exchage API returns different than 1', async () => {
    mockGetExchangeRate.mockReturnValue(1.2)
    await addHistoricPrice(defaultToken, '64000', 0)
    await addHistoricPrice(defaultToken, '60000', 10000) // 10 seconds after
    await addHistoricPrice(fakeToken, '1000', 12000) // Different token

    await expectQueryValue(5000, '76800')
    await expectQueryValue(7500, '76800')
    await expectQueryValue(10000, '72000')
    await expectQueryValue(12500, '72000')
    await expectQueryThrowsError(12000 + 4 * HOURS)
  })

  it('should throw an exception when db does not contain enough info', async () => {
    await expectQueryThrowsError(5000)
  })

  it('should return 1 times exchange rate when requested token is cUSD', async () => {
    mockGetExchangeRate.mockReturnValue(1.2)
    await expectQueryValue(5000, '1.2', mockcUSDAddress)
  })

  it('should return 1 when requested token is cUSD and local currency is USD', async () => {
    mockGetExchangeRate.mockReturnValue(1.2)
    const price = await priceService.getTokenToLocalCurrencyPrice(
      mockcUSDAddress,
      USD,
      new Date(mockDate),
    )
    expect(price.toString()).toBe('1')
    expect(mockGetExchangeRate).not.toHaveBeenCalled()
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

  async function expectQueryThrowsError(dateOffset: number) {
    const queryDate = new Date(mockDate + dateOffset)
    const query = async () =>
      await priceService.getTokenToLocalCurrencyPrice(
        defaultToken,
        defaultLocalCurrency,
        queryDate,
      )

    await expect(query).rejects.toThrowError()
  }

  async function expectQueryValue(
    dateOffset: number,
    expectedValue: string,
    token: string = defaultToken,
  ) {
    const queryDate = new Date(mockDate + dateOffset)
    const price = await priceService.getTokenToLocalCurrencyPrice(
      token,
      defaultLocalCurrency,
      queryDate,
    )
    expect(price.toString()).toBe(expectedValue)

    expect(mockGetExchangeRate).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceCurrencyCode: USD,
        currencyCode: defaultLocalCurrency,
        timestamp: queryDate.getTime(),
      }),
    )
  }
})
