import { BigNumber } from 'bignumber.js'
import { BlockscoutTokenTransfer } from '../blockscout'
import {
  EventTypes,
  Fee as FormattedFee,
  TokenTransactionTypeV2,
} from '../resolvers'
import { Fee, Transaction } from '../transaction/Transaction'
import { WEI_PER_GOLD } from '../utils'
import knownAddressesCache from './KnownAddressesCache'

export class EventBuilder {
  static transferEvent(
    transaction: Transaction,
    transfer: BlockscoutTokenTransfer,
    eventType: TokenTransactionTypeV2,
    address: string,
    account?: string,
    fees?: Fee[],
  ) {
    const transactionHash = transaction.transactionHash
    const block = transaction.blockNumber
    const timestamp = transaction.timestamp
    const comment = transaction.comment

    const isOutgoingTransaction = fees !== undefined && fees.length > 0

    const { name, imageUrl } = knownAddressesCache.getDisplayInfoFor(address)

    return {
      type: eventType,
      timestamp,
      block,
      transactionHash,
      address,
      account: account ? account : address,
      amount: {
        // Signed amount relative to the account currency
        value: new BigNumber(transfer.value)
          .multipliedBy(isOutgoingTransaction ? -1 : 1)
          .dividedBy(WEI_PER_GOLD)
          .toString(),
        tokenAddress: transfer.tokenAddress,
        timestamp,
      },
      metadata: {
        comment,
        title: name,
        image: imageUrl,
      },
      ...(fees && {
        fees: EventBuilder.formatFees(fees, transaction.timestamp),
      }),
    }
  }

  static exchangeEvent(
    transaction: Transaction,
    inTransfer: BlockscoutTokenTransfer,
    outTransfer: BlockscoutTokenTransfer,
    fees?: Fee[],
  ) {
    const transactionHash = transaction.transactionHash
    const block = transaction.blockNumber
    const timestamp = transaction.timestamp

    return {
      type: EventTypes.EXCHANGE,
      timestamp,
      block,
      transactionHash,
      inAmount: {
        value: new BigNumber(inTransfer!.value)
          .dividedBy(WEI_PER_GOLD)
          .toString(),
        tokenAddress: inTransfer.tokenAddress,
        timestamp,
      },
      outAmount: {
        value: new BigNumber(outTransfer!.value)
          .dividedBy(WEI_PER_GOLD)
          .toString(),
        tokenAddress: outTransfer.tokenAddress,
        timestamp,
      },
      ...(fees && {
        fees: EventBuilder.formatFees(fees, transaction.timestamp),
      }),
    }
  }

  static formatFees(fees: Fee[], timestamp: number): FormattedFee[] {
    return fees.map((fee) => ({
      type: fee.type,
      amount: {
        currencyCode: fee.currencyCode,
        timestamp,
        value: fee.value.dividedBy(WEI_PER_GOLD).toFixed(),
      },
    }))
  }
}
