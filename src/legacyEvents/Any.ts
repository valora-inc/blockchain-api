import { metrics } from '../metrics'
import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'

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
