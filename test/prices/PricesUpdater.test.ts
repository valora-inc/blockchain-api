import { updatePrices } from '../../src/prices/PriceUpdater'
import { initDatabase } from '../../src/database/db'
import { Knex } from 'knex'
import { Config } from '@valora/exchanges'
import BigNumber from 'bignumber.js'

const mockCalculatePrices = jest.fn()

const mockcUSDAddress = 'cUSD'
const mockDate = 1487076708000
const tableName = 'historical_token_prices'

jest.mock('@valora/exchanges', () => ({
  configs: {
    test: {
      tokenAddresses: {
        cUSD: 'cUSD',
      },
    },
  },
  createNewManager: (config: Config) => ({
    calculatecUSDPrices: () => mockCalculatePrices(),
  }),
}))

describe('PricesUpdater#updatePrices', () => {
  let db: Knex
  let dateNowSpy: any
  const OLD_ENV = process.env

  beforeEach(async () => {
    jest.clearAllMocks()
    mockCalculatePrices.mockReturnValue({
      cUSD: new BigNumber(1),
      cEUR: new BigNumber(1.17),
      bitcoin: new BigNumber(60000),
    })

    dateNowSpy = jest.spyOn(Date, 'now').mockImplementation(() => mockDate)

    db = await initDatabase()
  })

  afterEach(async () => {
    await db.destroy()
    dateNowSpy.mockRestore()
    process.env = OLD_ENV
  })

  it('should store token prices', async () => {
    process.env.EXCHANGES_ENV = 'test'

    await updatePrices(db)

    expect(await db(tableName)).toHaveLength(3)

    const bitcoinQuery = await db(tableName).where({ token: 'bitcoin' })
    expect(bitcoinQuery).toHaveLength(1)
    expect(bitcoinQuery[0]).toMatchObject({
      base_token: mockcUSDAddress,
      token: 'bitcoin',
      price: '60000',
      at: new Date(mockDate).toISOString(),
    })

    const cEURQuery = await db(tableName).where({ token: 'cEUR' })
    expect(cEURQuery).toHaveLength(1)
    expect(cEURQuery[0]).toMatchObject({
      base_token: mockcUSDAddress,
      token: 'cEUR',
      price: '1.17',
      at: new Date(mockDate).toISOString(),
    })
  })
})
