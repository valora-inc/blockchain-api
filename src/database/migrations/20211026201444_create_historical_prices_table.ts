import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('historical_token_prices', (table) => {
    table.increments('id').primary()
    table.string('token').notNullable()
    table.string('base_token').notNullable()
    table.dateTime('at').notNullable()
    // Using string to convert to big number
    table.string('price').notNullable()

    table.index(['base_token', 'token', 'at'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('historical_token_prices')
}
