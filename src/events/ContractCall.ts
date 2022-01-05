import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class ContractCall extends TransactionType {
  matches(transaction: Transaction): boolean {
    return transaction.transfers.length === 0
  }

  async getEvent(transaction: Transaction) {
    return
  }

  isAggregatable(): boolean {
    return false
  }
}
