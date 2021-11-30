import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'

export class LegacyContractCall extends LegacyTransactionType {
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
