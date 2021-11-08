export default `type ExchangeRate {
    rate: Decimal!
  }

  """
  Timestamp in milliseconds, represented as Float
  """
  scalar Timestamp
  """
  The address (40 (hex) characters / 160 bits / 20 bytes) is derived from the public key (128 (hex) characters / 512 bits / 64 bytes) which is derived from the private key (64 (hex) characters / 256 bits / 32 bytes).

  The address is actually the last 40 characters of the keccak-256 hash of the public key with 0x appended.

  Represented as String.
  """
  scalar Address
  """
  Custom scalar for decimal amounts, represented as String
  """
  scalar Decimal

  enum Token {
    cUSD
    cEUR
    cGLD
  }

  enum FeeType {
    SECURITY_FEE
    GATEWAY_FEE
    ONE_TIME_ENCRYPTION_FEE
    INVITATION_FEE
  }

  type MoneyAmount {
    value: Decimal!
    currencyCode: String!
    localAmount: LocalMoneyAmount
  }

  type LocalMoneyAmount {
    value: Decimal!
    currencyCode: String!
    exchangeRate: Decimal!
  }

  type Fee {
    type: FeeType!
    amount: MoneyAmount!
  }

  enum TokenTransactionType {
    EXCHANGE
    RECEIVED
    SENT
    ESCROW_SENT
    ESCROW_RECEIVED
    FAUCET
    VERIFICATION_FEE
    INVITE_SENT
    INVITE_RECEIVED
    PAY_REQUEST
    NETWORK_FEE
  }

  interface TokenTransaction {
    type: TokenTransactionType!
    timestamp: Timestamp!
    block: String!
    # signed amount (+/-)
    amount: MoneyAmount!
    hash: String!
    fees: [Fee]
  }

  type TokenTransfer implements TokenTransaction {
    type: TokenTransactionType!
    timestamp: Timestamp!
    block: String!
    # signed amount (+/-)
    amount: MoneyAmount!
    address: Address!
    account: Address!
    comment: String
    token: Token!
    hash: String!
    fees: [Fee]
    defaultName: String
    defaultImage: String
  }

  type TokenExchange implements TokenTransaction {
    type: TokenTransactionType!
    timestamp: Timestamp!
    block: String!
    # signed amount (+/-)
    amount: MoneyAmount!
    takerAmount: MoneyAmount!
    makerAmount: MoneyAmount!
    hash: String!
    fees: [Fee]
  }

  type TokenTransactionConnection {
    edges: [TokenTransactionEdge!]!
    pageInfo: PageInfo!
  }

  type TokenTransactionEdge {
    node: TokenTransaction
    cursor: String!
  }

  """
  A modified copy of the models of above. Except the new one support multiple tokens (using address instead of code to identify the currency)
  """
  type TokenAmount {
    value: Decimal!
    tokenAddress: Address!
    localAmount: LocalMoneyAmount
  }

  enum TokenTransactionTypeV2 {
    EXCHANGE
    RECEIVED
    SENT
    INVITE_SENT
    INVITE_RECEIVED
    PAY_REQUEST
  }

  type FeeV2 {
    type: FeeType!
    amount: TokenAmount!
  }

  interface TokenTransferMetadata {
    title: String
    subtitle: String
    image: String
    comment: String
  }

  """
  TODO: Add more fields once we understand what useful information we can serve
  """
  interface TokenExchangeMetadata {
    title: String
    subtitle: String
  }

  interface TokenTransactionV2 {
    type: TokenTransactionTypeV2!
    timestamp: Timestamp!
    block: String!
    transactionHash: String!
    fees: [FeeV2]
  }

  type TokenTransferV2 implements TokenTransactionV2 {
    type: TokenTransactionTypeV2!
    timestamp: Timestamp!
    block: String!
    amount: TokenAmount!
    address: Address!
    transactionHash: String!
    fees: [FeeV2]
    metadata: TokenTransferMetadata
  }

  type TokenExchangeV2 implements TokenTransactionV2 {
    type: TokenTransactionTypeV2!
    timestamp: Timestamp!
    block: String!
    inAmount: TokenAmount!
    outAmount: TokenAmount!
    transactionHash: String!
    fees: [FeeV2]
    metadata: TokenExchangeMetadata
  }

  type TokenTransactionsV2 {
    tokens: [TokenTransactionV2]!
  }

  type PageInfo {
    hasPreviousPage: Boolean!
    hasNextPage: Boolean!
    firstCursor: String
    lastCursor: String
  }

  type Query {
    tokenTransactionsV2(
      address: Address!
      tokens: [Address]
      localCurrencyCode: String
    ): TokenTransactionsV2

    tokenTransactions(
      address: Address!
      token: Token
      tokens: [Token]
      localCurrencyCode: String
      # pagination
      before: String
      last: Int
      after: String
      first: Int
    ): TokenTransactionConnection

    currencyConversion(
      sourceCurrencyCode: String
      currencyCode: String!
      timestamp: Timestamp
    ): ExchangeRate
  }`
