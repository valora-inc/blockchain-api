import BigNumber from 'bignumber.js'
import { DataSources } from './apolloServer'
import { USD } from './currencyConversion/consts'
import { logger } from './logger'

export enum EventTypes {
  EXCHANGE = 'EXCHANGE',
  RECEIVED = 'RECEIVED',
  SENT = 'SENT',
  FAUCET = 'FAUCET',
  VERIFICATION_FEE = 'VERIFICATION_FEE',
  ESCROW_SENT = 'ESCROW_SENT',
  ESCROW_RECEIVED = 'ESCROW_RECEIVED',
  CONTRACT_CALL = 'CONTRACT_CALL',
}

export enum FeeType {
  SECURITY_FEE = 'SECURITY_FEE',
  GATEWAY_FEE = 'GATEWAY_FEE',
  ONE_TIME_ENCRYPTION_FEE = 'ONE_TIME_ENCRYPTION_FEE',
  INVITATION_FEE = 'INVITATION_FEE',
}

export interface Fee {
  type: FeeType
  amount: MoneyAmount
}

export interface ExchangeEvent {
  type: EventTypes
  timestamp: number
  block: number
  outValue: number
  outSymbol: string
  inValue: number
  inSymbol: string
  hash: string
  fees: Fee[]
}

export interface TransferEvent {
  type: EventTypes
  timestamp: number
  block: number
  value: number
  address: string
  account: string
  comment: string
  symbol: string
  hash: string
  fees: Fee[]
}

export type EventInterface = ExchangeEvent | TransferEvent

export interface EventArgs {
  // Query params as defined by Blockscout's API
  address: string
  sort?: 'asc' | 'desc'
  startblock?: number
  endblock?: number
  page?: number
  offset?: number
}

export type Token = 'cUSD' | 'cGLD' | 'cEUR'

export interface TokenTransactionArgs {
  address: string
  token: Token | null
  tokens?: Token[]
  localCurrencyCode: string
}

export interface TokenTransactionV2Args {
  // Address to fetch transactions from.
  address: string
  // Filter all the transactions in given tokens. If not present, no filtering is done.
  tokens?: [string]
  // If present, every TokenAmount will contain the field localAmount with the estimated amount in given currency
  localCurrencyCode?: string
}

export interface ExchangeRate {
  rate: number
}

export interface UserTokenBalance {
  tokenAddress: string
  balance: string
  decimals: string
  symbol: string
}

export interface UserTokenBalances {
  balances: UserTokenBalance[]
}

export interface CurrencyConversionArgs {
  sourceCurrencyCode?: string
  currencyCode: string
  timestamp?: number
  impliedExchangeRates?: MoneyAmount['impliedExchangeRates']
}

export interface MoneyAmount {
  value: BigNumber.Value
  currencyCode: string
  // Implied exchange rate (based on exact amount exchanged) which overwrites
  // the estimate in firebase (based on a constant exchange amount)
  impliedExchangeRates?: { [key: string]: BigNumber.Value }
  timestamp: number
}

export interface LocalMoneyAmount {
  value: BigNumber.Value
  currencyCode: string
  exchangeRate: string
}

interface Context {
  dataSources: DataSources
  localCurrencyCode?: string
}

export const resolvers = {
  Query: {
    tokenTransactionsV2: async (
      _source: any,
      args: TokenTransactionV2Args,
      context: Context,
    ) => {
      // TODO

      return {
        tokens: [],
      }
    },
    // Deprecated
    tokenTransactions: async (
      _source: any,
      args: TokenTransactionArgs,
      context: Context,
    ) => {
      const { dataSources } = context
      context.localCurrencyCode = args.localCurrencyCode
      const transactions = await dataSources.blockscoutAPI.getTokenTransactions(
        args,
        context.dataSources.currencyConversionAPI,
      )

      return {
        edges: transactions.map((tx) => ({
          node: tx,
          cursor: 'TODO',
        })),
        pageInfo: {
          hasPreviousPage: false,
          hasNextPage: false,
          firstCursor: 'TODO',
          lastCursor: 'TODO',
        },
      }
    },
    currencyConversion: async (
      _source: any,
      args: CurrencyConversionArgs,
      { dataSources }: Context,
    ) => {
      try {
        const rate = await dataSources.currencyConversionAPI.getExchangeRate({
          ...args,
          // This field is optional for legacy reasons. Remove default value after Valora 1.16 is
          // released and most users update.
          sourceCurrencyCode: args.sourceCurrencyCode ?? USD,
        })
        return { rate: rate.toNumber() }
      } catch (error) {
        logger.error(error, { type: 'ERROR_CURRENCY_CONVERSION' })
        return null
      }
    },
    userBalances: async (
      _source: any,
      args: { address: string },
      { dataSources }: Context,
    ): Promise<UserTokenBalances> => {
      const balances = await dataSources.blockscoutJsonAPI.fetchUserBalances(
        args.address,
      )
      return { balances }
    },
  },
  TokenTransaction: {
    __resolveType(obj: EventInterface, context: any, info: any) {
      if (obj.type === EventTypes.EXCHANGE) {
        return 'TokenExchange'
      }
      if (
        obj.type === EventTypes.RECEIVED ||
        obj.type === EventTypes.ESCROW_RECEIVED ||
        obj.type === EventTypes.ESCROW_SENT ||
        obj.type === EventTypes.SENT ||
        obj.type === EventTypes.FAUCET ||
        obj.type === EventTypes.VERIFICATION_FEE
      ) {
        return 'TokenTransfer'
      }
      return null
    },
  },
  MoneyAmount: {
    localAmount: async (
      moneyAmount: MoneyAmount,
      args: any,
      context: Context,
    ) => {
      const { dataSources, localCurrencyCode } = context
      try {
        const rate = await dataSources.currencyConversionAPI.getExchangeRate({
          sourceCurrencyCode: moneyAmount.currencyCode,
          currencyCode: localCurrencyCode || 'USD',
          timestamp: moneyAmount.timestamp,
          impliedExchangeRates: moneyAmount.impliedExchangeRates,
        })
        return {
          value: new BigNumber(moneyAmount.value).multipliedBy(rate).toString(),
          currencyCode: localCurrencyCode || 'USD',
          exchangeRate: rate.toString(),
        }
      } catch (error) {
        logger.error(error, { type: 'ERROR_FETCHING_LOCAL_AMOUNT' })
        return null
      }
    },
  },
}
