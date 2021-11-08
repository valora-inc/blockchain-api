import { updatePrices } from '../../src/prices/PriceUpdater'
import { initOnMemoryDatabase } from '../../src/database/db'
import { Knex } from 'knex'

describe('PricesUpdater#updatePrices', () => {
  const mockManager = jest.fn()
  let db: Knex

  jest.mock('@valora/exchanges', () => ({
    getConfigForEnv: jest.fn(),
    createNewManager: () => mockManager,
  }))

  beforeAll(async () => {
    console.log('THIS')
    db = await initOnMemoryDatabase()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should store token prices', async () => {
    await updatePrices(db)
  })
})
