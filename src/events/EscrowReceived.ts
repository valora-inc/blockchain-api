import { EventBuilder } from '../helpers/EventBuilder'
import { TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'
import { Contracts } from '../utils'

export class EscrowReceived extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      this.isEscrowReceivedToEOA(transaction) ||
      this.isEscrowReceivedToMTW(transaction)
    )
  }

  async getEvent(transaction: Transaction) {
    const transfer = transaction.transfers.getTransferFrom(Contracts.Escrow)

    if (!transfer) {
      throw new Error('Transfer from Escrow not found.')
    }

    return await EventBuilder.transferEvent(
      transaction,
      transfer,
      TokenTransactionTypeV2.INVITE_RECEIVED,
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
