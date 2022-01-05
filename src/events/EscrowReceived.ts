import {
  getTransferFrom,
  containsTransferFrom,
} from '../transaction/TransfersUtils'
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
    const transfer = getTransferFrom(transaction.transfers, Contracts.Escrow)

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
      containsTransferFrom(transaction.transfers, Contracts.Escrow)
    )
  }

  isEscrowReceivedToMTW(transaction: Transaction): boolean {
    const transferToAcccount = getTransferFrom(
      transaction.transfers,
      Contracts.Escrow,
    )!
    const transfertoWallet = getTransferFrom(
      transaction.transfers,
      transferToAcccount?.toAddressHash,
    )
    return (
      transaction.transfers.length === 2 &&
      containsTransferFrom(transaction.transfers, Contracts.Escrow) &&
      transfertoWallet?.fromAddressHash === transferToAcccount?.toAddressHash &&
      transfertoWallet?.toAccountHash === transfertoWallet?.fromAddressHash
    )
  }
}
