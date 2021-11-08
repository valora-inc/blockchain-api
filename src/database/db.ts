import { Knex, knex } from 'knex'
import { logger } from '../logger'

interface DBConnectionArgs {
  host: string
  database: string
  user: string
  password: string
}

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

// Used to test
export async function initOnMemoryDatabase(): Promise<Knex> {
  logger.info('HERE')
  const db = knex({
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
  })

  checkAndMigrate(db)

  return db
}

export async function initDatabase(
  connectionArgs: DBConnectionArgs,
): Promise<Knex> {
  logger.info('Connecting database')
  const knexDb = knex({
    client: 'pg',
    connection: connectionArgs,
  })

  await checkAndMigrate(knexDb)

  return knexDb
}
