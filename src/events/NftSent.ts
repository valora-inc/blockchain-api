import { EventBuilder } from '../helpers/EventBuilder'
import { TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class NftSent extends TransactionType {
  matches(transaction: Transaction): boolean {
    let isNftExist = false
    let isNftSent = false
    let userAddress = this.context.userAddress

    for (const transfer of transaction.transfers) {
      if (transfer.tokenType === 'ERC-721') {
        isNftExist = true

        if (transfer.toAddressHash === userAddress) {
          isNftSent = false
        }

        if (transfer.fromAddressHash === userAddress) {
          isNftSent = true
        }
      }
    }

    return transaction.transfers.length >= 1 && isNftExist && isNftSent
  }

  async getEvent(transaction: Transaction) {
    return await EventBuilder.nftTransferEvent(
      transaction,
      TokenTransactionTypeV2.NFT_SENT,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
