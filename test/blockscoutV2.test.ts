import { BlockscoutAPI } from '../src/blockscout'
import CurrencyConversionAPI from '../src/currencyConversion/CurrencyConversionAPI'
import mockTokenTxs, {
  TEST_DOLLAR_ADDRESS,
  TEST_GOLD_ADDRESS,
} from './mockTokenTxsV2'

const mockDataSourcePost = jest.fn(() => mockTokenTxs)

jest.mock('apollo-datasource-rest', () => {
  class MockRESTDataSource {
    baseUrl = ''
    post = mockDataSourcePost
  }

  return {
    RESTDataSource: MockRESTDataSource,
  }
})

jest.mock('../src/config.ts', () => {
  return {
    ...(jest.requireActual('../src/config.ts') as any),
    FAUCET_ADDRESS: '0x0000000000000000000000000000000000f40c37',
  }
})

jest.mock('../src/utils.ts', () => {
  const contractGetter = jest.fn()
  const tokenAddressMapping: { [key: string]: string } = {
    ['0x000000000000000000000000000000000000gold']: 'Celo Gold',
    ['0x0000000000000000000000000000000000dollar']: 'Celo Dollar',
  }
  contractGetter.mockReturnValue({
    tokenAddressMapping,
    GoldToken: '0x000000000000000000000000000000000000gold',
    StableToken: '0x0000000000000000000000000000000000dollar',
    Attestations: '0x0000000000000000000000000000000000a77357',
    Escrow: '0x0000000000000000000000000000000000a77327',
    Exchange: '0xf1235cb0d3703e7cc2473fb4e214fbc7a9ff77cc',
    ExchangeEUR: '0xd1235cb0d3703e7cc2473fb4e214fbc7a9ff77cc',
    ExchangeBRL: '0x4a3acb12178b40d8ca2b719cba6bcae0e8e31f4c',
    Governance: '0xa12a699c641cc875a7ca57495861c79c33d293b4',
    Reserve: '0x6a61e1e693c765cbab7e02a500665f2e13ee46df',
  })
  return {
    ...(jest.requireActual('../src/utils.ts') as any),
    getContractAddresses: contractGetter,
    getContractAddressesOrError: contractGetter,
  }
})

jest.mock('../src/helpers/KnownAddressesCache.ts', () => {
  return {
    startListening: {},
    getDisplayInfoFor: jest.fn().mockImplementation((address: string) => {
      switch (address) {
        case '0xf4314cb9046bece6aa54bb9533155434d0c76909':
          return { name: 'Test Name', imageUrl: 'Test Image' }
        case '0xa12a699c641cc875a7ca57495861c79c33d293b4':
          return { name: 'Test Only Name' }
        default:
          return {}
      }
    }),
  }
})

jest.mock('../src/helpers/TokenInfoCache.ts', () => ({
  getDecimalsForToken: (address: string) => {
    switch (address) {
      case TEST_GOLD_ADDRESS:
        return 18
      case TEST_DOLLAR_ADDRESS:
        return 12
      default:
        return 8
    }
  },
  tokenInfoBySymbol: (symbol: string) => {
    return {
      cUSD: {
        address: TEST_DOLLAR_ADDRESS.toLowerCase(),
      },
      CELO: {
        address: TEST_GOLD_ADDRESS.toLowerCase(),
      },
    }[symbol]
  },
}))

// @ts-ignore
const mockCurrencyConversionAPI: CurrencyConversionAPI = {
  getFromMoneyAmount: jest.fn(),
}

describe('Blockscout', () => {
  let blockscoutAPI: BlockscoutAPI

  beforeEach(async () => {
    blockscoutAPI = new BlockscoutAPI()
    mockDataSourcePost.mockClear()
  })

  // TODO: Uncomment these tests when the token filter works
  // it('should get dollar transactions and label them properly', async () => {
  //   const result = await blockscoutAPI.getTokenTransactions(
  //     {
  //       address: '0x0000000000000000000000000000000000007E57',
  //       token: 'cUSD',
  //       localCurrencyCode: 'MXN',
  //     },
  //     mockCurrencyConversionAPI,
  //   )

  //   // Reversing for convenience to match the order in mock data
  //   const transactions = result.reverse()

  //   expect(transactions).toMatchSnapshot()
  // })

  // it('should get gold transactions and label them properly', async () => {
  //   const result = await blockscoutAPI.getTokenTransactions(
  //     {
  //       address: '0x0000000000000000000000000000000000007E57',
  //       token: 'cGLD',
  //       localCurrencyCode: 'MXN',
  //     },
  //     mockCurrencyConversionAPI,
  //   )

  //   // Reversing for convenience to match the order in mock data
  //   const transactions = result.reverse()

  //   expect(transactions).toMatchSnapshot()
  // })

  it('should get all transactions and label them properly', async () => {
    const result = await blockscoutAPI.getTokenTransactionsV2(
      '0x0000000000000000000000000000000000007E57',
    )

    // Reversing for convenience to match the order in mock data
    const transactions = result.reverse()

    expect(transactions).toMatchSnapshot()
  })
})
