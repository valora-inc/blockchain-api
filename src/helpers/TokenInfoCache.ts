import { getContractKit } from '../utils'
import erc20 from '../abis/ERC20.json'

interface DecimalsByAddress {
  [address: string]: number
}

class TokenInfoCache {
  private decimalsByAddress: DecimalsByAddress = {}

  async getDecimalsForToken(address: string): Promise<number> {
    address = address.toLowerCase()
    if (!this.decimalsByAddress[address]) {
      this.decimalsByAddress[address] = await this.getDecimalsFromContract(
        address,
      )
    }
    return this.decimalsByAddress[address]
  }

  private async getDecimalsFromContract(address: string): Promise<number> {
    const kit = await getContractKit()
    // @ts-ignore
    const contract = new kit.web3.eth.Contract(erc20, address)
    return contract.methods.decimals().call()
  }
}

const tokenInfoCache = new TokenInfoCache()
export default tokenInfoCache
