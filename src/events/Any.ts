import { metrics } from '../metrics'
import { Transaction } from '../Transaction/Transaction'
import { TransactionType } from '../Transaction/TransactionType'

export class Any extends TransactionType {
  matches(transaction: Transaction): boolean {
    return true
  }

  getEvent(transaction: Transaction) {
    metrics.unknownTransaction()
    throw new Error('Unknown transaction type')
  }

  isAggregatable(): boolean {
    return false
  }
}
