import { BigNumber } from 'bignumber.js'
import { Input } from '../helpers/Input'
import { BlockscoutTokenTransfer, BlockscoutTransferTx } from '../blockscout'
import { CELO } from '../currencyConversion/consts'
import { FeeType } from '../resolvers'
import { Contracts } from '../utils'
import { popTransferTo } from './TransfersUtils'

export interface Fee {
  type: FeeType
  value: BigNumber
  currencyCode: string
}

export class Transaction {
  get transactionHash(): string {
    return this.blockscoutTx.transactionHash
  }

  get blockNumber(): string {
    return new BigNumber(this.blockscoutTx.blockNumber).toFixed()
  }

  get timestamp(): number {
    return new Date(this.blockscoutTx.timestamp).getTime()
  }

  get comment(): string {
    return this.input.getTransactionComment()
  }

  get transfers(): BlockscoutTokenTransfer[] {
    return this.tokenTransfers
  }

  get fees(): Fee[] {
    return this.transactionFees
  }

  get input(): Input {
    return this.txInput
  }

  private blockscoutTx: BlockscoutTransferTx
  private tokenTransfers: BlockscoutTokenTransfer[]
  private transactionFees: Fee[] = []
  private txInput: Input

  constructor(
    blockscoutTx: BlockscoutTransferTx,
    tokenTransfers: BlockscoutTokenTransfer[],
  ) {
    this.blockscoutTx = blockscoutTx
    this.tokenTransfers = tokenTransfers
    this.txInput = Input.fromString(blockscoutTx.input)

    this.extractFees()
  }

  addFee(newFee: Fee): void {
    const feeTypes = this.fees.map((fee) => fee.type)
    const existingFeeTypeIndex = feeTypes.findIndex(
      (type) => type === newFee.type,
    )

    if (existingFeeTypeIndex !== -1) {
      const existingFee = this.fees[existingFeeTypeIndex]
      existingFee.value = existingFee.value.plus(newFee.value)
    } else {
      this.fees.push(newFee)
    }
  }

  isCeloTransaction(): boolean {
    return !this.blockscoutTx.feeToken || this.blockscoutTx.feeToken === CELO
  }

  private hasGatewayRecipient(): boolean {
    return (
      this.blockscoutTx.gatewayFeeRecipient !== null &&
      this.blockscoutTx.gatewayFeeRecipient !== undefined
    )
  }

  // Order of fee extraction is important, as fee transfers get removed from the array
  // of transfers as they are being extracted:
  // 1 - gateway fee (if exists)
  // 2 - security fee (transfer to validator and then transfer to governance)
  private extractFees(): void {
    if (this.hasGatewayRecipient()) {
      this.calculateGatewayFee()
    }
    this.calculateSecurityFee()
    this.validateFeesSumUp()
  }

  private validateFeesSumUp() {
    let totalFee = new BigNumber(0)
    this.transactionFees.forEach((fee) => {
      totalFee = totalFee.plus(new BigNumber(fee.value))
    })

    const gasFee = new BigNumber(this.blockscoutTx.gasUsed).multipliedBy(
      this.blockscoutTx.gasPrice,
    )
    const gatewayFee = new BigNumber(this.blockscoutTx.gatewayFee || 0)
    const expectedTotalFee = gasFee.plus(gatewayFee)

    // Make sure our assertion is correct
    if (!totalFee.isEqualTo(expectedTotalFee)) {
      // If this is raised, something is wrong with our assertion
      throw new Error(
        `Fee transfers don't add up for tx ${this.blockscoutTx.transactionHash}`,
      )
    }
  }

  private calculateSecurityFee(): void {
    // Non-native transactions have additional transfers to a validator
    // and the Governance smart contract on the list of transfers
    // but their sum also equals to gasPrice * gasUsed
    if (!this.isCeloTransaction()) {
      // transfer to validator should be the last one
      this.tokenTransfers.pop()
      popTransferTo(this.tokenTransfers, Contracts.Governance)
    }

    this.transactionFees.push({
      type: FeeType.SECURITY_FEE,
      value: new BigNumber(this.blockscoutTx.gasPrice).multipliedBy(
        this.blockscoutTx.gasUsed,
      ),
      currencyCode: this.isCeloTransaction()
        ? CELO
        : this.blockscoutTx.feeToken,
    })
  }

  private calculateGatewayFee(): void {
    // Non-native transactions have an additional transfer to the
    // gateway fee recipient on the list of transfers
    // but it's value is also recorded in gatewayFee
    if (!this.isCeloTransaction()) {
      // it's the last transfer on the list
      popTransferTo(this.tokenTransfers, this.blockscoutTx.gatewayFeeRecipient)
    }

    this.transactionFees.push({
      type: FeeType.GATEWAY_FEE,
      value: new BigNumber(this.blockscoutTx.gatewayFee),
      currencyCode: this.isCeloTransaction()
        ? CELO
        : this.blockscoutTx.feeToken,
    })
  }
}
