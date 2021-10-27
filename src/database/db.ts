import { Knex, knex } from 'knex'
import { logger } from '../logger'

interface DBConnectionArgs {
  host: string
  database: string
  user: string
  password: string
}

export async function initDatabase(connectionArgs: DBConnectionArgs): Promise<Knex> {
  const knexDb = knex({
    client: 'pg',
    connection: connectionArgs,
  })

  logger.info('Running Migrations')

  await knexDb.migrate.latest({
    directory: './dist/database/migrations',
    loadExtensions: ['.js'],
  })

  logger.info('Database initialized successfully')

  return knexDb
}
