import { FAUCET_ADDRESS } from '../config'
import { Contracts, getContractAddressesOrError } from '../utils'
import { BlockscoutTokenTransfer } from '../blockscout'
export type TransferFilter = (transfer: BlockscoutTokenTransfer) => boolean

const MINTED_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000'

export function popWhich(
  tokenTransfers: BlockscoutTokenTransfer[],
  predicate: TransferFilter,
): BlockscoutTokenTransfer | undefined {
  const index = findLastIndex(tokenTransfers, predicate)
  return index > -1 ? tokenTransfers.splice(index, 1)[0] : undefined
}

export function getWhich(
  tokenTransfers: BlockscoutTokenTransfer[],
  predicate: TransferFilter,
): BlockscoutTokenTransfer | undefined {
  const index = tokenTransfers.findIndex(predicate)
  return index > -1 ? tokenTransfers[index] : undefined
}

function findLastIndex<T>(
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

export function containsFaucetTransfer(
  tokenTransfers: BlockscoutTokenTransfer[],
): boolean {
  return containsTransferFrom(tokenTransfers, FAUCET_ADDRESS)
}

export function containsMintedTokenTransfer(
  tokenTransfers: BlockscoutTokenTransfer[],
): boolean {
  return containsTransferFrom(tokenTransfers, MINTED_TOKEN_ADDRESS)
}

export function containsBurnedTokenTransfer(
  tokenTransfers: BlockscoutTokenTransfer[],
): boolean {
  return containsTransferTo(tokenTransfers, MINTED_TOKEN_ADDRESS)
}

export function containsTransferFrom(
  tokenTransfers: BlockscoutTokenTransfer[],
  senderAddress: Contracts | string,
): boolean {
  const contractAddress =
    getContractAddressesOrError()[senderAddress as Contracts]
  const sender = contractAddress ? contractAddress : senderAddress

  return getTransferFrom(tokenTransfers, sender) !== undefined
}

export function containsTransferTo(
  tokenTransfers: BlockscoutTokenTransfer[],
  recipientAddress: Contracts | string,
): boolean {
  const contractAddress =
    getContractAddressesOrError()[recipientAddress as Contracts]
  const recipient = contractAddress ? contractAddress : recipientAddress

  return getTransferTo(tokenTransfers, recipient) !== undefined
}

export function getFaucetTransfer(
  tokenTransfers: BlockscoutTokenTransfer[],
): BlockscoutTokenTransfer | undefined {
  return getTransferFrom(tokenTransfers, FAUCET_ADDRESS)
}

export function getMintedTokenTransfer(
  tokenTransfers: BlockscoutTokenTransfer[],
): BlockscoutTokenTransfer | undefined {
  return getTransferFrom(tokenTransfers, MINTED_TOKEN_ADDRESS)
}

export function getBurnedTokenTransfer(
  tokenTransfers: BlockscoutTokenTransfer[],
): BlockscoutTokenTransfer | undefined {
  return getTransferTo(tokenTransfers, MINTED_TOKEN_ADDRESS)
}

export function getTransferFrom(
  tokenTransfers: BlockscoutTokenTransfer[],
  senderAddress: Contracts | string,
): BlockscoutTokenTransfer | undefined {
  const contractAddress =
    getContractAddressesOrError()[senderAddress as Contracts]
  const sender = contractAddress ? contractAddress : senderAddress

  return getWhich(
    tokenTransfers,
    (transfer: BlockscoutTokenTransfer): boolean =>
      transfer.fromAddressHash.toLowerCase() === sender,
  )
}

export function getTransferTo(
  tokenTransfers: BlockscoutTokenTransfer[],
  recipientAddress: Contracts | string,
): BlockscoutTokenTransfer | undefined {
  const contractAddress =
    getContractAddressesOrError()[recipientAddress as Contracts]
  const recipient = contractAddress ? contractAddress : recipientAddress

  return getWhich(
    tokenTransfers,
    (transfer: BlockscoutTokenTransfer): boolean =>
      transfer.toAddressHash.toLowerCase() === recipient,
  )
}

export function popTransferTo(
  tokenTransfers: BlockscoutTokenTransfer[],
  recipientAddress: Contracts | string,
): BlockscoutTokenTransfer | undefined {
  const contractAddress =
    getContractAddressesOrError()[recipientAddress as Contracts]
  const recipient = contractAddress ? contractAddress : recipientAddress

  return popWhich(
    tokenTransfers,
    (transfer: BlockscoutTokenTransfer): boolean =>
      transfer.toAddressHash.toLowerCase() === recipient,
  )
}
