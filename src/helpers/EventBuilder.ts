import { BigNumber } from 'bignumber.js'
import { BlockscoutTokenTransfer } from '../blockscout'
import { EventTypes, FeeV2, TokenTransactionTypeV2 } from '../resolvers'
import { Fee, Transaction } from '../transaction/Transaction'
import { ContractAddresses, getContractAddresses, WEI_PER_GOLD } from '../utils'
import knownAddressesCache from './KnownAddressesCache'
import tokenInfoCache from './TokenInfoCache'

export class EventBuilder {
  static contractAddresses: ContractAddresses

  static async loadContractAddresses() {
    EventBuilder.contractAddresses = await getContractAddresses()
  }

  static async transferEvent(
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
          .dividedBy(this.getWeiForToken(transfer.tokenAddress))
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
        fees: await EventBuilder.formatFees(fees, transaction.timestamp),
      }),
    }
  }

  static async exchangeEvent(
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
          .dividedBy(this.getWeiForToken(inTransfer.tokenAddress))
          .toString(),
        tokenAddress: inTransfer.tokenAddress,
        timestamp,
      },
      outAmount: {
        value: new BigNumber(outTransfer!.value)
          .dividedBy(this.getWeiForToken(outTransfer.tokenAddress))
          .toString(),
        tokenAddress: outTransfer.tokenAddress,
        timestamp,
      },
      ...(fees && {
        fees: await EventBuilder.formatFees(fees, transaction.timestamp),
      }),
    }
  }

  static async formatFees(fees: Fee[], timestamp: number): Promise<FeeV2[]> {
    return await Promise.all(
      fees.map(async (fee) => ({
        type: fee.type,
        amount: {
          tokenAddress: tokenInfoCache.tokenInfoBySymbol(fee.currencyCode)!
            .address,
          timestamp,
          value: fee.value.dividedBy(WEI_PER_GOLD).toFixed(),
        },
      })),
    )
  }

  static getWeiForToken(address: string) {
    return Math.pow(10, tokenInfoCache.getDecimalsForToken(address))
  }
}
