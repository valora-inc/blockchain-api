import { Transaction } from '../Transaction/Transaction'
import { TransactionType } from '../Transaction/TransactionType'

export class ContractCall extends TransactionType {
  matches(transaction: Transaction): boolean {
    return transaction.transfers.isEmpty()
  }

  getEvent(transaction: Transaction) {
    return
  }

  isAggregatable(): boolean {
    return false
  }
}
