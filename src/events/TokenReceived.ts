import { EventBuilder } from '../helpers/EventBuilder'
import { TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class TokenReceived extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      transaction.transfers.containsTransferTo(this.context.userAddress)
    )
  }

  async getEvent(transaction: Transaction) {
    const transfer = transaction.transfers.getTransferTo(
      this.context.userAddress,
    )

    if (!transfer) {
      throw new Error('Transfer to the user not found.')
    }

    return await EventBuilder.transferEvent(
      transaction,
      transfer,
      TokenTransactionTypeV2.RECEIVED,
      transfer.fromAddressHash,
      transfer.fromAccountHash,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
