import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('historical_token_prices', (table) => {
    table.increments('id').primary()
    // table.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    table.string('token').notNullable()
    table.string('comparedToken').notNullable()
    table.dateTime('at').notNullable()
    // Using string to convert to big number
    table.string('price').notNullable()

    table.index(['comparedToken', 'token', 'at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('historical_token_prices')
}
