import {
  containsTransferTo,
  getTransferTo,
} from '../transaction/TransfersUtils'
import { EventBuilder } from '../helpers/EventBuilder'
import { TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'
import { Contracts } from '../utils'

export class EscrowSent extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      containsTransferTo(transaction.transfers, Contracts.Escrow)
    )
  }

  async getEvent(transaction: Transaction) {
    const transfer = getTransferTo(transaction.transfers, Contracts.Escrow)

    if (!transfer) {
      throw new Error('Transfer to Escrow not found.')
    }

    return await EventBuilder.transferEvent(
      transaction,
      transfer,
      TokenTransactionTypeV2.INVITE_SENT,
      transfer.toAddressHash,
      transfer.toAccountHash,
      transaction.fees,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
