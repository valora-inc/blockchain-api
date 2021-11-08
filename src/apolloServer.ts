import { ApolloServer } from 'apollo-server-express'
import { BlockscoutAPI } from './blockscout'
import { BlockscoutJsonAPI } from './blockscoutJsonApi'
import CurrencyConversionAPI from './currencyConversion/CurrencyConversionAPI'
import { logger } from './logger'
import { resolvers } from './resolvers'
import typeDefs from './schema'

export interface DataSources {
  blockscoutAPI: BlockscoutAPI
  blockscoutJsonAPI: BlockscoutJsonAPI
  currencyConversionAPI: CurrencyConversionAPI
}

export function initApolloServer({
  currencyConversionAPI,
}: {
  currencyConversionAPI: CurrencyConversionAPI
}) {
  return new ApolloServer({
    typeDefs,
    resolvers,
    dataSources: () => {
      return {
        blockscoutAPI: new BlockscoutAPI(),
        blockscoutJsonAPI: new BlockscoutJsonAPI(),
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
