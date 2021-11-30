import { LegacyEventBuilder } from '../helpers/LegacyEventBuilder'
import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'
import { Contracts } from '../utils'

export class LegacyExchangeTokenToCelo extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return (
      transaction.transfers.length === 3 &&
      transaction.transfers.containsTransferFrom(Contracts.Reserve) &&
      (transaction.transfers.containsTransferTo(Contracts.Exchange) ||
        transaction.transfers.containsTransferTo(Contracts.ExchangeEUR)) &&
      transaction.transfers.containsBurnedTokenTransfer()
    )
  }

  getEvent(transaction: LegacyTransaction) {
    const inTransfer =
      transaction.transfers.getTransferTo(Contracts.Exchange) ??
      transaction.transfers.getTransferTo(Contracts.ExchangeEUR)
    const outTransfer = transaction.transfers.getTransferFrom(Contracts.Reserve)

    if (!inTransfer) {
      throw new Error('Transfer to Exchange not found.')
    }

    if (!outTransfer) {
      throw new Error('Transfer from Reserve not found.')
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
