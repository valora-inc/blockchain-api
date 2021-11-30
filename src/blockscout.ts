import { RESTDataSource } from 'apollo-datasource-rest'
import { performance } from 'perf_hooks'
import { BLOCKSCOUT_API, FAUCET_ADDRESS } from './config'
import { CGLD, CUSD } from './currencyConversion/consts'
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
import { Input } from './helpers/Input'
import { InputDecoder } from './helpers/InputDecoder'
import { logger } from './logger'
import { metrics } from './metrics'
import { TokenTransactionArgs, TokenTransactionV2 } from './resolvers'
import { LegacyTransaction } from './legacyTransaction/LegacyTransaction'
import { LegacyTransactionAggregator } from './legacyTransaction/LegacyTransactionAggregator'
import { LegacyTransactionClassifier } from './legacyTransaction/LegacyTransactionClassifier'
import { LegacyTransferCollection } from './legacyTransaction/LegacyTransferCollection'
import { LegacyTransfersNavigator } from './legacyTransaction/LegacyTransfersNavigator'
import { ContractAddresses, getContractAddresses } from './utils'
import { TransferCollection } from './transaction/TransferCollection'
import { TransfersNavigator } from './transaction/TransfersNavigator'
import { Transaction } from './transaction/Transaction'
import { TransactionClassifier } from './transaction/TransactionClassifier'
import { ExchangeContractCall } from './events/ExchangeContractCall'
import { EscrowContractCall } from './events/EscrowContractCall'
import { RegisterAccountDekContractCall } from './events/RegisterAccountDekContractCall'
import { Any, ContractCall, EscrowReceived, EscrowSent, ExchangeCeloToToken, ExchangeTokenToCelo, Faucet, TokenReceived, TokenSent, Verification } from './events'
import { TransactionAggregator } from './transaction/TransactionAggregator'
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
    
    const transactionClassifier = new TransactionClassifier([
      new ExchangeContractCall(),
      new EscrowContractCall(),
      new RegisterAccountDekContractCall(),
      new ContractCall(),
      new Verification(),
      new EscrowSent(),
      new TokenSent(),
      new Faucet(),
      new EscrowReceived(),
      new TokenReceived(),
      new ExchangeCeloToToken(),
      new ExchangeTokenToCelo(),
      new Any(),
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
          logger.error({
            type: 'ERROR_MAPPING_TO_EVENT_V2',
            transaction: JSON.stringify(transaction),
            error: (e as Error)?.message,
          })
        }
      })
      .filter((e) => e)
      // .filter((event) => tokens.includes(event.amount.currencyCode))
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
                tokenTransfer(first: 10) {
                  edges {
                    node {
                      fromAddressHash
                      toAddressHash
                      fromAccountHash
                      toAccountHash
                      value
                      token
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

    const transactions = response.data.transferTxs.edges.map(
      ({ node }: any) => {
        const { tokenTransfer, ...partialTransferTx } = node
        const tokenTransfers = node.tokenTransfer.edges.map(
          (edge: any) => edge.node,
        )

        const transferCollection = new TransferCollection(tokenTransfers)
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
        const inputDecoder = new InputDecoder(
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
      if (!contractAddresses.Reserve) {
        throw new Error('Cannot find reserve address')
      }

      this.contractAddresses = contractAddresses
    }

    return this.contractAddresses
  }

  async getTokenTransactions(args: TokenTransactionArgs) {
    const userAddress = args.address.toLowerCase()
    const { token, tokens: receivedTokens } = args
    const rawTransactions = await this.getRawTokenTransactions(userAddress)
    // cUSD/cGLD is the default for legacy reasons. Can be removed once most users updated to Valora >= 1.16
    const tokens = receivedTokens ?? (token ? [token!] : [CUSD, CGLD])
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
        } catch (e) {
          logger.error({
            type: 'ERROR_MAPPING_TO_EVENT',
            transaction: JSON.stringify(transaction),
            error: (e as Error)?.message,
          })
        }
      })
      .filter((e) => e)
      .filter((event) => tokens.includes(event.amount.currencyCode))
      .sort((a, b) => b.timestamp - a.timestamp)

    logger.info({
      type: 'GET_TOKEN_TRANSACTIONS',
      address: args.address,
      tokens,
      localCurrencyCode: args.localCurrencyCode,
      rawTransactionCount: rawTransactions.length,
      eventCount: events.length,
    })

    return events
  }
}
