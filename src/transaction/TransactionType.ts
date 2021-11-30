import { Transaction } from './Transaction'

export abstract class TransactionType {
  abstract matches(transaction: Transaction): boolean
  abstract getEvent(transaction: Transaction): any
  abstract isAggregatable(): boolean
}
