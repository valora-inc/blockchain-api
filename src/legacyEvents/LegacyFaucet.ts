import { LegacyEventBuilder } from '../helpers/LegacyEventBuilder'
import { LegacyEventTypes } from '../resolvers'
import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'

export class LegacyFaucet extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      transaction.transfers.containsFaucetTransfer()
    )
  }

  getEvent(transaction: LegacyTransaction) {
    const transfer = transaction.transfers.getFaucetTransfer()

    if (!transfer) {
      throw new Error('Transfer from faucet not found.')
    }

    return LegacyEventBuilder.transferEvent(
      transaction,
      transfer,
      LegacyEventTypes.FAUCET,
      transfer.fromAddressHash,
      transfer.fromAccountHash,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
