import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'
import { Contracts } from '../utils'

export class EscrowContractCall extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 0 &&
      transaction.input.hasContractCallTo(Contracts.Escrow)
    )
  }

  async getEvent(transaction: Transaction) {
    return
  }

  isAggregatable(): boolean {
    return true
  }
}
