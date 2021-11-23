import express from 'express'
import promBundle from 'express-prom-bundle'
import { initApolloServer } from './apolloServer'
import CurrencyConversionAPI from './currencyConversion/CurrencyConversionAPI'
import ExchangeRateAPI from './currencyConversion/ExchangeRateAPI'
import knownAddressesCache from './helpers/KnownAddressesCache'
import { logger } from './logger'
import { loadSecret } from '@valora/secrets-loader'
import { initDatabase } from './database/db'
import { updatePrices } from './prices/PricesUpdater'
import yargs from 'yargs'

const metricsMiddleware = promBundle({ includeMethod: true, includePath: true })

const GRAPHQL_PATH: string = '/'

async function parseArgs() {
  //
  // Load secrets from Secrets Manager and inject into process.env.
  //
  const secretNames = process.env.SECRET_NAMES?.split(',') ?? []
  for (const secretName of secretNames) {
    Object.assign(process.env, await loadSecret(secretName))
  }

  const argv = yargs
    .env('')
    .option('port', {
      description: 'Port to listen on',
      type: 'number',
      default: 8080,
    })
    .option('exchange-rates-api-access-key', {
      description: 'API key for exchange-rates-api',
      type: 'string',
      demandOption: true,
    })
    .option('blockchain-db-host', {
      group: 'Blockchain DB:',
      description: 'Blockchain DB host',
      type: 'string',
      demandOption: true,
    })
    .option('blockchain-db-database', {
      group: 'Blockchain DB:',
      description: 'Blockchain DB database',
      type: 'string',
      demandOption: true,
    })
    .option('blockchain-db-user', {
      group: 'Blockchain DB:',
      description: 'Blockchain DB user',
      type: 'string',
      demandOption: true,
    })
    .option('blockchain-db-pass', {
      group: 'Blockchain DB:',
      description: 'Blockchain DB pass',
      type: 'string',
      demandOption: true,
    })
    .epilogue(
      'Always specify arguments as environment variables. Not all arguments are supported as CLI ones yet.',
    ).argv

  return argv
}

async function main() {
  const args = await parseArgs()

  const db = await initDatabase({
    client: 'pg',
    connection: {
      host: args['blockchain-db-host'],
      database: args['blockchain-db-database'],
      user: args['blockchain-db-user'],
      password: args['blockchain-db-pass'],
    },
  })

  const app = express()

  app.use(metricsMiddleware)

  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain')
    res.send('User-agent: *\nDisallow: /')
  })

  app.get('/cron/update-prices', async (req, res) => {
    // App Engine sets this header if and only if the request is from a cron.
    if (!req.headers['x-appengine-cron']) {
      logger.warn('Request does not contain header x-appengine-cron')
      res.status(401).send()
      return
    }

    try {
      await updatePrices(db)
      res.status(204).send()
    } catch (error) {
      logger.error(error)
      res.status(500).send()
    }
  })

  app.head('/', (_req, res) => {
    // Preventing HEAD requests made by some browsers causing alerts
    // https://github.com/celo-org/celo-monorepo/issues/2189
    res.end()
  })

  knownAddressesCache.startListening()

  const exchangeRateAPI = new ExchangeRateAPI({
    exchangeRatesAPIAccessKey: args['exchange-rates-api-access-key'],
  })
  const currencyConversionAPI = new CurrencyConversionAPI({ exchangeRateAPI })
  const apolloServer = initApolloServer({ currencyConversionAPI })
  await apolloServer.start()
  apolloServer.applyMiddleware({ app, path: GRAPHQL_PATH })

  app.listen(args.port, () => {
    logger.info(`Listening on port ${args.port}`)
    logger.info(`GraphQL path ${apolloServer.graphqlPath}`)
  })
}

main().catch((err) => {
  logger.error({
    type: 'STARTUP',
    error: err.message,
  })
  process.exit(1)
})
