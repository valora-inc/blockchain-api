import { BlockscoutJsonAPI } from '../src/blockscoutJsonApi'

const mockDataSourceGet = jest.fn(() => ({
  result: [
    {
      balance: '2871713969586',
      contractAddress: '0x048f47d358ec521a6cf384461d674750a3cb58c8',
      decimals: '10',
      name: 'Test Token',
      symbol: 'TT',
      type: 'ERC-20',
    },
    {
      balance: '2947248590163445104',
      contractAddress: '0x10c892a6ec43a53e45d0b916b4b7d383b1b78c0f',
      decimals: '18',
      name: 'Celo Euro',
      symbol: 'cEUR',
      type: 'ERC-20',
    },
    {
      balance: '0',
      contractAddress: '0x874069fa1eb16d44d622f2e0ca25eea172369bc1',
      decimals: '18',
      name: 'Celo Dollar',
      symbol: 'cUSD',
      type: 'ERC-20',
    },
    {
      balance: '4646922697027429935',
      contractAddress: '0xf194afdf50b03e69bd7d057c1aa9e10c9954e4c9',
      decimals: '18',
      name: 'Celo native asset',
      symbol: 'CELO',
      type: 'ERC-20',
    },
  ],
}))

jest.mock('apollo-datasource-rest', () => {
  class MockRESTDataSource {
    baseUrl = ''
    get = mockDataSourceGet
  }

  return {
    RESTDataSource: MockRESTDataSource,
  }
})

describe('BlockscoutJsonAPI', () => {
  let blockscoutJsonAPI: BlockscoutJsonAPI

  beforeEach(() => {
    blockscoutJsonAPI = new BlockscoutJsonAPI()
    mockDataSourceGet.mockClear()
  })

  it('should return the right fields for each token balance', async () => {
    const result = await blockscoutJsonAPI.fetchUserBalances(
      '0x0000000000000000000000000000000000007E57',
    )

    expect(result).toMatchInlineSnapshot(`
      Array [
        Object {
          "balance": "2871713969586",
          "decimals": "10",
          "symbol": "TT",
          "tokenAddress": "0x048f47d358ec521a6cf384461d674750a3cb58c8",
        },
        Object {
          "balance": "2947248590163445104",
          "decimals": "18",
          "symbol": "cEUR",
          "tokenAddress": "0x10c892a6ec43a53e45d0b916b4b7d383b1b78c0f",
        },
        Object {
          "balance": "0",
          "decimals": "18",
          "symbol": "cUSD",
          "tokenAddress": "0x874069fa1eb16d44d622f2e0ca25eea172369bc1",
        },
        Object {
          "balance": "4646922697027429935",
          "decimals": "18",
          "symbol": "CELO",
          "tokenAddress": "0xf194afdf50b03e69bd7d057c1aa9e10c9954e4c9",
        },
      ]
    `)
  })
})
