import {
  containsMintedTokenTransfer,
  containsTransferTo,
  getMintedTokenTransfer,
  getTransferTo,
} from '../transaction/TransfersUtils'
import { EventBuilder } from '../helpers/EventBuilder'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'
import { Contracts } from '../utils'

export class ExchangeCeloToToken extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 2 &&
      containsTransferTo(transaction.transfers, Contracts.Reserve) &&
      containsMintedTokenTransfer(transaction.transfers)
    )
  }

  async getEvent(transaction: Transaction) {
    const inTransfer = getTransferTo(transaction.transfers, Contracts.Reserve)
    const outTransfer = getMintedTokenTransfer(transaction.transfers)

    if (!inTransfer) {
      throw new Error('Transfer to Reserve not found.')
    }

    if (!outTransfer) {
      throw new Error('Minted token transfer not found.')
    }

    return await EventBuilder.exchangeEvent(
      transaction,
      inTransfer,
      outTransfer,
      transaction.fees,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
