import {
  containsTransferFrom,
  getTransferFrom,
} from '../transaction/TransfersUtils'
import { EventBuilder } from '../helpers/EventBuilder'
import { TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class TokenSent extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 1 &&
      containsTransferFrom(transaction.transfers, this.context.userAddress)
    )
  }

  async getEvent(transaction: Transaction) {
    const transfer = getTransferFrom(
      transaction.transfers,
      this.context.userAddress,
    )

    if (!transfer) {
      throw new Error('Transfer from the user not found.')
    }

    return await EventBuilder.transferEvent(
      transaction,
      transfer,
      TokenTransactionTypeV2.SENT,
      transfer.toAddressHash,
      transfer.toAccountHash,
      transaction.fees,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
