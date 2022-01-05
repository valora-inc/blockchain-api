import * as utf8 from 'utf8'
import coder from 'web3-eth-abi'
import { Input } from '../../src/helpers/Input'

const comment = '✨'
const inputText = coder.encodeFunctionCall(
  {
    name: 'transferWithComment',
    type: 'function',
    inputs: [
      { type: 'address', name: 'to' },
      { type: 'uint256', name: 'amount' },
      { type: 'string', name: 'comment' },
    ],
  },
  [
    '0x423043cca38e75d7913504fedfd1dd4539cc55b3',
    '1000000000000000000',
    utf8.encode(comment),
  ],
)

const savedInput =
  '0xe1d6aceb000000000000000000000000423043cca38e75d7913504fedfd1dd4539cc55b30000' +
  '000000000000000000000000000000000000000000000de0b6b3a7640000000000000000000000' +
  '000000000000000000000000000000000000000000006000000000000000000000000000000000' +
  '00000000000000000000000000000006c3a2c29cc2a80000000000000000000000000000000000' +
  '000000000000000000'

describe('Blockchain API Utils', () => {
  describe('format-comment-string', () => {
    it('should decode comment correctly', () => {
      const input = Input.fromString(inputText)
      const decoded = input.getTransactionComment()
      expect(decoded).toEqual(comment)
    })
    it('should return empty on too short input', () => {
      const input = Input.fromString('0x10')
      const decoded = input.getTransactionComment()
      expect(decoded).toEqual('')
    })
    it('should return empty on invalid function selector', () => {
      const input = Input.fromString(
        '0x095ea7b30000000000000000000000000000000000000000000000000000000000000' +
          'abe0000000000000000000000000000000000000000000000000214e8348c4f0000',
      )
      const decoded = input.getTransactionComment()
      expect(decoded).toEqual('')
    })
    it('should return empty on malformed input', () => {
      const input = Input.fromString(inputText.slice(0, 80))
      const decoded = input.getTransactionComment()
      expect(decoded).toEqual('')
    })
  })
  describe('AbiEncoder', () => {
    it('should not regress on encodeFuctionCall', () => {
      expect(inputText).toEqual(savedInput)
    })
  })
})
