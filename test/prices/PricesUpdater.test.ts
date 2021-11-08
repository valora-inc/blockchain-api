import { updatePrices } from '../../src/prices/PriceUpdater'
import { initOnMemoryDatabase } from '../../src/database/db'
import { Knex } from 'knex'
import { logger } from '../../src/logger'

describe('PricesUpdater#updatePrices', () => {
  const mockManager = jest.fn()
  let db: Knex

  jest.mock('@valora/exchanges', () => ({
    getConfigForEnv: jest.fn(),
    createNewManager: () => mockManager,
  }))

  beforeAll(async () => {
    logger.info('THIS')
    try {
      db = await initOnMemoryDatabase()
      logger.info("DB WORKING!")
    } catch( e) {
      logger.error("DB NOT WORKING!!")
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should store token prices', async () => {
    await updatePrices(db)
  })
})
