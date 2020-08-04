<template>
  <div id="app">
    <div id="appContent">
      <h1>
        Simplest DApp on CKB
        <a href="https://github.com/liusong1111/simplestdapp" target="_blank">(Source Code)</a>
      </h1>

      <div class="auth">
        <button @click.prevent="getAuth()">Request Auth</button>
        <button @click.prevent="reload()">Reload{{ (loading && "ing..") || "" }}</button>
      </div>
      <form>
        <div class="panel">
          <div class="row">
            <label for="address">Testnet address:</label>
            <input id="address" disabled :value="address" />
          </div>
          <div class="row">
            <label>Balance without data(CKB):</label>
            <input :value="formatCkb(summary.free)" disabled />
          </div>
          <div class="row">
            <label>Balance (CKB):</label>
            <input :value="formatCkb(summary.capacity)" disabled />
            <a href="https://faucet.nervos.org/" target="_blank">Get More</a>
          </div>
        </div>
      </form>
      <div class="cells">
        <h3>
          Data Cell List
          <button @click.prevent="newCell()">Create Cell</button>
          <button @click.prevent="reload()">Refresh{{ (loading && "ing..") || "" }}</button>
        </h3>
        <div v-if="!filledCells" class="no-data">No Data Cells</div>
        <div>
          <div class="cell" v-for="cell in filledCells" :key="cell.out_point.tx_hash + cell.out_point.index">
            <div class="cell-header">
              Capacity: {{ formatCkb(cell.output.capacity) }}
              <div class="cell-ops">
                <button @click.prevent="deleteCell(cell)">Delete</button>
                <button @click.prevent="editCell(cell)">Update</button>
              </div>
            </div>
            <div class="cell-body">
              Data:
              {{ handleOutputData(cell.output_data) }}
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
          <div class="model-buttons">
            <button @click.prevent="cancelModel()">Cancel</button>
            <button @click.prevent="submitModel()">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import * as BN from "bn.js";
import {hexToBytes} from "@nervosnetwork/ckb-sdk-utils";
import {formatCkb, textToHex, hexToText, getRawTxTemplate, getSummary, groupCells} from "./utils";
import {MIN_CAPACITY, TRANSACTION_FEE, Operator} from "./const";
import {getCells, requestAuth, queryAddresses, signAndSendTransaction} from "./rpc";

export default {
  name: "App",
  data: function() {
    return {
      address: "",
      lockScript: {},
      lockHash: "",
      emptyCells: [],
      filledCells: [],
      summary: {
        inuse: 0,
        free: 0,
        capacity: 0
      },
      showModel: false,
      mode: Operator.Create,
      editData: "",
      loading: false
    };
  },
  components: {},
  methods: {
    reload: async function() {
      const authToken = window.localStorage.getItem("authToken");
      if (!authToken) {
        console.error("No auth token");
        return;
      }
      this.loading = true;
      try {
        const addresses = (await queryAddresses(authToken)).addresses;
        if (addresses && addresses.length > 0) {
          this.address = addresses[0].address;
          this.lockScript = addresses[0].lockScript;
          this.lockHash = addresses[0].lockHash;
          const lockArgs = addresses[0].lockScript.args;
          const cells = await getCells(lockArgs);
          this.loading = false;
          if (cells && cells.length > 0) {
            this.summary = getSummary(cells);
            const {emptyCells, filledCells} = groupCells(cells);
            this.emptyCells = emptyCells;
            this.filledCells = filledCells;
          }
        }
      } catch (error) {
        console.error(error);
        this.loading = false;
      }
    },

    getAuth: async function() {
      try {
        const token = await requestAuth("Simplest DApp");
        window.localStorage.setItem("authToken", token);
        await this.reload();
      } catch (error) {
        console.error(error);
      }
    },

    formatCkb: function(value) {
      return formatCkb(value);
    },

    handleOutputData: function(data) {
      return hexToText(data);
    },

    cancelModel: function() {
      this.showModel = false;
    },

    newCell: function() {
      this.showModel = true;
      this.editData = "";
      this.mode = Operator.Create;
      this.currentCell = null;
    },

    editCell: function(cell) {
      this.showModel = true;
      this.editData = hexToText(cell.output_data);
      this.mode = Operator.Update;
      this.currentCell = cell;
    },

    submitModel: function() {
      this.operateCell();
    },

    deleteCell: function(cell) {
      if (!confirm("Are you sure to delete this cell?")) {
        return;
      }
      this.editData = "";
      this.mode = Operator.Delete;
      this.currentCell = cell;
      this.operateCell();
    },

    operateCell: async function() {
      const rawTx = getRawTxTemplate();
      let outputCapacity = new BN(0);

      // Generate outputs and outputsData
      if (this.mode === Operator.Create || this.mode === Operator.Update) {
        const data = textToHex(this.editData);
        if (!data || data.length % 2 !== 0) {
          alert("The length of data must be an even number");
          return;
        }
        outputCapacity = outputCapacity.add(new BN(hexToBytes(data).byteLength * 100000000)).add(MIN_CAPACITY);

        rawTx.outputs.push({
          capacity: `0x${outputCapacity.toString(16)}`,
          lock: this.lockScript
        });
        rawTx.outputsData.push(data);
      }
      outputCapacity = outputCapacity.add(TRANSACTION_FEE);

      // Collect inputs
      let cells = this.emptyCells;
      let inputCapacity = new BN(0);
      if (this.mode === Operator.Update || this.mode === Operator.Delete) {
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
        inputCapacity = inputCapacity.add(new BN(parseInt(cell.output.capacity)));

        if (inputCapacity.sub(outputCapacity).gte(MIN_CAPACITY)) {
          const changeCapacity = inputCapacity.sub(outputCapacity);
          rawTx.outputs.push({
            capacity: `0x${changeCapacity.toString(16)}`,
            lock: this.lockScript
          });
          rawTx.outputsData.push("0x");
          break;
        }
      }
      if (inputCapacity.sub(outputCapacity).lt(MIN_CAPACITY)) {
        alert("You have not enough CKB!");
        return;
      }
      const authToken = window.localStorage.getItem("authToken");
      if (!authToken) {
        console.error("No auth token");
        return;
      }
      await signAndSendTransaction(rawTx, authToken, this.lockHash);
      this.showModel = false;
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

h1,
h3 {
  text-align: center;
}

h3 button {
  margin-left: 16px;
}

a {
  color: #3248db;
}

.panel {
  display: block;
  border-radius: 2px;
  border: solid 1px #cccccc;
  padding: 8px 0;
}

.auth {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 12px 0;
}

.auth button {
  margin: 0 12px;
}

.row {
  display: flex;
  align-items: flex-end;
  padding: 12px 0;
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

.cell-ops button {
  margin-left: 12px;
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
  height: 100vh;
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

.model-buttons {
  display: flex;
  justify-content: space-around;
  margin-top: 12px;
}
</style>
