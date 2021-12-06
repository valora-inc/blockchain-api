import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class ContractCall extends TransactionType {
  matches(transaction: Transaction): boolean {
    return transaction.transfers.isEmpty()
  }

  async getEvent(transaction: Transaction) {
    return
  }

  isAggregatable(): boolean {
    return false
  }
}
