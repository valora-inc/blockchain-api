import { BlockscoutAPI } from '../src/blockscout'
import CurrencyConversionAPI from '../src/currencyConversion/CurrencyConversionAPI'
import { EventBuilder } from '../src/helpers/EventBuilder'
import mockTokenTxs from './mockTokenTxsV2'

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
    Governance: '0xa12a699c641cc875a7ca57495861c79c33d293b4',
    Reserve: '0x6a61e1e693c765cbab7e02a500665f2e13ee46df',
  })
  return {
    ...(jest.requireActual('../src/utils.ts') as any),
    getContractAddresses: contractGetter,
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

// @ts-ignore
const mockCurrencyConversionAPI: CurrencyConversionAPI = {
  getFromMoneyAmount: jest.fn(),
}

describe('Blockscout', () => {
  let blockscoutAPI: BlockscoutAPI
  const contractAddressesBackup = EventBuilder.contractAddresses

  beforeEach(async () => {
    blockscoutAPI = new BlockscoutAPI()
    mockDataSourcePost.mockClear()
    await EventBuilder.loadContractAddresses()
  })

  afterEach(() => {
    EventBuilder.contractAddresses = contractAddressesBackup
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