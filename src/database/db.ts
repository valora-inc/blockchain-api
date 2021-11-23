import { Knex, knex } from 'knex'
import { logger } from '../logger'

async function checkAndMigrate(db: Knex) {
  logger.info('Running migrations')

  await db.migrate.latest({
    directory: './dist/database/migrations',
    loadExtensions: ['.js'],
  })

  logger.info('Database initialized successfully')
}

export async function initDatabase({
  client,
  connection,
}: {
  client: string
  connection?: {
    host: string
    database: string
    user: string
    password: string
  }
}) {
  let db: Knex
  if (client === 'sqlite3') {
    db = knex({
      client: 'sqlite3',
      connection: {
        filename: ':memory:',
      },
      useNullAsDefault: true,
    })
  } else if (client === 'pg') {
    db = knex({
      client: 'pg',
      connection,
    })
  } else {
    throw Error(`Unsupported client type: ${client}`)
  }

  await checkAndMigrate(db)

  return db
}
