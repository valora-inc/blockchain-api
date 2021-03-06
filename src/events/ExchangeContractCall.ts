import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'
import { Contracts } from '../utils'

export class ExchangeContractCall extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 0 &&
      (transaction.input.hasContractCallTo(Contracts.Exchange) ||
        transaction.input.hasContractCallTo(Contracts.ExchangeEUR) ||
        transaction.input.hasContractCallTo(Contracts.ExchangeBRL))
    )
  }

  async getEvent(transaction: Transaction) {
    return
  }

  isAggregatable(): boolean {
    return true
  }
}
