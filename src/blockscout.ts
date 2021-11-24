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
  Faucet,
  TokenReceived,
  TokenSent,
  Verification,
} from './events'
import { EscrowContractCall } from './events/EscrowContractCall'
import { ExchangeContractCall } from './events/ExchangeContractCall'
import { RegisterAccountDekContractCall } from './events/RegisterAccountDekContractCall'
import { Input } from './helpers/Input'
import { InputDecoder } from './helpers/InputDecoder'
import { logger } from './logger'
import { metrics } from './metrics'
import { MoneyAmount, TokenTransactionArgs } from './resolvers'
import { Transaction } from './transaction/Transaction'
import { TransactionAggregator } from './transaction/TransactionAggregator'
import { TransactionClassifier } from './transaction/TransactionClassifier'
import { TransferCollection } from './transaction/TransferCollection'
import { TransfersNavigator } from './transaction/TransfersNavigator'
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

export class BlockscoutAPI extends RESTDataSource {
  contractAddresses: ContractAddresses | undefined

  constructor() {
    super()
    this.baseURL = `${BLOCKSCOUT_API}/graphql`
  }

  async getRawTokenTransactions(address: string): Promise<Transaction[]> {
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

        const transferCollection = new TransferCollection(celoTransfers)
        const transfersNavigator = new TransfersNavigator(
          contractAddresses,
          FAUCET_ADDRESS,
          transferCollection,
        )
        const inputDecoder = new InputDecoder(
          contractAddresses,
          Input.fromString(partialTransferTx.input),
        )

        return new Transaction(
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

    const transactionClassifier = new TransactionClassifier([
      new ExchangeContractCall(context),
      new EscrowContractCall(context),
      new RegisterAccountDekContractCall(context),
      new ContractCall(context),
      new Verification(context),
      new EscrowSent(context),
      new TokenSent(context),
      new Faucet(context),
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

    const events: any[] = aggregatedTransactions
      .map(({ transaction, type }) => {
        try {
          return type.getEvent(transaction)
        } catch (e) {
          logger.error(e, {
            type: 'ERROR_MAPPING_TO_EVENT',
            transaction: JSON.stringify(transaction),
          })
        }
      })
      .filter((e) => e)
      .filter((event) => tokens.includes(event.amount.currencyCode))
      .sort((a, b) => b.timestamp - a.timestamp)

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
            logger.error(error, {
              type: 'ERROR_FETCHING_EXCHANGE_LOCAL_AMOUNT',
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
