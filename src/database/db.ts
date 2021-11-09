import { Knex, knex } from 'knex'
import { logger } from '../logger'

async function checkAndMigrate(db: Knex) {
  try {
    await db.raw('select 1')
    logger.info('Database connected successfully')
  } catch (e) {
    logger.error(
      `Database couldn't be initialized successfully ${(e as Error)?.message}`,
    )
    throw e
  }

  logger.info('Running migrations')

  await db.migrate.latest({
    directory: './dist/database/migrations',
    loadExtensions: ['.js'],
  })

  logger.info('Database initialized successfully')
}

function createInMemoryDatabase(): Knex {
  logger.info('Connecting on memory database')
  return knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  })
}

function createDatabaseFromEnvVars(): Knex {
  logger.info('Connecting database')
  return knex({
    client: 'pg',
    connection: {
      host: process.env.BLOCKCHAIN_DB_HOST,
      database: process.env.BLOCKCHAIN_DB_DATABASE,
      user: process.env.BLOCKCHAIN_DB_USER,
      password: process.env.BLOCKCHAIN_DB_PASS,
    },
  })
}

export async function initDatabase() {
  let db: Knex
  if (process.env.NODE_ENV === 'test') {
    db = createInMemoryDatabase()
  } else {
    db = createDatabaseFromEnvVars()
  }

  await checkAndMigrate(db)

  return db
}
