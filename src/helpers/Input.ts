import { getContractAddressesOrError } from '../utils'
import { Contracts } from '../utils'
import utf8 from 'utf8'
import coder from 'web3-eth-abi'
import { logger } from '../logger'

const TRANSFER_WITH_COMMENT = '0xe1d6aceb'
const REGISTER_ACCOUNT_DEK = '0x90b12b47'

export class Input {
  static fromString(inputString: string): Input {
    if (!inputString || inputString.length < 10) {
      return new Input()
    }

    return new Input(inputString.slice(0, 10), '0x' + inputString.slice(10))
  }

  functionSelector: string
  data: string

  private constructor(functionSelector: string = '', data: string = '') {
    this.functionSelector = functionSelector
    this.data = data
  }

  decode(abi: string[]): string[] | undefined {
    if (!this.data) {
      return
    }

    try {
      return coder.decodeParameters(abi, this.data)
    } catch (error) {
      logger.warn({
        type: 'INPUT_DECODE_ERROR',
        error,
      })
      return
    }
  }

  isTransferWithComment(): boolean {
    return this.functionSelector === TRANSFER_WITH_COMMENT
  }

  isAccountDekRegistration(): boolean {
    return this.functionSelector === REGISTER_ACCOUNT_DEK
  }

  getTransactionComment(): string {
    if (!this.isTransferWithComment()) {
      return ''
    }

    const decodedInput = this.decode(['address', 'uint256', 'string'])
    return decodedInput ? utf8.decode(decodedInput[2]) : ''
  }

  hasContractCallTo(contract: Contracts): boolean {
    const decodedInput = this.decode(['address', 'uint256'])

    if (!decodedInput) {
      return false
    }

    return (
      decodedInput[0].toLowerCase() === getContractAddressesOrError()[contract]
    )
  }

  registersAccountDek(account: string): boolean {
    if (!this.isAccountDekRegistration()) {
      return false
    }

    const decodedInput = this.decode(['uint256', 'uint256', 'address'])

    if (!decodedInput) {
      return false
    }

    return decodedInput[2].toLowerCase() === account
  }
}
