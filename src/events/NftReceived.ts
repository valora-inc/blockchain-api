import { EventBuilder } from '../helpers/EventBuilder'
import { TokenTransactionTypeV2 } from '../resolvers'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'

export class NftReceived extends TransactionType {
  matches(transaction: Transaction): boolean {
    let isNftReceived = false
    let cntNftSentTransfer = 0
    let cntNftReceivedTransfer = 0

    for (const transfer of transaction.transfers) {
      if (transfer.tokenType === 'ERC-721') {
        if (transfer.toAddressHash === this.context.userAddress) {
          cntNftReceivedTransfer++
          isNftReceived = true
        }

        if (transfer.fromAddressHash === this.context.userAddress) {
          cntNftSentTransfer++
          isNftReceived = false
        }
      }
    }

    return (
      transaction.transfers.length >= 1 &&
      cntNftSentTransfer + cntNftReceivedTransfer > 0 &&
      (cntNftSentTransfer == cntNftReceivedTransfer
        ? isNftReceived
        : cntNftSentTransfer < cntNftReceivedTransfer)
    )
  }

  async getEvent(transaction: Transaction) {
    return await EventBuilder.nftTransferEvent(
      transaction,
      TokenTransactionTypeV2.NFT_RECEIVED,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
