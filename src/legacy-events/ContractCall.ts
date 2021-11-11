import { LegacyTransaction } from '../legacy-transaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacy-transaction/LegacyTransactionType'

export class ContractCall extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return transaction.transfers.isEmpty()
  }

  getEvent(transaction: LegacyTransaction) {
    return
  }

  isAggregatable(): boolean {
    return false
  }
}
