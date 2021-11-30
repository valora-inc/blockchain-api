<<<<<<< HEAD:src/events/EscrowReceived.ts
import { EventBuilder } from '../helpers/EventBuilder'
import { EventTypes, TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'
=======
import { LegacyEventBuilder } from '../helpers/LegacyEventBuilder'
import { LegacyEventTypes } from '../resolvers'
import { LegacyTransaction } from '../legacyTransaction/LegacyTransaction'
import { LegacyTransactionType } from '../legacyTransaction/LegacyTransactionType'
>>>>>>> main:src/legacyEvents/EscrowReceived.ts
import { Contracts } from '../utils'

export class EscrowReceived extends LegacyTransactionType {
  matches(transaction: LegacyTransaction): boolean {
    return (
      this.isEscrowReceivedToEOA(transaction) ||
      this.isEscrowReceivedToMTW(transaction)
    )
  }

  getEvent(transaction: LegacyTransaction) {
    const transfer = transaction.transfers.getTransferFrom(Contracts.Escrow)

    if (!transfer) {
      throw new Error('Transfer from Escrow not found.')
    }

    return LegacyEventBuilder.transferEvent(
      transaction,
      transfer,
<<<<<<< HEAD:src/events/EscrowReceived.ts
      TokenTransactionTypeV2.RECEIVED,
=======
      LegacyEventTypes.ESCROW_RECEIVED,
>>>>>>> main:src/legacyEvents/EscrowReceived.ts
      transfer.fromAddressHash,
      transfer.fromAccountHash,
    )
  }

  isAggregatable(): boolean {
    return false
  }

  isEscrowReceivedToEOA(transaction: LegacyTransaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      transaction.transfers.containsTransferFrom(Contracts.Escrow)
    )
  }

  isEscrowReceivedToMTW(transaction: LegacyTransaction): boolean {
    const transferToAcccount = transaction.transfers.getTransferFrom(
      Contracts.Escrow,
    )!
    const transfertoWallet = transaction.transfers.getTransferFrom(
      transferToAcccount?.toAddressHash,
    )
    return (
      transaction.transfers.length === 2 &&
      transaction.transfers.containsTransferFrom(Contracts.Escrow) &&
      transfertoWallet?.fromAddressHash === transferToAcccount?.toAddressHash &&
      transfertoWallet?.toAccountHash === transfertoWallet?.fromAddressHash
    )
  }
}
