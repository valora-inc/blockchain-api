import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'
import { Contracts } from '../utils'

export class LegacyExchangeContractCall extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return (
      transaction.transfers.isEmpty() &&
      (transaction.input.hasContractCallTo(Contracts.Exchange) ||
        transaction.input.hasContractCallTo(Contracts.ExchangeEUR))
    )
  }

  getEvent(transaction: LegacyTransaction) {
    return
  }

  isAggregatable(): boolean {
    return true
  }
}
