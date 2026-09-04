"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@ckb-ccc/core");
const RPC_URL = "http://127.0.0.1:28114";
const RPC_FALLBACK = "http://127.0.0.1:8114";
const VAULT_TX_HASH = "0x055f5863e0ce96c6b7c1f2d07d3845974bc6e6b12a58421e499834256045e091";
const VAULT_INDEX = 0n;
const VAULT_LOCK_DEP_TX_HASH = "0xb596420ac646a86316d6133df789d3f8fe3495970265587f266f380492e59484";
const VAULT_LOCK_DEP_INDEX = 0n;
const TIMELOCK = 100n;
const TX_FEE = 100000n;
const DEVNET_SCRIPTS = {
    [core_1.KnownScript.Secp256k1Blake160]: {
        codeHash: "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
        hashType: "type",
        cellDeps: [
            {
                cellDep: {
                    outPoint: {
                        txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
                        index: 0,
                    },
                    depType: "depGroup",
                },
            },
        ],
    },
    [core_1.KnownScript.Secp256k1Multisig]: {
        codeHash: "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
        hashType: "type",
        cellDeps: [
            {
                cellDep: {
                    outPoint: {
                        txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
                        index: 1,
                    },
                    depType: "depGroup",
                },
            },
        ],
    },
    [core_1.KnownScript.NervosDao]: {
        codeHash: "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
        hashType: "type",
        cellDeps: [
            {
                cellDep: {
                    outPoint: {
                        txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
                        index: 2,
                    },
                    depType: "code",
                },
            },
        ],
    },
    [core_1.KnownScript.AnyoneCanPay]: {
        codeHash: "0xe09352af0066f3162287763ce4ddba9af6bfaeab198dc7ab37f8c71c9e68bb5b",
        hashType: "type",
        cellDeps: [
            {
                cellDep: {
                    outPoint: {
                        txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
                        index: 8,
                    },
                    depType: "code",
                },
            },
        ],
    },
    [core_1.KnownScript.OmniLock]: {
        codeHash: "0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56",
        hashType: "type",
        cellDeps: [
            {
                cellDep: {
                    outPoint: {
                        txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
                        index: 7,
                    },
                    depType: "code",
                },
            },
            {
                cellDep: {
                    outPoint: {
                        txHash: "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
                        index: 0,
                    },
                    depType: "depGroup",
                },
            },
        ],
    },
    [core_1.KnownScript.XUdt]: {
        codeHash: "0x1a1e4fef34f5982906f745b048fe7b1089647e82346074e0f32c2ece26cf6b1e",
        hashType: "type",
        cellDeps: [
            {
                cellDep: {
                    outPoint: {
                        txHash: "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
                        index: 6,
                    },
                    depType: "code",
                },
            },
        ],
    },
};
function createDevnetClient() {
    return new core_1.ccc.ClientPublicTestnet({
        url: RPC_URL,
        scripts: DEVNET_SCRIPTS,
        fallbacks: [RPC_FALLBACK],
    });
}
async function main() {
    console.log("Connecting to CKB devnet...");
    const client = createDevnetClient();
    const privateKey = process.env.CKB_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("CKB_PRIVATE_KEY is not set");
    }
    const signer = new core_1.ccc.SignerCkbPrivateKey(client, privateKey);
    const recipientAddress = await signer.getRecommendedAddressObj();
    const recipientLock = recipientAddress.script;
    console.log("Withdraw destination:", await signer.getRecommendedAddress());
    const vaultOutPoint = core_1.ccc.OutPoint.from({
        txHash: VAULT_TX_HASH,
        index: VAULT_INDEX,
    });
    console.log("\nChecking vault Cell...");
    const vaultCell = await client.getCell(vaultOutPoint);
    if (!vaultCell) {
        throw new Error(`Vault Cell is not live: ${VAULT_TX_HASH}:${VAULT_INDEX}`);
    }
    console.log("Vault Cell is live.");
    console.log("Vault capacity:", vaultCell.cellOutput.capacity.toString(), "Shannons");
    console.log("Vault data:", vaultCell.outputData);
    const expectedData = "0x6400000000000000";
    if (vaultCell.outputData !== expectedData) {
        throw new Error(`Unexpected vault data: ${vaultCell.outputData}`);
    }
    const withdrawCapacity = vaultCell.cellOutput.capacity - TX_FEE;
    const vaultDepOutPoint = core_1.ccc.OutPoint.from({
        txHash: VAULT_LOCK_DEP_TX_HASH,
        index: VAULT_LOCK_DEP_INDEX,
    });
    const tx = core_1.ccc.Transaction.from({
        inputs: [
            {
                previousOutput: vaultOutPoint,
                since: TIMELOCK,
            },
        ],
        outputs: [
            {
                capacity: withdrawCapacity,
                lock: recipientLock,
            },
        ],
        outputsData: [
            "0x",
        ],
    });
    tx.cellDeps.push(core_1.ccc.CellDep.from({
        outPoint: vaultDepOutPoint,
        depType: "code",
    }));
    console.log("\n========================================");
    console.log("WITHDRAW TRANSACTION");
    console.log("========================================");
    console.log("Input:", `${VAULT_TX_HASH}:${VAULT_INDEX}`);
    console.log("Input since:", tx.inputs[0].since.toString());
    console.log("Input capacity:", vaultCell.cellOutput.capacity.toString());
    console.log("Output capacity:", withdrawCapacity.toString());
    console.log("Fee:", TX_FEE.toString(), "Shannons");
    console.log("\nCellDeps:");
    tx.cellDeps.forEach((dep, i) => {
        console.log(`CellDep ${i}: ${dep.outPoint.txHash}:${dep.outPoint.index} depType=${dep.depType}`);
    });
    console.log("\nBroadcasting withdrawal...");
    const txHash = await client.sendTransaction(tx);
    console.log("\n========================================");
    console.log("VAULT WITHDRAWN");
    console.log("========================================");
    console.log("Transaction hash:", txHash);
    console.log("New output Cell:", `${txHash}:0`);
}
main().catch((error) => {
    console.error("\n========================================");
    console.error("WITHDRAW FAILED");
    console.error("========================================");
    console.error(error);
    process.exit(1);
});
