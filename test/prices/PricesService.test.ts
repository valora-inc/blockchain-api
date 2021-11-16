import PricesService from '../../src/prices/PricesService'
import { initDatabase } from '../../src/database/db'
import { Knex } from 'knex'

const tableName = 'historical_token_prices'

const mockcUSDAddress = 'cUSD'
const mockDate = 1487076708000
const token = 'bitcoin'
const localCurrency = 'USD'

const mockGetExchangeRate = jest.fn()

const mockExchangeAPI = {
  getExchangeRate: (args: any) => mockGetExchangeRate(args),
}

jest.mock('@valora/exchanges', () => ({
  configs: {
    test: {
      tokenAddresses: {
        cUSD: 'cUSD',
      },
    },
  },
}))

describe('PricesService', () => {
  let db: Knex
  let priceService: PricesService
  const OLD_ENV = process.env

  beforeEach(async () => {
    jest.clearAllMocks()
    db = await initDatabase()
    process.env.EXCHANGES_ENV = 'test'
    // @ts-ignore
    priceService = new PricesService(db, mockExchangeAPI)
    mockGetExchangeRate.mockReturnValue(1)
  })

  afterEach(async () => {
    await db.destroy()
    process.env = OLD_ENV
  })

  it('should return expected price', async () => {
    await db(tableName).insert({
      base_token: mockcUSDAddress,
      token: token,
      price: '64000',
      at: new Date(mockDate).toISOString(),
    })
    await db(tableName).insert({
      base_token: mockcUSDAddress,
      token: token,
      price: '60000',
      at: new Date(mockDate + 10000).toISOString(), // 10 seconds after
    })
    await db(tableName).insert({
      base_token: mockcUSDAddress,
      token: token,
      price: '62000',
      at: new Date(mockDate + 20000).toISOString(), // 20 seconds after
    })
    await db(tableName).insert({
      base_token: mockcUSDAddress,
      token: token,
      price: '58000',
      at: new Date(mockDate + 30000).toISOString(), // 30 seconds after
    })

    await expectQuery(5000, '62000')
    await expectQuery(7500, '61000')
    await expectQuery(10000, '60000')
    await expectQuery(12500, '60500')
    await expectQuery(15000, '61000')
  })

  it('should throw an exception when db does not contain enough info', async () => {
    expect.assertions(1)
    try {
      await expectQuery(5000, '62000')
    } catch (e) {
      expect((e as Error)?.message).toEqual(
        expect.stringContaining(
          "Couldn't find entries in the db to calculate cUSD prices",
        ),
      )
    }
  })

  async function expectQuery(dateOffset: number, expectedValue: string) {
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
