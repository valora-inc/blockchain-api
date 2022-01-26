import { RESTDataSource } from 'apollo-datasource-rest'
import { BLOCKSCOUT_API } from './config'
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

  async fetchUserBalances(address: string): Promise<UserTokenBalance[]> {
    const response = await this.get(
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
