const CKB = require("@nervosnetwork/ckb-sdk-core").default;
const {RICH_NODE_INDEXER_URL, RICH_NODE_RPC_URL, SECP256K1_BLAKE160_CODE_HASH} = require("./const");

const getCells = async lockArgs => {
  let payload = {
    id: 3,
    jsonrpc: "2.0",
    method: "get_cells",
    params: [
      {
        script: {
          code_hash: SECP256K1_BLAKE160_CODE_HASH,
          hash_type: "type",
          args: lockArgs
        },
        script_type: "lock"
      },
      "asc",
      "0x64"
    ]
  };
  const body = JSON.stringify(payload, null, "  ");
  try {
    let res = await fetch(RICH_NODE_INDEXER_URL, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/json"
      }
    });
    res = await res.json();
    return res.result.objects;
  } catch (error) {
    console.error("error", error);
  }
};

const sendTransaction = async (rawTx, privateKey) => {
  let rawTransaction = rawTx;
  rawTransaction.witnesses[0] = {
    lock: "",
    inputType: "",
    outputType: ""
  };
  const ckb = new CKB(RICH_NODE_RPC_URL);
  console.log(privateKey);
  const signedTx = ckb.signTransaction(`0x${privateKey}`)(rawTx);
  try {
    const txHash = await ckb.rpc.sendTransaction(signedTx);
    setTimeout(() => {
      alert(`Transaction has been broadcasted, please refresh later.\nTx hash: ${txHash}`);
    }, 0);
  } catch (error) {
    console.error("sendTransaction error:", error);
    alert("error:", error);
  }
};

module.exports = {getCells, sendTransaction};
