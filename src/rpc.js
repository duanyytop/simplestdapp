const {RICH_NODE_INDEXER_URL, SECP256K1_BLAKE160_CODE_HASH} = require("./const");

const fetchCells = async lockArgs => {
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

module.exports = {fetchCells};
