import { Knex } from 'knex'
import { logger } from '../../logger'
import { database } from '../../firebase'

interface TokenAddresses {
  cUSD: string
  CELO: string
}

// Once the migration is done in alfajores and mainnet, we could remove this file or at least silent its errors
export async function up(knex: Knex): Promise<void> {
  try {
    await historicalPricesMigration(knex)
    logger.info('Historical prices migrated')
  } catch (e) {
    logger.warn('Error while migrating historical prices', (e as Error).message)
    // Skip e2e and local since maybe we don't have a firebase connection.
    if (
      process.env.DEPLOY_ENV !== 'e2e' &&
      process.env.DEPLOY_ENV !== 'local'
    ) {
      throw e
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('historical_token_prices')
    .delete()
    .where({ fetched_from: '20211213154345_migration' })
}

async function historicalPricesMigration(knex: Knex) {
  const tokenAddresses = await fetchTokensAddresses()
  const tuplesToInsert = await fetchHistoricalData(tokenAddresses)

  await knex.batchInsert('historical_token_prices', tuplesToInsert)
}

async function fetchHistoricalData(tokenAddresses: TokenAddresses) {
  const celoUSDSnapshot = Object.values(
    (await database.ref(`exchangeRates/cGLD/cUSD`).once('value')).val(),
  )

  return Object.values(celoUSDSnapshot).map((entry: any) => ({
    token: tokenAddresses.CELO,
    base_token: tokenAddresses.cUSD,
    at: new Date(entry.timestamp).toISOString(),
    price: entry.exchangeRate,
    fetched_from: '20211213154345_migration',
  }))
}

async function fetchTokensAddresses(): Promise<TokenAddresses> {
  const snapshot = (await database.ref(`tokensInfo`).once('value')).val()
  const tokensInfoValue = Object.values(snapshot)
  const cUSDAddress = getAddressForSymbol(tokensInfoValue, 'cUSD')
  const celoAddress = getAddressForSymbol(tokensInfoValue, 'CELO')

  if (!cUSDAddress || !celoAddress) {
    throw new Error("Can't obtain token addresses");
  }
  return {
    cUSD: cUSDAddress,
    CELO: celoAddress,
  }
}

function getAddressForSymbol(tokensInfo: any[], symbol: string): string | undefined {
  return tokensInfo.find((token) => token.symbol === symbol)?.address
}
