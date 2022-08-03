import { isSwap } from '../transaction/TransfersUtils'
import { EventBuilder } from '../helpers/EventBuilder'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'
import { TokenTransactionTypeV2 } from '../resolvers'

export class SwapTransaction extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length >= 2 &&
      isSwap(transaction.transfers, this.context.userAddress) &&
      transaction.transfers.every((transfer) => {
        return transfer.tokenType === 'ERC-20'
      })
    )
  }

  async getEvent(transaction: Transaction) {
    const inTransfer = transaction.transfers[transaction.transfers.length - 1]
    const outTransfer = transaction.transfers[0]

    if (!inTransfer) {
      throw new Error('Transfer to wallet address not found.')
    }

    if (!outTransfer) {
      throw new Error('Transfer from wallet address not found.')
    }

    return await EventBuilder.exchangeEvent(
      transaction,
      TokenTransactionTypeV2.SWAP_TRANSACTION,
      inTransfer,
      outTransfer,
      transaction.fees,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
