import { EventBuilder } from '../helpers/EventBuilder'
import { EventTypes } from '../resolvers'
import { Transaction } from '../Transaction/Transaction'
import { TransactionType } from '../Transaction/TransactionType'

export class TokenSent extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      transaction.transfers.containsTransferFrom(this.context.userAddress)
    )
  }

  getEvent(transaction: Transaction) {
    const transfer = transaction.transfers.getTransferFrom(
      this.context.userAddress,
    )

    if (!transfer) {
      throw new Error('Transfer from the user not found.')
    }

    return EventBuilder.transferEvent(
      transaction,
      transfer,
      EventTypes.SENT,
      transfer.toAddressHash,
      transfer.toAccountHash,
      transaction.fees,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
