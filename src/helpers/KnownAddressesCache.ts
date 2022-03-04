import { logger } from '../logger'
import { listenFromFirebase } from './FirebaseListener'

const ROOT_KEY = 'addressesExtraInfo'

export interface DisplayInfo {
  name?: string
  imageUrl?: string
}

interface KnownAddresses {
  [address: string]: DisplayInfo | undefined
}

class KnownAddressesCache {
  private knownAddresses: KnownAddresses = {}

  startListening(): void {
    logger.info({ type: 'START_FETCHING_KNOWN_ADDRESSES' })
    listenFromFirebase(ROOT_KEY, (value: KnownAddresses) => {
      this.knownAddresses = value ?? this.knownAddresses
    })
  }

  getDisplayInfoFor(address: string): DisplayInfo {
    return this.knownAddresses[address] ?? {}
  }
}

export const knownAddressesCache = new KnownAddressesCache()
export default knownAddressesCache
