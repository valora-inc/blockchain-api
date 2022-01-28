import { RESTDataSource } from 'apollo-datasource-rest'
import { BLOCKSCOUT_API } from './config'
import { logger } from './logger'
import { UserTokenBalance } from './resolvers'

interface BlockscoutTokenBalance {
  balance: string
  contractAddress: string
  decimals: string
  name: string
  symbol: string
  type: string
}

export class BlockscoutJsonAPI extends RESTDataSource {
  constructor() {
    super()
    this.baseURL = `${BLOCKSCOUT_API}/api`
  }

  async queryBlockscoutWithRetry(path: string) {
    for (let i = 0; i < 3; i++) {
      try {
        return await this.get(path)
      } catch (error) {
        logger.warn({
          type: 'BLOCKSCOUT_JSON_QUERY_FAILED',
          try: i,
        })
      }
    }
    throw new Error('Error querying Blockscout after 3 retries')
  }

  async fetchUserBalances(address: string): Promise<UserTokenBalance[]> {
    const response = await this.queryBlockscoutWithRetry(
      `?module=account&action=tokenlist&address=${address}`,
    )
    return response.result.map((row: BlockscoutTokenBalance) => ({
      tokenAddress: row.contractAddress,
      balance: row.balance,
      decimals: row.decimals,
      symbol: row.symbol,
    }))
  }
}
