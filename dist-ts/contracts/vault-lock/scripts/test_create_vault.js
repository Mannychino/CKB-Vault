"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@ckb-ccc/core");
const RPC_URL = "http://127.0.0.1:8114";
const VAULT_LOCK_CODE_HASH = "0x6c4c1c2174b32852799498439844ff66100fba73d10b4b8941f800b14d50496b";
const VAULT_LOCK_HASH_TYPE = "data2";
const VAULT_LOCK_DEP_TX_HASH = "0xb596420ac646a86316d6133df789d3f8fe3495970265587f266f380492e59484";
const VAULT_LOCK_DEP_INDEX = 0n;
const VAULT_AMOUNT = "5000";
const TIMELOCK = 100n;
async function main() {
    console.log("Connecting to CKB devnet...");
    const client = new core_1.ccc.ClientPublicTestnet({
        url: RPC_URL,
    });
    const signer = new core_1.ccc.SignerCkbPrivateKey(client, process.env.CKB_PRIVATE_KEY);
    console.log("Signer:", await signer.getRecommendedAddress());
    // --------------------------------------------------
    // 1. Define the vault lock
    // --------------------------------------------------
    const vaultLock = core_1.ccc.Script.from({
        codeHash: VAULT_LOCK_CODE_HASH,
        hashType: VAULT_LOCK_HASH_TYPE,
        args: "0x",
    });
    // --------------------------------------------------
    // 2. Encode timelock
    // --------------------------------------------------
    const timelockBytes = new Uint8Array(8);
    new DataView(timelockBytes.buffer).setBigUint64(0, TIMELOCK, true);
    const timelockData = core_1.ccc.hexFrom(timelockBytes);
    // --------------------------------------------------
    // 3. Add the vault contract dependency
    // --------------------------------------------------
    const vaultDep = core_1.ccc.OutPoint.from({
        txHash: VAULT_LOCK_DEP_TX_HASH,
        index: VAULT_LOCK_DEP_INDEX,
    });
    // --------------------------------------------------
    // 4. Create transaction with ONLY the desired output
    // --------------------------------------------------
    const tx = core_1.ccc.Transaction.from({
        outputs: [
            {
                capacity: core_1.ccc.fixedPointFrom(VAULT_AMOUNT),
                lock: vaultLock,
            },
        ],
        outputsData: [timelockData],
        cellDeps: [
            {
                outPoint: vaultDep,
                depType: "code",
            },
        ],
    });
    console.log("\nVault transaction created.");
    // --------------------------------------------------
    // 5. Let CCC find funding cells
    // --------------------------------------------------
    console.log("Finding funding cells...");
    await tx.completeInputsByCapacity(signer);
    console.log(`Inputs selected: ${tx.inputs.length}`);
    // --------------------------------------------------
    // 6. Let CCC calculate fee + change
    // --------------------------------------------------
    console.log("Calculating fee and change...");
    await tx.completeFeeBy(signer);
    console.log(`Final inputs: ${tx.inputs.length}`);
    console.log(`Final outputs: ${tx.outputs.length}`);
    console.log(`Cell deps: ${tx.cellDeps.length}`);
    // --------------------------------------------------
    // 7. Print transaction before sending
    // --------------------------------------------------
    console.log("\n==============================");
    console.log("FINAL TRANSACTION");
    console.log("==============================");
    console.log("\nInputs:");
    tx.inputs.forEach((input, i) => {
        console.log(`${i}: ${input.previousOutput.txHash}:${input.previousOutput.index}`);
    });
    console.log("\nCellDeps:");
    tx.cellDeps.forEach((dep, i) => {
        console.log(`${i}: ${dep.outPoint.txHash}:${dep.outPoint.index}`, `depType=${dep.depType}`);
    });
    console.log("\nOutputs:");
    tx.outputs.forEach((output, i) => {
        console.log(`${i}: ${core_1.ccc.fixedPointToString(output.capacity)} CKB`);
    });
    console.log("\nOutput data:");
    tx.outputsData.forEach((data, i) => {
        console.log(`${i}: ${data}`);
    });
    // --------------------------------------------------
    // 8. Send
    // --------------------------------------------------
    console.log("\nSending transaction...");
    const txHash = await signer.sendTransaction(tx);
    console.log("\n================================");
    console.log("VAULT CREATED");
    console.log("================================");
    console.log("Transaction hash:", txHash);
}
main().catch((error) => {
    console.error("\nFailed:", error);
    process.exit(1);
});
