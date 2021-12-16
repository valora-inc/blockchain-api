import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('historical_token_prices', (table) => {
    table.string('fetched_from')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('historical_token_prices', (table) => {
    table.dropColumn('fetched_from')
  })
}
