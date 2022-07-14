import { EventBuilder } from '../helpers/EventBuilder'
import { TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class NFTsTransaction extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length >= 1 && 
      transaction.transfers.some((transfer) => {
        return transfer.tokenType === 'ERC-721';
      })
    )
  }

  async getEvent(transaction: Transaction) {
    return await EventBuilder.nftTransferEvent(
      transaction,
      TokenTransactionTypeV2.NFT_TRANSACTION,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}