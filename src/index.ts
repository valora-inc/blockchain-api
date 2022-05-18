import * as Sentry from '@sentry/node'
import * as Tracing from '@sentry/tracing'
import {
  configs as exchangesConfigs,
  createNewManager,
} from '@valora/exchanges'
import { loadSecret } from '@valora/secrets-loader'
import express from 'express'
import promBundle from 'express-prom-bundle'
import yargs from 'yargs'
import { initApolloServer } from './apolloServer'
import { cronRouter } from './crons'
import CurrencyConversionAPI from './currencyConversion/CurrencyConversionAPI'
import ExchangeRateAPI from './currencyConversion/ExchangeRateAPI'
import { initDatabase } from './database/db'
import knownAddressesCache from './helpers/KnownAddressesCache'
import tokenInfoCache from './helpers/TokenInfoCache'
import { logger } from './logger'
import PricesService from './prices/PricesService'

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
    .option('exchanges-network-config', {
      description: 'Blockchain network config for exchanges',
      choices: Object.keys(exchangesConfigs),
      type: 'string',
      demandOption: true,
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
    .option('sentry-dsn', {
      description: 'Sentry DSN',
      type: 'string',
    })
    .option('sentry-traces-sample-rate', {
      description: 'Sentry traces sample rate',
      type: 'number',
      default: 1.0,
    })
    .epilogue(
      'Always specify arguments as environment variables. Not all arguments are supported as CLI ones yet.',
    ).argv

  return argv
}

async function main() {
  const args = await parseArgs()
  const app = express()

  // The Sentry documentation recommends initializing as early in your app as
  // possible.
  const sentryEnabled = !!args['sentry-dsn']
  if (sentryEnabled) {
    Sentry.init({
      dsn: args['sentry-dsn'],
      integrations: [
        // enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // enable Express.js middleware tracing
        new Tracing.Integrations.Express({ app }),
      ],
      tracesSampleRate: args['sentry-traces-sample-rate'],
    })

    app.use(Sentry.Handlers.requestHandler())
    app.use(Sentry.Handlers.tracingHandler())
  }

  const db = await initDatabase({
    client: 'pg',
    connection: {
      host: args['blockchain-db-host'],
      database: args['blockchain-db-database'],
      user: args['blockchain-db-user'],
      password: args['blockchain-db-pass'],
    },
  })

  const exchangeRateConfig = exchangesConfigs[args['exchanges-network-config']]
  const exchangeRateManager = createNewManager(exchangeRateConfig)

  knownAddressesCache.startListening()
  tokenInfoCache.startListening()

  const exchangeRateAPI = new ExchangeRateAPI({
    exchangeRatesAPIAccessKey: args['exchange-rates-api-access-key'],
  })
  const currencyConversionAPI = new CurrencyConversionAPI({ exchangeRateAPI })
  const pricesService = new PricesService(
    db,
    exchangeRateAPI,
    exchangeRateManager.cUSDTokenAddress,
  )

  app.use(metricsMiddleware)

  // What is this? lol
  app.get('/robots.txt', (_req, res) => {
    res.type('text/plain')
    res.send('User-agent: *\nDisallow: /')
  })

  app.head('/', (_req, res) => {
    // Preventing HEAD requests made by some browsers causing alerts
    // https://github.com/celo-org/celo-monorepo/issues/2189
    res.end()
  })

  app.use('/cron', cronRouter({ db, pricesService, exchangeRateManager }))

  const apolloServer = initApolloServer({
    currencyConversionAPI,
    pricesService,
  })
  await apolloServer.start()
  apolloServer.applyMiddleware({ app, path: GRAPHQL_PATH })

  if (sentryEnabled) {
    // The Sentry error handler must be before any other error middleware and
    // after all controllers
    app.use(Sentry.Handlers.errorHandler())
  }

  app.use(
    (
      error: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({ type: 'UNEXPECTED_ERROR', error })
      res.statusCode = 500
      if (sentryEnabled) {
        res.end((res as any).sentry + '\n')
      }
    },
  )

  app.listen(args.port, () => {
    logger.info(`Listening on port ${args.port}`)
    logger.info(`GraphQL path ${apolloServer.graphqlPath}`)
  })
}

main().catch((error) => {
  logger.error({
    type: 'STARTUP',
    error,
  })
  process.exit(1)
})
