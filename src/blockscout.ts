import { RESTDataSource } from 'apollo-datasource-rest'
import { performance } from 'perf_hooks'
import { BLOCKSCOUT_API, FAUCET_ADDRESS } from './config'
import { CGLD, CUSD } from './currencyConversion/consts'
import CurrencyConversionAPI from './currencyConversion/CurrencyConversionAPI'
import {
  Any,
  ContractCall,
  EscrowReceived,
  EscrowSent,
  ExchangeCeloToToken,
  ExchangeTokenToCelo,
  TokenReceived,
  TokenSent,
} from './events'
import { EscrowContractCall } from './events/EscrowContractCall'
import { ExchangeContractCall } from './events/ExchangeContractCall'
import { Input } from './helpers/Input'
import { InputDecoderLegacy } from './helpers/InputDecoderLegacy'
import tokenInfoCache from './helpers/TokenInfoCache'
import {
  LegacyAny,
  LegacyContractCall,
  LegacyEscrowReceived,
  LegacyEscrowSent,
  LegacyExchangeCeloToToken,
  LegacyExchangeTokenToCelo,
  LegacyFaucet,
  LegacyTokenReceived,
  LegacyTokenSent,
  LegacyVerification,
} from './legacyEvents'
import { LegacyEscrowContractCall } from './legacyEvents/LegacyEscrowContractCall'
import { LegacyExchangeContractCall } from './legacyEvents/LegacyExchangeContractCall'
import { LegacyRegisterAccountDekContractCall } from './legacyEvents/LegacyRegisterAccountDekContractCall'
import { LegacyTransaction } from './legacyTransaction/LegacyTransaction'
import { LegacyTransactionAggregator } from './legacyTransaction/LegacyTransactionAggregator'
import { LegacyTransactionClassifier } from './legacyTransaction/LegacyTransactionClassifier'
import { LegacyTransferCollection } from './legacyTransaction/LegacyTransferCollection'
import { LegacyTransfersNavigator } from './legacyTransaction/LegacyTransfersNavigator'
import { logger } from './logger'
import { metrics } from './metrics'
import { MoneyAmount, TokenTransactionArgs } from './resolvers'
import { Transaction } from './transaction/Transaction'
import { TransactionAggregator } from './transaction/TransactionAggregator'
import { TransactionClassifier } from './transaction/TransactionClassifier'
import { ContractAddresses, getContractAddresses } from './utils'
export interface BlockscoutTransferTx {
  blockNumber: number
  transactionHash: string
  timestamp: string
  gasPrice: string
  gasUsed: string
  feeToken: string
  gatewayFee: string
  gatewayFeeRecipient: string
  input: string
  celoTransfers: BlockscoutCeloTransfer[]
}

export interface BlockscoutCeloTransfer {
  fromAddressHash: string
  toAddressHash: string
  fromAccountHash: string
  toAccountHash: string
  token: string
  value: string
}

export interface BlockscoutTokenTransfer {
  fromAddressHash: string
  toAddressHash: string
  fromAccountHash: string
  toAccountHash: string
  token: string
  tokenAddress: string
  value: string
}

export class BlockscoutAPI extends RESTDataSource {
  contractAddresses: ContractAddresses | undefined

  constructor() {
    super()
    this.baseURL = `${BLOCKSCOUT_API}/graphql`
  }

  async getTokenTransactionsV2(address: string) {
    const userAddress = address.toLowerCase()
    const rawTransactions = await this.getRawTokenTransactionsV2(userAddress)

    const context = { userAddress }

    const transactionClassifier = new TransactionClassifier([
      new ExchangeContractCall(context),
      new EscrowContractCall(context),
      new ContractCall(context),
      new EscrowSent(context),
      new TokenSent(context),
      new EscrowReceived(context),
      new TokenReceived(context),
      new ExchangeCeloToToken(context),
      new ExchangeTokenToCelo(context),
      new Any(context),
    ])

    const classifiedTransactions = rawTransactions.map((transaction) =>
      transactionClassifier.classify(transaction),
    )

    const aggregatedTransactions = TransactionAggregator.aggregate(
      classifiedTransactions,
    )

    const events: any[] = (
      await Promise.all(
        aggregatedTransactions.map(async ({ transaction, type }) => {
          try {
            return await type.getEvent(transaction)
          } catch (error) {
            logger.warn({
              type: 'ERROR_MAPPING_TO_EVENT_V2',
              transaction: JSON.stringify(transaction),
              error,
            })
          }
        }),
      )
    )
      .filter((e) => e)
      .sort((a, b) => b.timestamp - a.timestamp)

    logger.info({
      type: 'GET_TOKEN_TRANSACTIONS_V2',
      address: address,
      rawTransactionCount: rawTransactions.length,
      eventCount: events.length,
    })

    return events
  }

  async getRawTokenTransactionsV2(address: string): Promise<Transaction[]> {
    const t0 = performance.now()

    await this.ensureContractAddresses()

    const response = await this.post('', {
      query: `
        query Transfers($address: AddressHash!) {
          # TXs related to cUSD or cGLD transfers
          tokenTransferTxs(addressHash: $address, first: 100) {
            edges {
              node {
                transactionHash
                blockNumber
                timestamp
                gasPrice
                gasUsed
                feeToken
                gatewayFee
                gatewayFeeRecipient
                input
                # Transfers associated with the TX
                tokenTransfer(first: 10) {
                  edges {
                    node {
                      fromAddressHash
                      toAddressHash
                      fromAccountHash
                      toAccountHash
                      value
                      tokenAddress
                    }
                  }
                }
              }
            }
          }
        }
      `,
      variables: { address },
    })

    const transactions = response.data.tokenTransferTxs.edges.map(
      ({ node }: any) => {
        const { tokenTransfer, ...partialTransferTx } = node
        const tokenTransfers = node.tokenTransfer.edges.map(
          (edge: any) => edge.node,
        )

        return new Transaction(partialTransferTx, tokenTransfers)
      },
    )

    const supportedTokens = new Set(tokenInfoCache.getTokensAddresses())

    const filteredUnknownTokens = transactions.filter((tx: Transaction) => {
      return tx.transfers.every((transfer: BlockscoutTokenTransfer) => {
        return supportedTokens.has(transfer.tokenAddress.toLowerCase())
      })
    })

    // Record time at end of execution
    const t1 = performance.now()
    metrics.setRawTokenDuration(t1 - t0)
    return filteredUnknownTokens
  }

  async getRawTokenTransactions(address: string): Promise<LegacyTransaction[]> {
    // Measure time at beginning of execution
    const t0 = performance.now()
    const contractAddresses = await this.ensureContractAddresses()

    const response = await this.post('', {
      query: `
        query Transfers($address: AddressHash!) {
          # TXs related to cUSD or cGLD transfers
          transferTxs(addressHash: $address, first: 100) {
            edges {
              node {
                transactionHash
                blockNumber
                timestamp
                gasPrice
                gasUsed
                feeToken
                gatewayFee
                gatewayFeeRecipient
                input
                # Transfers associated with the TX
                celoTransfer(first: 10) {
                  edges {
                    node {
                      fromAddressHash
                      toAddressHash
                      fromAccountHash
                      toAccountHash
                      value
                      token
                    }
                  }
                }
              }
            }
          }
        }
      `,
      variables: { address },
    })

    const transactions = response.data.transferTxs.edges.map(
      ({ node }: any) => {
        const newNode = this.mapNewTokensToOldTokens(node)
        const { celoTransfer, ...partialTransferTx } = newNode
        const celoTransfers = newNode.celoTransfer.edges.map(
          (edge: any) => edge.node,
        )

        const transferCollection = new LegacyTransferCollection(celoTransfers)
        const transfersNavigator = new LegacyTransfersNavigator(
          contractAddresses,
          FAUCET_ADDRESS,
          transferCollection,
        )
        const inputDecoder = new InputDecoderLegacy(
          contractAddresses,
          Input.fromString(partialTransferTx.input),
        )

        return new LegacyTransaction(
          partialTransferTx,
          transfersNavigator,
          inputDecoder,
        )
      },
    )

    // Record time at end of execution
    const t1 = performance.now()
    metrics.setRawTokenDuration(t1 - t0)
    return transactions
  }

  /**
   * It maps all new 'CELO' tokens to 'cGLD' to support backward compatibility
   */
  private mapNewTokensToOldTokens(node: any) {
    return {
      ...node,
      feeToken: this.mapToOldTokenString(node.feeToken),
      celoTransfer: {
        edges: node.celoTransfer.edges.map((edge: any) => {
          return { node: this.mapToOldCeloTransferNode(edge.node) }
        }),
      },
    }
  }

  private mapToOldCeloTransferNode(node: any) {
    return { ...node, token: this.mapToOldTokenString(node.token) }
  }

  private mapToOldTokenString(token: string) {
    return token === 'CELO' ? CGLD : token
  }

  async ensureContractAddresses(): Promise<ContractAddresses> {
    if (!this.contractAddresses) {
      const contractAddresses = await getContractAddresses()

      if (!contractAddresses.Attestations) {
        throw new Error('Cannot find attestation address')
      }
      if (!contractAddresses.Escrow) {
        throw new Error('Cannot find escrow address')
      }
      if (!contractAddresses.Exchange) {
        throw new Error('Cannot find exchange address')
      }
      if (!contractAddresses.ExchangeEUR) {
        throw new Error('Cannot find exchange EUR address')
      }
      if (!contractAddresses.ExchangeBRL) {
        throw new Error('Cannot find exchange BRL address')
      }
      if (!contractAddresses.Reserve) {
        throw new Error('Cannot find reserve address')
      }

      this.contractAddresses = contractAddresses
    }

    return this.contractAddresses
  }

  async getTokenTransactions(
    args: TokenTransactionArgs,
    currencyConversionAPI: CurrencyConversionAPI,
  ) {
    const userAddress = args.address.toLowerCase()
    const { token, tokens: receivedTokens, localCurrencyCode } = args
    const rawTransactions = await this.getRawTokenTransactions(userAddress)
    // cUSD/cGLD is the default for legacy reasons. Can be removed once most users updated to Valora >= 1.16
    const tokens = receivedTokens ?? (token ? [token] : [CUSD, CGLD])
    const context = {
      userAddress,
      tokens,
    }

    const transactionClassifier = new LegacyTransactionClassifier([
      new LegacyExchangeContractCall(context),
      new LegacyEscrowContractCall(context),
      new LegacyRegisterAccountDekContractCall(context),
      new LegacyContractCall(context),
      new LegacyVerification(context),
      new LegacyEscrowSent(context),
      new LegacyTokenSent(context),
      new LegacyFaucet(context),
      new LegacyEscrowReceived(context),
      new LegacyTokenReceived(context),
      new LegacyExchangeCeloToToken(context),
      new LegacyExchangeTokenToCelo(context),
      new LegacyAny(context),
    ])

    const classifiedTransactions = rawTransactions.map((transaction) =>
      transactionClassifier.classify(transaction),
    )

    const aggregatedTransactions = LegacyTransactionAggregator.aggregate(
      classifiedTransactions,
    )

    const events: any[] = aggregatedTransactions
      .map(({ transaction, type }) => {
        try {
          return type.getEvent(transaction)
        } catch (error) {
          logger.warn({
            type: 'ERROR_MAPPING_TO_EVENT',
            transaction: JSON.stringify(transaction),
            error,
          })
        }
      })
      .filter((e) => e)
      .filter((event) => tokens.includes(event.amount.currencyCode))
      .sort((a, b) => b.timestamp - a.timestamp)

    // We're trying to get the local amounts for exchange events because if they fail we can't
    // return null on the |localAmount| field or the app will crash. Instead, we're just skipping
    // those events when fetching the exchange rate fails.
    // After fetching it here it should be stored in the cache, so it will not fail when requested
    // from the resolver.
    const filteredEvents = (
      await Promise.all(
        events.map(async (event) => {
          if (!event.makerAmount && !event.takerAmount) {
            return event
          }

          try {
            await currencyConversionAPI.getFromMoneyAmount({
              moneyAmount: event.makerAmount as MoneyAmount,
              localCurrencyCode,
            })
            await currencyConversionAPI.getFromMoneyAmount({
              moneyAmount: event.takerAmount as MoneyAmount,
              localCurrencyCode,
            })
          } catch (error) {
            logger.warn({
              type: 'ERROR_FETCHING_EXCHANGE_LOCAL_AMOUNT',
              error,
            })
            return null
          }

          return event
        }),
      )
    ).filter((e) => e)

    logger.info({
      type: 'GET_TOKEN_TRANSACTIONS',
      address: args.address,
      tokens,
      localCurrencyCode: args.localCurrencyCode,
      rawTransactionCount: rawTransactions.length,
      eventCount: filteredEvents.length,
    })

    return filteredEvents
  }
}
