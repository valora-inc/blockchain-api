import { EventBuilder } from '../helpers/EventBuilder'
import { EventTypes, TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../Transaction/Transaction'
import { TransactionType } from '../Transaction/TransactionType'
import { Contracts } from '../utils'

export class EscrowReceived extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      this.isEscrowReceivedToEOA(transaction) ||
      this.isEscrowReceivedToMTW(transaction)
    )
  }

  getEvent(transaction: Transaction) {
    const transfer = transaction.transfers.getTransferFrom(Contracts.Escrow)

    if (!transfer) {
      throw new Error('Transfer from Escrow not found.')
    }

    return EventBuilder.transferEvent(
      transaction,
      transfer,
      TokenTransactionTypeV2.RECEIVED,
      transfer.fromAddressHash,
      transfer.fromAccountHash,
    )
  }

  isAggregatable(): boolean {
    return false
  }

  isEscrowReceivedToEOA(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      transaction.transfers.containsTransferFrom(Contracts.Escrow)
    )
  }

  isEscrowReceivedToMTW(transaction: Transaction): boolean {
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
