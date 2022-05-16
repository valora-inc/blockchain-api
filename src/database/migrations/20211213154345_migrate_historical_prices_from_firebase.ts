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

async function firebaseReady() {
  // If we don't have a RTDB handle, assume Firebase will never be ready.
  if (!database) {
    logger.info('No Firebase RTDB handle')
    return false
  }

  const timeoutSeconds = 5
  const end = Date.now() + timeoutSeconds * 1000
  while (true) {
    const connected = (
      await database.ref('.info/connected').once('value')
    ).val()
    if (connected) {
      break
    }
    const now = Date.now()
    if (end < now) {
      // Assume we'll never connect and Firebase will never be ready.
      logger.info('Firebase RTDB timed out')
      return false
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  const tokensInfoExists = !!(
    await database.ref(`tokensInfo`).once('value')
  ).val()
  if (!tokensInfoExists) {
    // Assume we should skip if we're missing expected values.
    logger.info('Firebase RTDB does not have expected tokensInfo')
    return false
  }

  return true
}

// Once the migration is done in alfajores and mainnet, we could remove this file or at least silent its errors
export async function up(knex: Knex): Promise<void> {
  if (!(await firebaseReady())) {
    logger.info('Skip migrating historical prices from Firebase RTDB')
    return
  }

  await historicalPricesMigration(knex)
  logger.info('Historical prices migrated')
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
