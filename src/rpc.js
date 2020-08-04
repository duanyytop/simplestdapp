const {KEYPERING_URL, RICH_NODE_INDEXER_URL, SECP256K1_BLAKE160_CODE_HASH, DAPP_DESCRIPTION} = require("./const");

const getCells = async lockArgs => {
  let payload = {
    id: 1,
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
      "0x3e8"
    ]
  };
  const body = JSON.stringify(payload, null, "  ");
  try {
    let res = await fetch(RICH_NODE_INDEXER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body
    });
    res = await res.json();
    return res.result.objects;
  } catch (error) {
    console.error("error", error);
  }
};

const requestAuth = async description => {
  try {
    let res = await fetch(KEYPERING_URL, {
      method: "POST",
      body: JSON.stringify({
        id: 2,
        jsonrpc: "2.0",
        method: "auth",
        params: {description}
      })
    });
    res = await res.json();
    return res.result.token;
  } catch (error) {
    console.error("error", error);
  }
};

const queryAddresses = async token => {
  try {
    let res = await fetch(KEYPERING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: 3,
        jsonrpc: "2.0",
        method: "query_addresses",
        params: {}
      })
    });
    res = await res.json();
    return res.result;
  } catch (error) {
    console.error("error", error);
  }
};

const signAndSendTransaction = async (rawTx, token, lockHash) => {
  let rawTransaction = rawTx;
  rawTransaction.witnesses[0] = {
    lock: "",
    inputType: "",
    outputType: ""
  };
  try {
    let res = fetch(KEYPERING_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        id: 4,
        jsonrpc: "2.0",
        method: "sign_and_send_transaction",
        params: {tx: rawTransaction, lockHash, description: DAPP_DESCRIPTION}
      })
    });
    res = await res.json();
    return res.result;
  } catch (error) {
    console.error("error", error);
  }
};

module.exports = {getCells, requestAuth, queryAddresses, signAndSendTransaction};
