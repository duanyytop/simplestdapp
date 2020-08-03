const BN = require("bn.js");

const RICH_NODE_RPC_URL = "https://prototype.ckbapp.dev/testnet/rpc";
const RICH_NODE_INDEXER_URL = "https://prototype.ckbapp.dev/testnet/indexer";
const KEYPERING_URL = "http://localhost:3102";

const MIN_CAPACITY = new BN("6100000000");
const TRANSACTION_FEE = new BN("10000000");
const SECP256K1_BLAKE160_CODE_HASH = "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8";

const Operator = {
  Create: "create",
  Update: "update",
  Delete: "delete"
};

module.exports = {
  RICH_NODE_RPC_URL,
  RICH_NODE_INDEXER_URL,
  MIN_CAPACITY,
  TRANSACTION_FEE,
  SECP256K1_BLAKE160_CODE_HASH,
  KEYPERING_URL,
  Operator
};
