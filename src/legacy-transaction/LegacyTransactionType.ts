import { Fee, LegacyTransaction } from './LegacyTransaction'

export interface Context {
  userAddress: string
  tokens: string[]
}

export abstract class LegacyTransactionType {
  protected readonly context!: Context

  constructor(context: Context) {
    this.context = context
  }

  getFees(transaction: LegacyTransaction): Fee[] {
    return transaction.fees
  }

  abstract matches(transaction: LegacyTransaction): boolean
  abstract getEvent(transaction: LegacyTransaction): any
  abstract isAggregatable(): boolean
}
