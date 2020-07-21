const {utf8ToBytes, bytesToHex, hexToUtf8} = require("@nervosnetwork/ckb-sdk-utils");

const formatCkb = value => {
  if (typeof value === "undefined") {
    return undefined;
  }
  let fraction = value % 100000000;
  fraction = fraction.toString().padStart(8, "0");
  let integer = Math.floor(value / 100000000);
  const format = new Intl.NumberFormat({useGrouping: true});
  integer = format.format(integer);
  return integer + "." + fraction;
};

const textToHex = text => {
  let result = text.trim();
  if (result.startsWith("0x")) {
    return result;
  }
  const bytes = utf8ToBytes(result);
  result = bytesToHex(bytes);
  return result;
};

const hexToText = hex => {
  let result = hex.trim();
  try {
    result = hexToUtf8(result);
    let isAscii = true;
    for (let i = 0; i < result.length; i++) {
      if (result.charCodeAt(i) > 255) {
        isAscii = false;
        break;
      }
    }
    return isAscii ? result : hex.trim();
  } catch (error) {
    console.error("hexToUtf8 error:", error);
  }
  return result;
};

const getSummary = cells => {
  let capacity = 0;
  let inuse = 0;
  let free = 0;
  for (let cell of cells) {
    const _capacity = parseInt(cell.output.capacity);
    capacity += _capacity;

    if (cell.output_data === "0x") {
      free += _capacity;
    } else {
      inuse += _capacity;
    }
  }
  return {
    inuse,
    capacity,
    free
  };
};

const getRawTxTemplate = () => {
  return {
    version: "0x0",
    cellDeps: [
      {
        outPoint: {
          txHash: "0xf8de3bb47d055cdf460d93a2a6e1b05f7432f9777c8c474abf4eec1d4aee5d37",
          index: "0x0"
        },
        depType: "depGroup"
      }
    ],
    headerDeps: [],
    inputs: [],
    outputs: [],
    witnesses: [],
    outputsData: []
  };
};

const groupCells = cells => {
  return {
    emptyCells: cells.filter(cell => cell.output_data === "0x"),
    filledCells: cells.filter(cell => cell.output_data !== "0x")
  };
};

module.exports = {formatCkb, textToHex, hexToText, getSummary, getRawTxTemplate, groupCells};
