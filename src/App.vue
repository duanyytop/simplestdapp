<template>
  <div id="app">
    <div id="appContent">
      <h1>
        Simplest dApp on CKB
        <a
          href="https://github.com/liusong1111/simplestdapp"
          target="_blank"
        >(Source Code)</a>
      </h1>
      <form>
        <div class="panel">
          <div class="row">
            <label for="private_key">Please input test private key:</label>
            <input id="private_key" v-model="privateKey" />
            <button @click.prevent="reload">Confirm</button>
          </div>
          <div class="row">
            <label for="address">Testnet address:</label>
            <input id="address" disabled :value="address" />
          </div>
          <div class="row">
            <label for="balance">Balance (CKB):</label>
            <input id="balance" :value="formatCkb(summary.free)" disabled />
            <a href="https://faucet.nervos.org/" target="_blank">Get More</a>
          </div>
        </div>
      </form>
      <div class="cells">
        <h3>
          Data Cell List
          <button @click.prevent="newCell()">Create Cell</button>
          <button @click.prevent="reload()">Refresh{{loading && "ing.." || ""}}</button>
        </h3>
        <div v-if="!filledCells" class="no-data">No Data Cells</div>
        <div>
          <div
            class="cell"
            v-for="cell in filledCells"
            :key="cell.out_point.tx_hash + cell.out_point.index"
          >
            <div class="cell-header">
              Capacity: {{formatCkb(cell.output.capacity)}}
              <div class="cell-ops">
                <a href="#" @click.prevent="deleteCell(cell)">Delete</a>
                &nbsp;&nbsp;
                <a href="#" @click.prevent="editCell(cell)">Update</a>
              </div>
            </div>
            <div class="cell-body">
              Data:
              {{handleOutputData(cell.output_data)}}
            </div>
          </div>
        </div>
      </div>
      <div id="model" :class="{hidden: !this.showModel}">
        <div class="model-content">
          <h3>Input Data Content</h3>
          <div>
            <textarea v-model="editData" placeholder="content in hex-string format"></textarea>
          </div>
          <div>
            <button @click.prevent="cancelModel()">Cancel</button>
            <button @click.prevent="submitModel()" style="float:right">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as BN from "bn.js";
import {
  hexToBytes,
  privateKeyToPublicKey,
  pubkeyToAddress,
  blake160
} from "@nervosnetwork/ckb-sdk-utils";
import CKB from "@nervosnetwork/ckb-sdk-core";
import {
  formatCkb,
  textToHex,
  hexToText,
  getRawTxTemplate,
  getSummary,
  groupCells
} from "./utils";
import {
  RICH_NODE_RPC_URL,
  MIN_CAPACITY,
  TRANSACTION_FEE,
  SECP256K1_BLAKE160_CODE_HASH
} from "./const";
import { fetchCells } from "./rpc";

export default {
  name: "App",
  data: function() {
    return {
      privateKey: "",
      address: "",
      lockScript: undefined,
      lockArgs: undefined,
      cells: [],
      emptyCells: [],
      filledCells: [],
      summary: {
        inuse: 0,
        free: 0,
        capacity: 0
      },
      showModel: false,
      mode: undefined,
      editData: "",
      loading: false
    };
  },
  components: {},
  methods: {
    reload: async function() {
      this.loading = true;
      const publicKey = privateKeyToPublicKey(`0x${this.privateKey}`);
      this.address = pubkeyToAddress(publicKey, { prefix: "ckt" });
      this.lockArgs = `0x${blake160(publicKey, "hex")}`;
      this.lockScript = {
        codeHash: SECP256K1_BLAKE160_CODE_HASH,
        hashType: "type",
        args: this.lockArgs
      };
      try {
        this.cells = await this.getCells(this.lockArgs);
      } catch (error) {
        alert("error:" + error);
        console.error(error);
      }
      this.loading = false;
      this.summary = getSummary(this.cells);
      const { emptyCells, filledCells } = groupCells(this.cells);
      this.emptyCells = emptyCells;
      this.filledCells = filledCells;
    },

    formatCkb: value => formatCkb(value),

    handleOutputData: data => hexToText(data),

    cancelModel: function() {
      this.showModel = false;
    },

    newCell: function() {
      this.showModel = true;
      this.editData = "";
      this.mode = "create";
      this.currentCell = null;
    },

    editCell: function(cell) {
      this.showModel = true;
      this.editData = hexToText(cell.output_data);
      this.mode = "update";
      this.currentCell = cell;
    },

    submitModel: function() {
      this.opCell();
    },

    deleteCell: function(cell) {
      if (!confirm("Are you sure to delete this cell?")) {
        return;
      }
      this.editData = "";
      this.mode = "delete";
      this.currentCell = cell;
      this.opCell();
    },

    opCell: async function() {
      const rawTx = getRawTxTemplate();
      let total = new BN(0);

      if (this.mode === "create" || this.mode === "update") {
        const editData = textToHex(this.editData);
        let bytes = hexToBytes(editData);
        let byteLength = bytes.byteLength;
        let capacity = new BN(byteLength * 100000000);
        // State Rent
        capacity = capacity.add(MIN_CAPACITY).add(TRANSACTION_FEE);

        rawTx.outputs.push({
          capacity: `0x${capacity.toString(16)}`,
          lock: this.toLock
        });
        rawTx.outputsData.push(editData);
      } else {
        total = TRANSACTION_FEE;
      }

      let cells = this.emptyCells;
      let inputCapacity = new BN(0);
      let ok = false;
      if (this.mode === "update" || this.mode === "delete") {
        cells = [this.currentCell, ...cells];
      }
      for (let cell of cells) {
        rawTx.inputs.push({
          previousOutput: {
            txHash: cell.out_point.tx_hash,
            index: cell.out_point.index
          },
          since: "0x0"
        });
        rawTx.witnesses.push("0x");
        let cellCapacity = new BN(parseInt(cell.output.capacity));
        inputCapacity = inputCapacity.add(cellCapacity);
        if (inputCapacity.gt(total)) {
          if (inputCapacity.sub(total).gt(MIN_CAPACITY)) {
            const change = inputCapacity.sub(total);
            rawTx.outputs.push({
              capacity: `0x${change.toString(16)}`,
              lock: this.toLock
            });
            rawTx.outputsData.push("0x");
          }
          ok = true;
          break;
        }
      }
      if (!ok) {
        alert("You have not enough CKB!");
        return;
      }
      rawTx.witnesses[0] = {
        lock: "",
        inputType: "",
        outputType: ""
      };
      const ckb = new CKB(RICH_NODE_RPC_URL);
      const signedTx = ckb.signTransaction(`0x${this.privateKey}`)(rawTx);
      this.loading = true;
      try {
        await ckb.rpc.sendTransaction(signedTx);
        setTimeout(() => {
          alert(
            "Tx has been broadcasted, please refresh later. Typical block interval is 8~30s"
          );
        }, 0);
      } catch (error) {
        console.error("sendTransaction error:", error);
        alert("error:", error);
      }
      this.loading = false;
      this.showModel = false;
      setTimeout(() => {
        this.reload();
      }, 1000);
    },

    getCells: async function(lockArgs) {
      this.loading = true;
      return await fetchCells(lockArgs);
    }
  }
};
</script>

<style>
    #app {
        font-family: Avenir, Helvetica, Arial, sans-serif;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        width: 100%;
    }

    #appContent {
        width: 900px;
        margin: auto;
    }

    h1, h3 {
        text-align: center;
    }

    h3 button {
        margin-left: 16px;
    }

    a {
        color: #3248DB
    }

    .panel {
        display: block;
        border-radius: 2px;
        border: solid 1px #cccccc;
    }

    .row {
        display: flex;
        align-items: flex-end;
        padding: 16px 0;
    }

    .row label {
        width: 240px;
    }

    .row button {
        margin-left: 16px;
        height: 25px;
    }

    .row a {
        margin-left: 16px;
    }

    label {
        display: table-cell;
        padding: 6px 8px;
        text-align: right;
    }

    input {
        width: 36em;
        height: 24px;
    }

    .no-data {
        background-color: #f0f0f0;
        padding: 20px;
        text-align: center;
    }

    .cell {
        margin: 16px 0;
        padding: 8px;
        border: 1px solid #ccc;
        background-color: #f0f0f0;
    }

    .cell-header {
        padding: 8px;
    }

    .cell-ops {
        float: right;
    }

    .cell-body {
        background-color: #fff;
        padding: 12px;
        word-wrap: break-word;
        word-break: break-all;
    }

    .hidden {
        display: none;
    }

    #model {
        position: absolute;
        z-index: 2;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(128, 128, 128, 0.2);
    }

    #model .model-content {
        position: relative;
        top: 300px;
        margin: auto;
        width: 50em;
        background-color: #ccc;
        padding: 0 20px 20px 20px;
        border: 1px solid #999;
    }

    #model textarea {
        width: 100%;
        height: 10em;
    }


</style>
