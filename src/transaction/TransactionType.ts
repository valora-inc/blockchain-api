import { Transaction } from './Transaction'

export interface Context {
  userAddress: string
  tokens?: string[]
}

export abstract class TransactionType {
  protected readonly context!: Context

  constructor(context: Context) {
    this.context = context
  }

  abstract matches(transaction: Transaction): boolean
  abstract getEvent(transaction: Transaction): Promise<any>
  abstract isAggregatable(): boolean
}
