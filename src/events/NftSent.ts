import { EventBuilder } from '../helpers/EventBuilder'
import { TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class NftSent extends TransactionType {
  matches(transaction: Transaction): boolean {
    let isNftSent = false
    let cntNftSent = 0
    let cntNftReceived = 0

    for (const transfer of transaction.transfers) {
      if (transfer.tokenType === 'ERC-721') {
        if (transfer.toAddressHash === this.context.userAddress) {
          cntNftReceived++;
          isNftSent = false
        }

        if (transfer.fromAddressHash === this.context.userAddress) {
          cntNftSent++;
          isNftSent = true
        }
      }
    }

    return transaction.transfers.length >= 1 && (cntNftSent + cntNftReceived > 0) && (cntNftSent == cntNftReceived ? isNftSent : cntNftSent > cntNftReceived)
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
