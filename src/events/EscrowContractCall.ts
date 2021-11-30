import { Transaction } from '../Transaction/Transaction'
import { TransactionType } from '../Transaction/TransactionType'
import { Contracts } from '../utils'

export class EscrowContractCall extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.isEmpty() &&
      transaction.input.hasContractCallTo(Contracts.Escrow)
    )
  }

  getEvent(transaction: Transaction) {
    return
  }

  isAggregatable(): boolean {
    return true
  }
}
