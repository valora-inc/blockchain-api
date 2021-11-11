import { LegacyTransaction } from './LegacyTransaction'
import { LegacyTransactionType } from './LegacyTransactionType'

export interface LegacyClassifiedTransaction {
  transaction: LegacyTransaction
  type: LegacyTransactionType
}

export class LegacyTransactionClassifier {
  transactionTypes: LegacyTransactionType[] = []

  constructor(transactionTypes: LegacyTransactionType[]) {
    this.transactionTypes = transactionTypes
  }

  classify(transaction: LegacyTransaction): LegacyClassifiedTransaction {
    for (const type of this.transactionTypes) {
      if (type.matches(transaction)) {
        return { transaction, type }
      }
    }

    throw new Error(`Unhandled tx type ${transaction.transactionHash}`)
  }
}
