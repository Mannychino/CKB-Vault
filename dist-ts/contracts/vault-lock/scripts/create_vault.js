"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@ckb-ccc/core");
const RPC_URL = "http://127.0.0.1:8114";
// Already deployed vault-lock contract
const VAULT_LOCK_CODE_HASH = "0x6c4c1c2174b32852799498439844ff66100fba73d10b4b8941f800b14d50496b";
const VAULT_LOCK_HASH_TYPE = "data2";
// Deployment Cell Dependency
const VAULT_LOCK_DEP_TX_HASH = "0x2f7577de9ac8cb93e89f06a82c387ef8634b81bc2830d09577fccca48cf17b01";
const VAULT_LOCK_DEP_INDEX = 0n;
// Test parameters
const VAULT_AMOUNT = "5000";
const TIMELOCK = 100n;
async function main() {
    const client = new core_1.ccc.ClientPublicTestnet({
        url: RPC_URL,
    });
    console.log("Connected to CKB devnet!");
    const tip = await client.getTip();
    console.log("Tip block:", tip.toString());
    const privateKey = process.env.CKB_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("CKB_PRIVATE_KEY is not set. Export the private key for OffCKB account #0 first.");
    }
    console.log("Creating signer...");
    const signer = new core_1.ccc.SignerCkbPrivateKey(client, privateKey);
    console.log("Signer created.");
    console.log("Connecting signer...");
    await signer.connect();
    console.log("Signer connected.");
    console.log("Getting sender address...");
    const senderAddress = await signer.getRecommendedAddress();
    console.log("Sender:", senderAddress);
    const vaultLock = core_1.ccc.Script.from({
        codeHash: VAULT_LOCK_CODE_HASH,
        hashType: VAULT_LOCK_HASH_TYPE,
        args: "0x",
    });
    console.log("Vault lock script created.");
    const timelockBytes = new Uint8Array(8);
    new DataView(timelockBytes.buffer).setBigUint64(0, TIMELOCK, true);
    const timelockData = core_1.ccc.hexFrom(timelockBytes);
    console.log("Timelock:", TIMELOCK.toString());
    console.log("Timelock data:", timelockData);
    const vaultCapacity = core_1.ccc.fixedPointFrom(VAULT_AMOUNT);
    const tx = core_1.ccc.Transaction.from({
        outputs: [
            {
                capacity: vaultCapacity,
                lock: vaultLock,
            },
        ],
        outputsData: [
            timelockData,
        ],
    });
    tx.cellDeps.push(core_1.ccc.CellDep.from({
        outPoint: core_1.ccc.OutPoint.from({
            txHash: VAULT_LOCK_DEP_TX_HASH,
            index: 0n,
        }),
        depType: "code",
    }));
    // --------------------------------------------------
    // 7. Find funding cells from account #0
    // --------------------------------------------------
    console.log("Selecting funding cells...");
    await tx.completeInputsByCapacity(signer);
    // --------------------------------------------------
    // 8. Calculate fee + create change cell
    // --------------------------------------------------
    await tx.completeFeeBy(signer);
    console.log("Transaction prepared.");
    // --------------------------------------------------
    // 9. Send transaction
    // --------------------------------------------------
    console.log("Sending transaction...");
    const txHash = await signer.sendTransaction(tx);
    console.log("Vault transaction sent!");
    console.log("Transaction hash:", txHash);
    // --------------------------------------------------
    // 10. Wait for confirmation
    // --------------------------------------------------
    console.log("Waiting for confirmation...");
    const confirmed = await client.waitTransaction(txHash, 1);
    if (confirmed) {
        console.log("Vault transaction confirmed in block:", confirmed.blockNumber?.toString());
    }
    else {
        console.log("Transaction was sent but not yet confirmed.");
    }
}
main().catch((error) => {
    console.error("Failed to create vault:");
    console.error(error);
    process.exit(1);
});
