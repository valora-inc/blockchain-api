import { Transaction } from '../Transaction/Transaction'
import { TransactionType } from '../Transaction/TransactionType'
import { Contracts } from '../utils'

export class ExchangeContractCall extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.isEmpty() &&
      (transaction.input.hasContractCallTo(Contracts.Exchange) ||
        transaction.input.hasContractCallTo(Contracts.ExchangeEUR))
    )
  }

  getEvent(transaction: Transaction) {
    return
  }

  isAggregatable(): boolean {
    return true
  }
}
