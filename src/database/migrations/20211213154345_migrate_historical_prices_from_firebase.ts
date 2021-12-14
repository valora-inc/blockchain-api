
import { Knex } from 'knex'
import { database } from '../../firebase'

interface TokenAddresses {
  cUSD: string,
  CELO: string
}

export async function up(knex: Knex): Promise<void> {
  try {
    internalUp(knex)
  } catch(e) {
    console.warn("Error while migrating historical prices", (e as Error).message)
    // Skip e2e since we don't have a firebase connection
    if (process.env.DEPLOY_ENV !== 'e2e') {
      throw e
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('historical_token_prices')
    .delete()
    .where({fetched_from: '20211213154345_migration'})

  await knex.schema.alterTable('historical_token_prices', (table) => {
      table.dropColumn('fetched_from')
  })
}

async function internalUp(knex: Knex) {
  await knex.schema.alterTable('historical_token_prices', (table) => {
    table.string('fetched_from')
  })

  const tokenAddresses = await fetchTokensAddresses()
  const tuplesToInsert = await fetchHistoricalData(tokenAddresses)
  
  await knex.batchInsert('historical_token_prices', tuplesToInsert)
}

async function fetchHistoricalData(tokenAddresses: TokenAddresses) {
  const celoUSDSnapshot = Object.values((await database.ref(`exchangeRates/cGLD/cUSD`).once('value')).val())
  
  return Object.values(celoUSDSnapshot).map((entry: any) => ({
    token: tokenAddresses.CELO,
    base_token: tokenAddresses.cUSD,
    at: new Date(entry.timestamp).toISOString(),
    price: entry.exchangeRate,
    fetched_from: "20211213154345_migration"
  }))
}

async function fetchTokensAddresses(): Promise<TokenAddresses> {
  const snapshot = (await database.ref(`tokensInfo`).once('value')).val()
  const tokensInfoValue = Object.values(snapshot)
  return {
    cUSD: getAddressForSymbol(tokensInfoValue, "cUSD"),
    CELO: getAddressForSymbol(tokensInfoValue, "CELO"),
  }
}

function getAddressForSymbol(tokensInfo: any[], symbol: string): string {
  return tokensInfo.find(token => token.symbol === symbol)?.address
}
