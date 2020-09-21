const BN = require('bn.js')

export const RICH_NODE_RPC_URL = 'https://prototype.ckbapp.dev/testnet/rpc'
export const RICH_NODE_INDEXER_URL = 'https://prototype.ckbapp.dev/testnet/indexer'
export const KEYPERING_URL = 'http://localhost:3102'

export const MIN_CAPACITY = new BN('6100000000')
export const TRANSACTION_FEE = new BN('10000000')
export const SECP256K1_BLAKE160_CODE_HASH = '0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8'

export const DAPP_DESCRIPTION = 'Simplest DApp are requesting to sign and send transactions'

export const Operator = {
  Create: 'create',
  Update: 'update',
  Delete: 'delete',
}
