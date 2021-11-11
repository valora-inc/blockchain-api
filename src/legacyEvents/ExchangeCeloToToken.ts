import { LegacyEventBuilder } from '../helpers/LegacyEventBuilder'
import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'
import { Contracts } from '../utils'

export class ExchangeCeloToToken extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return (
      transaction.transfers.length === 2 &&
      transaction.transfers.containsTransferTo(Contracts.Reserve) &&
      transaction.transfers.containsMintedTokenTransfer()
    )
  }

  getEvent(transaction: LegacyTransaction) {
    const inTransfer = transaction.transfers.getTransferTo(Contracts.Reserve)
    const outTransfer = transaction.transfers.getMintedTokenTransfer()

    if (!inTransfer) {
      throw new Error('Transfer to Reserve not found.')
    }

    if (!outTransfer) {
      throw new Error('Minted token transfer not found.')
    }

    return LegacyEventBuilder.exchangeEvent(
      transaction,
      inTransfer,
      outTransfer,
      this.context.tokens,
      transaction.fees,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
