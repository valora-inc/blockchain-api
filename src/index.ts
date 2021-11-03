import express from 'express'
import promBundle from 'express-prom-bundle'
import { initApolloServer } from './apolloServer'
import CurrencyConversionAPI from './currencyConversion/CurrencyConversionAPI'
import ExchangeRateAPI from './currencyConversion/ExchangeRateAPI'
import knownAddressesCache from './helpers/KnownAddressesCache'
import { logger } from './logger'
import { loadSecret } from '@valora/secrets-loader'
import { initDatabase } from './database/db'

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })

const GRAPHQL_PATH: string = '/'

const PORT: number = Number(process.env.PORT) || 8080
const INTERFACE: string = process.env.INTERFACE || '0.0.0.0'

async function main() {

  if (process.env.DB_SECRET) {
    const dbCredentials = await loadSecret(process.env.DB_SECRET)
    await initDatabase({
      host: dbCredentials.HOST,
      database: dbCredentials.DATABASE,
      user: dbCredentials.USER,
      password: dbCredentials.PASSWORD
    })
  } else {
    throw new Error('Missing required DB_SECRET')
  }
  
  //
  // Load secrets from Secrets Manager and inject into process.env.
  //
  const secretNames = process.env.SECRET_NAMES?.split(',') ?? []
  for (const secretName of secretNames) {
    Object.assign(process.env, await loadSecret(secretName))
  }

  if (!process.env.EXCHANGE_RATES_API_ACCESS_KEY) {
    throw new Error('Missing required EXCHANGE_RATES_API_ACCESS_KEY')
  }

  const app = express()

  app.use(metricsMiddleware)

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain')
    res.send('User-agent: *\nDisallow: /')
  })

  app.head('/', (_req, res) => {
    // Preventing HEAD requests made by some browsers causing alerts
    // https://github.com/celo-org/celo-monorepo/issues/2189
    res.end()
  })

  knownAddressesCache.startListening()

  const exchangeRateAPI = new ExchangeRateAPI({
    exchangeRatesAPIAccessKey: process.env.EXCHANGE_RATES_API_ACCESS_KEY,
  })
  const currencyConversionAPI = new CurrencyConversionAPI({ exchangeRateAPI })
  const apolloServer = initApolloServer({ currencyConversionAPI })
  apolloServer.applyMiddleware({ app, path: GRAPHQL_PATH })

  app.listen(PORT, INTERFACE, () => {
    logger.info(
      `🚀 GraphQL accessible @ http://${INTERFACE}:${PORT}${apolloServer.graphqlPath}`,
    )
    logger.info('[Celo] Starting Server')
  })
}

main().catch((err) => {
  logger.error({
    type: 'STARTUP',
    error: err.message,
  })
  process.exit(1)
})
