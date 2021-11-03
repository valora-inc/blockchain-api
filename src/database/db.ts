import { Knex, knex } from 'knex'
import { logger } from '../logger'

interface DBConnectionArgs {
  host: string
  database: string
  user: string
  password: string
}

export async function initDatabase(
  connectionArgs: DBConnectionArgs,
): Promise<Knex> {
  logger.info('Connecting database')
  const knexDb = knex({
    client: 'pg',
    connection: connectionArgs,
  })

  // Checking connection
  try {
    await knexDb.raw('select 1')
    logger.info('Database connected successfully')
  } catch (e) {
    logger.error(
      `Database couldn't be initialized successfully ${(e as Error)?.message}`,
    )
    throw e
  }

  logger.info('Running migrations')

  await knexDb.migrate.latest({
    directory: './dist/database/migrations',
    loadExtensions: ['.js'],
  })

  logger.info('Database initialized successfully')

  return knexDb
}
