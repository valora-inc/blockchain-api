import { LegacyTransaction } from '../legacy-transaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacy-transaction/LegacyTransactionType'
import { Contracts } from '../utils'

export class EscrowContractCall extends LegacyTransactionType {
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
