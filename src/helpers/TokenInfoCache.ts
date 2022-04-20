import { logger } from '../logger'
import { listenFromFirebase } from './FirebaseListener'

const ROOT_KEY = 'tokensInfo'

export interface TokenInfo {
  address: string
  decimals: number
  imageUrl: string
  name: string
  symbol: string
  priceFetchedAt?: number
  isCoreToken?: boolean
  pegTo?: string
}

interface TokensInfo {
  [address: string]: TokenInfo
}

class TokenInfoCache {
  private tokensInfo: TokensInfo = {}

  startListening(): void {
    logger.info({ type: 'START_FETCHING_TOKENS_INFO' })
    listenFromFirebase(ROOT_KEY, (value: TokensInfo) => {
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

  getTokensAddresses() {
    return Object.keys(this.tokensInfo)
  }

  getTokensInfo() {
    return Object.values(this.tokensInfo)
  }
}

const tokenInfoCache = new TokenInfoCache()
export default tokenInfoCache
