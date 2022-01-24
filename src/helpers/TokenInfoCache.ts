import { logger } from '../logger'
import { listenFromFirebase } from './FirebaseListener'

const ROOT_KEY = 'tokensInfo'

interface TokenInfo {
  address: string
  decimals: number
  imageUrl: string
  name: string
  symbol: string
  priceFetchedAt?: number
  isCoreToken?: boolean
}

interface TokensInfo {
  [address: string]: TokenInfo
}

class TokenInfoCache {
  private tokensInfo: TokensInfo = {}

  startListening(): void {
    listenFromFirebase(ROOT_KEY, (value: TokensInfo) => {
      logger.info({ type: 'FETCHED_TOKENS_INFO' })
      this.tokensInfo = value ?? this.tokensInfo
    })
  }

  getDecimalsForToken(address: string): number {
    address = address.toLowerCase()
    return this.tokensInfo[address]?.decimals
  }

  tokenInfoBySymbol(symbol: string): TokenInfo | undefined {
    return Object.values(this.tokensInfo).find(
      (token) => token.symbol === symbol,
    )
  }
}

const tokenInfoCache = new TokenInfoCache()
export default tokenInfoCache
