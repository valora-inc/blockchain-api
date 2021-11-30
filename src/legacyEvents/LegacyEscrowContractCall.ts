import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'
import { Contracts } from '../utils'

export class LegacyEscrowContractCall extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return (
      transaction.transfers.isEmpty() &&
      transaction.input.hasContractCallTo(Contracts.Escrow)
    )
  }

  getEvent(transaction: LegacyTransaction) {
    return
  }

  isAggregatable(): boolean {
    return true
  }
}
