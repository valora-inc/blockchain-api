import { metrics } from '../metrics'
import { LegacyTransaction } from '../legacy-transaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacy-transaction/LegacyTransactionType'

export class Any extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return true
  }

  getEvent(transaction: LegacyTransaction) {
    metrics.unknownTransaction()
    throw new Error('Unknown transaction type')
  }

  isAggregatable(): boolean {
    return false
  }
}
