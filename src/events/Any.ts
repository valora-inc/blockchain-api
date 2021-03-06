import { metrics } from '../metrics'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class Any extends TransactionType {
  matches(transaction: Transaction): boolean {
    return true
  }

  async getEvent(transaction: Transaction) {
    metrics.unknownTransaction()
    throw new Error('Unknown transaction type')
  }

  isAggregatable(): boolean {
    return false
  }
}
