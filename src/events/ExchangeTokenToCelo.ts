import {
  containsTransferTo,
  containsTransferFrom,
  containsBurnedTokenTransfer,
  getTransferTo,
  getTransferFrom,
} from '../transaction/TransfersUtils'
import { EventBuilder } from '../helpers/EventBuilder'
import { Transaction } from '../transaction/Transaction'
import { TransactionType } from '../transaction/TransactionType'
import { Contracts } from '../utils'
import { TokenTransactionTypeV2 } from '../resolvers'


export class ExchangeTokenToCelo extends TransactionType {
  matches(transaction: Transaction): boolean {
    return (
      transaction.transfers.length === 3 &&
      containsTransferFrom(transaction.transfers, Contracts.Reserve) &&
      (containsTransferTo(transaction.transfers, Contracts.Exchange) ||
        containsTransferTo(transaction.transfers, Contracts.ExchangeEUR) ||
        containsTransferTo(transaction.transfers, Contracts.ExchangeBRL)) &&
      containsBurnedTokenTransfer(transaction.transfers)
    )
  }

  async getEvent(transaction: Transaction) {
    const inTransfer =
      getTransferTo(transaction.transfers, Contracts.Exchange) ??
      getTransferTo(transaction.transfers, Contracts.ExchangeEUR) ??
      getTransferTo(transaction.transfers, Contracts.ExchangeBRL)
    const outTransfer = getTransferFrom(
      transaction.transfers,
      Contracts.Reserve,
    )

    if (!inTransfer) {
      throw new Error('Transfer to Exchange not found.')
    }

    if (!outTransfer) {
      throw new Error('Transfer from Reserve not found.')
    }

    return await EventBuilder.exchangeEvent(
      transaction,
      TokenTransactionTypeV2.EXCHANGE,
      inTransfer,
      outTransfer,
      transaction.fees,
    )
  }

  isAggregatable(): boolean {
    return false
  }
}
