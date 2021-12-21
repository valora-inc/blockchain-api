import { Knex } from 'knex'
import { logger } from '../../logger'
import { database } from '../../firebase'
import { HistoricalPriceRow } from '../types'
import BigNumber from 'bignumber.js'

const TABLE_NAME = 'historical_token_prices'

interface TokenAddresses {
  cUSD: string
  cEUR: string
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
  await knex(TABLE_NAME)
    .delete()
    .where({ fetched_from: '20211213154345_migration' })
}

async function historicalPricesMigration(knex: Knex) {
  const tokenAddresses = await fetchTokensAddresses()
  const celoTuplesToInsert = await fetchHistoricalCeloData(tokenAddresses)
  await knex.batchInsert(TABLE_NAME, celoTuplesToInsert)
  const cEurTuplesToInsert = await fetchHistoricalcEurData(tokenAddresses, knex)
  await knex.batchInsert(TABLE_NAME, cEurTuplesToInsert)
}

async function fetchHistoricalcEurData(
  tokenAddresses: TokenAddresses,
  knex: Knex,
) {
  const celoEurSnapshot = Object.values(
    (await database.ref(`exchangeRates/cEUR/cGLD`).once('value')).val(),
  )

  return await Promise.all(
    Object.values(celoEurSnapshot).map(async (entry: any) => {
      const isoDate = new Date(entry.timestamp).toISOString()
      const priceRow = await knex<HistoricalPriceRow>(TABLE_NAME)
        .where({
          token: tokenAddresses.CELO,
          base_token: tokenAddresses.cUSD,
        })
        .andWhere('at', '=', isoDate)
        .first()

      if (!priceRow) {
        logger.warn(`Couldn't fetch price for cEUR at ${isoDate}`)
        return {}
      }

      return {
        token: tokenAddresses.cEUR,
        base_token: tokenAddresses.cUSD,
        at: isoDate,
        price: new BigNumber(priceRow.price)
          .multipliedBy(entry.exchangeRate)
          .toString(),
        fetched_from: '20211213154345_migration',
      }
    }),
  )
}

async function fetchHistoricalCeloData(tokenAddresses: TokenAddresses) {
  const celoUsdSnapshot = Object.values(
    (await database.ref(`exchangeRates/cGLD/cUSD`).once('value')).val(),
  )

  return Object.values(celoUsdSnapshot).map((entry: any) => ({
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
  const cEURAddress = getAddressForSymbol(tokensInfoValue, 'cEUR')
  const celoAddress = getAddressForSymbol(tokensInfoValue, 'CELO')

  if (!cUSDAddress || !cEURAddress || !celoAddress) {
    throw new Error("Can't obtain token addresses")
  }
  return {
    cUSD: cUSDAddress,
    cEUR: cEURAddress,
    CELO: celoAddress,
  }
}

function getAddressForSymbol(
  tokensInfo: any[],
  symbol: string,
): string | undefined {
  return tokensInfo.find((token) => token.symbol === symbol)?.address
}
