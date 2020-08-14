const { bytesToHex, parseAddress, hexToBytes } = require('@nervosnetwork/ckb-sdk-utils')
const { SECP256K1_BLAKE160_CODE_HASH } = require('./const')

const formatCkb = value => {
  if (typeof value === 'undefined') {
    return undefined
  }
  let fraction = value % 100000000
  fraction = fraction.toString().padStart(8, '0')
  let integer = Math.floor(value / 100000000)
  const format = new Intl.NumberFormat({
    useGrouping: true,
  })
  integer = format.format(integer)
  return integer + '.' + fraction
}

const textToHex = text => {
  let result = text.trim()
  if (result.startsWith('0x')) {
    return result
  }
  result = bytesToHex(new TextEncoder().encode(result))
  return result
}

const hexToText = hex => {
  let result = hex.trim()
  try {
    result = new TextDecoder().decode(hexToBytes(result))
  } catch (error) {
    console.error('hexToUtf8 error:', error)
  }
  return result
}

const addressToArgs = address => {
  let payload = parseAddress(address, 'hex')
  return `0x${payload.substring(payload.startsWith('0x') ? 6 : 4)}`
}

const getSummary = cells => {
  const inuse = cells
    .filter(cell => cell.output_data !== '0x')
    .map(cell => parseInt(cell.output.capacity))
    .reduce((acc, curr) => acc + curr, 0)

  const free = cells
    .filter(cell => cell.output_data === '0x')
    .map(cell => parseInt(cell.output.capacity))
    .reduce((acc, curr) => acc + curr, 0)

  const capacity = inuse + free
  return {
    inuse,
    capacity,
    free,
  }
}

const getRawTxTemplate = () => {
  return {
    version: '0x0',
    // secp256k1_blake160 transaction hash and index
    cellDeps: [
      {
        outPoint: {
          txHash: '0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37',
          index: '0x0',
        },
        depType: 'depGroup',
      },
    ],
    headerDeps: [],
    inputs: [],
    outputs: [],
    witnesses: [],
    outputsData: [],
  }
}

const groupCells = cells => {
  return {
    emptyCells: cells.filter(cell => !cell.output_data || cell.output_data === '0x'),
    filledCells: cells.filter(cell => cell.output_data !== '0x'),
  }
}

const getLockScript = args => {
  return {
    codeHash: SECP256K1_BLAKE160_CODE_HASH,
    hashType: 'type',
    args,
  }
}

module.exports = {
  formatCkb,
  textToHex,
  hexToText,
  addressToArgs,
  getSummary,
  getRawTxTemplate,
  groupCells,
  getLockScript,
}
