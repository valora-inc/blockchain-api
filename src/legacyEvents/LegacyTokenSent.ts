import { LegacyEventBuilder } from '../helpers/LegacyEventBuilder'
import { LegacyEventTypes } from '../resolvers'
import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'

export class LegacyTokenSent extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      transaction.transfers.containsTransferFrom(this.context.userAddress)
    )
  }

  getEvent(transaction: LegacyTransaction) {
    const transfer = transaction.transfers.getTransferFrom(
      this.context.userAddress,
    )

    if (!transfer) {
      throw new Error('Transfer from the user not found.')
    }

    return LegacyEventBuilder.transferEvent(
      transaction,
      transfer,
      LegacyEventTypes.SENT,
      transfer.toAddressHash,
      transfer.toAccountHash,
      transaction.fees,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
