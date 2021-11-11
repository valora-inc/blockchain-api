import { LegacyTransaction } from '../legacy-transaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacy-transaction/LegacyTransactionType'
import { Contracts } from '../utils'

export class ExchangeContractCall extends LegacyTransactionType {
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
