import { BlockscoutTokenTransfer } from '../blockscout'

export type TransferFilter = (transfer: BlockscoutTokenTransfer) => boolean

// TODO: Remove this class and replace it with static methods or an utils class.
export class TransferCollection {
  private transfers: BlockscoutTokenTransfer[] = []

  get length(): number {
    return this.transfers.length
  }

  constructor(transfers: BlockscoutTokenTransfer[]) {
    this.transfers = transfers
  }

  isEmpty(): boolean {
    return this.transfers.length === 0
  }

  pop(): BlockscoutTokenTransfer | undefined {
    return this.transfers.pop()
  }

  popWhich(predicate: TransferFilter): BlockscoutTokenTransfer | undefined {
    const index = this.findLastIndex(this.transfers, predicate)
    return index > -1 ? this.transfers.splice(index, 1)[0] : undefined
  }

  get(predicate: TransferFilter): BlockscoutTokenTransfer | undefined {
    const index = this.transfers.findIndex(predicate)
    return index > -1 ? this.transfers[index] : undefined
  }

  findLastIndex<T>(
    array: T[],
    predicate: (value: T, index: number, obj: T[]) => boolean,
  ): number {
    let l = array.length

    while (l--) {
      if (predicate(array[l], l, array)) {
        return l
      }
    }
    return -1
  }
}
