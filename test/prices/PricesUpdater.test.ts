import {
  ONE_DAY_IN_MS,
  storeHistoricalPrices,
  updateCurrentPrices,
  updateHistoricalPrices,
} from '../../src/prices/PricesUpdater'
import { initDatabase } from '../../src/database/db'
import { Knex } from 'knex'
import { ExchangeRateManager } from '@valora/exchanges'
import BigNumber from 'bignumber.js'
import PricesService from '../../src/prices/PricesService'

const cUSD = {
  address: '0x1234',
}
const cEUR = {
  address: '0x1235',
}
const bitcoin = {
  address: '0x1236',
}
const mcEUR = {
  address: '0x1237',
  pegTo: '0x1235',
}
const extraToken = {
  address: '0x1111',
}
const extraPegToken = {
  address: '0x1112',
  pegTo: '0x12222',
}

const OLD_ENV = process.env

const FIREBASE_NODE = '/tokensInfo'

const mockUpdateFirebase = jest.fn()

jest.mock('../../src/firebase', () => ({
  updateFirebase: (path: string, object: any) =>
    mockUpdateFirebase(path, object),
}))

jest.mock('../../src/helpers/TokenInfoCache', () => ({
  getTokensInfo: () => [cUSD, cEUR, mcEUR, extraToken, extraPegToken],
  getTokensAddresses: () => [
    cUSD.address,
    cEUR.address,
    mcEUR.address,
    extraToken.address,
    extraPegToken.address,
  ],
}))

describe('Mocking date and exchange manager', () => {
  let dateNowSpy: any
  const mockDate = 1487076708000

  const mockCalculatePrices = jest.fn()
  const mockExchangeRateManager: ExchangeRateManager = {
    calculatecUSDPrices: mockCalculatePrices,
    cUSDTokenAddress: cUSD.address,
  }

  beforeAll(async () => {
    jest.clearAllMocks()
    mockCalculatePrices.mockReturnValue({
      [cUSD.address]: new BigNumber(1),
      [cEUR.address]: new BigNumber(1.17),
      [bitcoin.address]: new BigNumber(60000),
    })

    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockDate)
    process.env.EXCHANGES_ENV = 'test'
  })

  afterAll(async () => {
    dateNowSpy.mockRestore()
    process.env = OLD_ENV
  })

  describe('PricesUpdater#updateCurrentPrices', () => {
    it('should update current prices for tokens in tokensInfo', async () => {
      await updateCurrentPrices({
        exchangeRateManager: mockExchangeRateManager,
      })
      expect(mockUpdateFirebase).toHaveBeenCalledWith(FIREBASE_NODE, {
        [`${cUSD.address}/usdPrice`]: '1',
        [`${cUSD.address}/priceFetchedAt`]: mockDate,
        [`${cEUR.address}/usdPrice`]: '1.17',
        [`${cEUR.address}/priceFetchedAt`]: mockDate,
        // It's peg to the value of cEUR
        [`${mcEUR.address}/usdPrice`]: '1.17',
        [`${mcEUR.address}/priceFetchedAt`]: mockDate,
      })
    })
  })

  describe('PricesUpdater#storeHistoricalPrices', () => {
    let db: Knex
    const tableName = 'historical_token_prices'

    beforeEach(async () => {
      db = await initDatabase({ client: 'sqlite3' })
    })

    afterEach(async () => {
      await db.destroy()
    })

    it('should store token prices', async () => {
      expect(await db(tableName)).toHaveLength(0)
      await storeHistoricalPrices({
        db,
        exchangeRateManager: mockExchangeRateManager,
      })

      expect(await db(tableName)).toHaveLength(3)

      const bitcoinQuery = await db(tableName).where({ token: bitcoin.address })
      expect(bitcoinQuery).toHaveLength(1)
      expect(bitcoinQuery[0]).toMatchObject({
        base_token: cUSD.address,
        token: bitcoin.address,
        price: '60000',
        at: new Date(mockDate).toISOString(),
      })

      const cEURQuery = await db(tableName).where({ token: cEUR.address })
      expect(cEURQuery).toHaveLength(1)
      expect(cEURQuery[0]).toMatchObject({
        base_token: cUSD.address,
        token: cEUR.address,
        price: '1.17',
        at: new Date(mockDate).toISOString(),
      })

      const mcEURQuery = await db(tableName).where({ token: mcEUR.address })
      expect(mcEURQuery).toHaveLength(1)
      expect(mcEURQuery[0]).toMatchObject({
        base_token: cUSD.address,
        token: mcEUR.address,
        price: '1.17',
        at: new Date(mockDate).toISOString(),
      })
    })
  })

  describe('PricesUpdater#updateLastDayPrices', () => {
    let dateNowSpy: any
    const mockDate = 1487076708000
    const expectedDateTime = mockDate - 1 * ONE_DAY_IN_MS
    const expectedDate = new Date(expectedDateTime)

    beforeAll(async () => {
      jest.clearAllMocks()
      dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockDate)
    })

    afterAll(async () => {
      dateNowSpy.mockRestore()
    })

    const mockGetTokenTocUSDPrice = jest.fn()
    // @ts-ignore: only this method is needed to test this feature.
    const pricesService: PricesService = {
      getTokenTocUSDPrice: async (tokenAddress: string, date: Date) =>
        mockGetTokenTocUSDPrice(tokenAddress, date),
    }

    it('should update last day prices', async () => {
      mockGetTokenTocUSDPrice.mockImplementation(
        (tokenAddress: string, date: Date) => {
          switch (tokenAddress) {
            case cUSD.address:
              return new BigNumber(1)
            case cEUR.address:
              return new BigNumber(1.17)
            default:
              throw new Error('Could find token prices')
          }
        },
      )

      await updateHistoricalPrices({ pricesService })
      expect(mockGetTokenTocUSDPrice).toHaveBeenCalledWith(
        cUSD.address,
        expectedDate,
      )
      expect(mockUpdateFirebase).toHaveBeenCalledWith(
        `${FIREBASE_NODE}/${cUSD.address}/historicalUsdPrices/lastDay`,
        {
          price: '1',
          at: expectedDateTime,
        },
      )
      expect(mockGetTokenTocUSDPrice).toHaveBeenCalledWith(
        cEUR.address,
        expectedDate,
      )
      expect(mockUpdateFirebase).toHaveBeenCalledWith(
        `${FIREBASE_NODE}/${cEUR.address}/historicalUsdPrices/lastDay`,
        {
          price: '1.17',
          at: expectedDateTime,
        },
      )
      expect(mockGetTokenTocUSDPrice).toHaveBeenCalledWith(
        extraToken.address,
        expectedDate,
      )
      expect(mockUpdateFirebase).not.toHaveBeenCalledWith(
        `${FIREBASE_NODE}/${extraToken.address}/historicalUsdPrices/lastDay`,
        expect.anything(),
      )
    })
  })
})
