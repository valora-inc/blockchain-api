import { ApolloServer } from 'apollo-server-express'
import { BlockscoutAPI } from './blockscout'
import CurrencyConversionAPI from './currencyConversion/CurrencyConversionAPI'
import { logger } from './logger'
import { resolvers } from './resolvers'
import typeDefs from './schema'

export interface DataSources {
  blockscoutAPI: BlockscoutAPI
  currencyConversionAPI: CurrencyConversionAPI
}

export function initApolloServer({
  currencyConversionAPI,
}: {
  currencyConversionAPI: CurrencyConversionAPI
}) {

  return new ApolloServer({
    typeDefs: typeDefs,
    resolvers,
    dataSources: () => {
      return {
        blockscoutAPI: new BlockscoutAPI(),
        currencyConversionAPI: currencyConversionAPI,
      }
    },
    formatError: (error) => {
      logger.error({
        type: 'UNHANDLED_ERROR',
        error: error?.message,
      })
      return error
    },
  })
}
