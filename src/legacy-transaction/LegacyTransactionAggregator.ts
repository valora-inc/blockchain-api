import { LegacyClassifiedTransaction } from './LegacyTransactionClassifier'

/**
 * Aggregates transactions based on their type, summing up fees, grouping them into one
 * transaction meaningful for the end user.
 * Starting with the first transaction adds fees for contract calls to the previous
 * transaction of another type.
 */
export class LegacyTransactionAggregator {
  static aggregate(
    transactions: LegacyClassifiedTransaction[],
  ): LegacyClassifiedTransaction[] {
    const aggregatedTransactions = transactions.reduce(
      LegacyTransactionAggregator.aggregateContractCallFees,
      [],
    )

    return aggregatedTransactions.filter((t) => t)
  }

  static aggregateContractCallFees(
    accumulator: LegacyClassifiedTransaction[],
    currentTransaction: LegacyClassifiedTransaction,
    currentIndex: number,
    array: LegacyClassifiedTransaction[],
  ): LegacyClassifiedTransaction[] {
    if (currentTransaction.type.isAggregatable() && accumulator.length > 0) {
      const transactionFees = currentTransaction.type.getFees(
        currentTransaction.transaction,
      )

      transactionFees.forEach((fee) =>
        accumulator[accumulator.length - 1].transaction.addFee(fee),
      )
    } else {
      accumulator.push(currentTransaction)
    }

    return accumulator
  }
}
