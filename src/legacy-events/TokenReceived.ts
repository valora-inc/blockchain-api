import { LegacyEventBuilder } from '../helpers/LegacyEventBuilder'
import { LegacyEventTypes } from '../resolvers'
import { LegacyTransaction } from '../legacy-transaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacy-transaction/LegacyTransactionType'

export class TokenReceived extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      transaction.transfers.containsTransferTo(this.context.userAddress)
    )
  }

  getEvent(transaction: LegacyTransaction) {
    const transfer = transaction.transfers.getTransferTo(
      this.context.userAddress,
    )

    if (!transfer) {
      throw new Error('Transfer to the user not found.')
    }

    return LegacyEventBuilder.transferEvent(
      transaction,
      transfer,
      LegacyEventTypes.RECEIVED,
      transfer.fromAddressHash,
      transfer.fromAccountHash,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
