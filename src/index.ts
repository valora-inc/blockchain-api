import express from 'express'
import promBundle from 'express-prom-bundle'
import { initApolloServer } from './apolloServer'
import CurrencyConversionAPI from './currencyConversion/CurrencyConversionAPI'
import ExchangeRateAPI from './currencyConversion/ExchangeRateAPI'
import knownAddressesCache from './helpers/KnownAddressesCache'
import { logger } from './logger'
import { EXCHANGE_RATES_API_ACCESS_KEY } from './config'

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })

const GRAPHQL_PATH: string = '/'

const PORT: number = Number(process.env.PORT) || 8080
const INTERFACE: string = process.env.INTERFACE || '0.0.0.0'

async function main() {

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

  // TODO(sbw): load EXCHANGE_RATES_API_ACCESS_KEY async (e.g., from a secrets
  // management service).
  const exchangeRateAPI = new ExchangeRateAPI({ exchangeRatesAPIAccessKey: EXCHANGE_RATES_API_ACCESS_KEY })
  const currencyConversionAPI = new CurrencyConversionAPI({ exchangeRateAPI })
  const apolloServer = initApolloServer({currencyConversionAPI})
  apolloServer.applyMiddleware({ app, path: GRAPHQL_PATH })

  app.listen(PORT, INTERFACE, () => {
    logger.info(`🚀 GraphQL accessible @ http://${INTERFACE}:${PORT}${apolloServer.graphqlPath}`)
    logger.info('[Celo] Starting Server')
  })
}

main()
  .catch(err => {
    logger.error({
      type: 'STARTUP',
      error: err.message
    })
    process.exit(1)
  })
