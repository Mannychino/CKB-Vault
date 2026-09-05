"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const core_1 = require("@ckb-ccc/core");
const NETWORK = process.env.CKB_NETWORK ?? "devnet";
const RPC_URL = process.env.CKB_RPC_URL ??
    "http://127.0.0.1:28114";
const RPC_FALLBACK = process.env.CKB_RPC_FALLBACK ??
    "http://127.0.0.1:8114";
const VAULT_TX_HASH = process.env.VAULT_TX_HASH;
const VAULT_INDEX = BigInt(process.env.VAULT_INDEX ??
    "0");
const TX_FEE = BigInt(process.env.VAULT_WITHDRAW_FEE ??
    "100000");
const DEPLOYMENT_DIR = process.env.CKB_DEPLOYMENT_DIR ??
    node_path_1.default.resolve(process.cwd(), "contracts/vault-lock/deployment");
const SCRIPTS_PATH = process.env.CKB_VAULT_SCRIPTS_PATH ??
    node_path_1.default.join(DEPLOYMENT_DIR, "scripts.json");
const SYSTEM_SCRIPTS_PATH = process.env.CKB_SYSTEM_SCRIPTS_PATH ??
    node_path_1.default.join(DEPLOYMENT_DIR, "system-scripts.json");
function readJsonFile(filePath) {
    try {
        return JSON.parse((0, node_fs_1.readFileSync)(filePath, "utf8"));
    }
    catch (error) {
        throw new Error(`Failed to read ${filePath}: ${String(error)}`);
    }
}
function loadVaultDeployment() {
    const deployments = readJsonFile(SCRIPTS_PATH);
    const network = deployments[NETWORK];
    if (!network) {
        throw new Error(`Network "${NETWORK}" not found in ${SCRIPTS_PATH}`);
    }
    const vault = network["vault-lock"];
    if (!vault) {
        throw new Error(`vault-lock deployment not found for "${NETWORK}"`);
    }
    if (!vault.cellDeps ||
        vault.cellDeps.length === 0) {
        throw new Error("vault-lock deployment has no CellDep");
    }
    return vault;
}
function toKnownScript(script) {
    return {
        codeHash: script.codeHash,
        hashType: script.hashType,
        cellDeps: script.cellDeps,
    };
}
function loadSystemScripts() {
    const file = readJsonFile(SYSTEM_SCRIPTS_PATH);
    const scripts = file[NETWORK];
    if (!scripts) {
        throw new Error(`Network "${NETWORK}" not found in ${SYSTEM_SCRIPTS_PATH}`);
    }
    const getScript = (name) => {
        const entry = scripts[name];
        if (!entry) {
            throw new Error(`System script "${name}" not found`);
        }
        return entry.script;
    };
    return {
        [core_1.KnownScript.Secp256k1Blake160]: toKnownScript(getScript("secp256k1_blake160_sighash_all")),
        [core_1.KnownScript.Secp256k1Multisig]: toKnownScript(getScript("secp256k1_blake160_multisig_all")),
        [core_1.KnownScript.NervosDao]: toKnownScript(getScript("dao")),
        [core_1.KnownScript.AnyoneCanPay]: toKnownScript(getScript("anyone_can_pay")),
        [core_1.KnownScript.OmniLock]: toKnownScript(getScript("omnilock")),
        [core_1.KnownScript.XUdt]: toKnownScript(getScript("xudt")),
    };
}
function createClient() {
    if (NETWORK !== "devnet") {
        throw new Error(`Only devnet is currently supported. Received: ${NETWORK}`);
    }
    return new core_1.ccc.ClientPublicTestnet({
        url: RPC_URL,
        scripts: loadSystemScripts(),
        fallbacks: RPC_FALLBACK
            ? [RPC_FALLBACK]
            : [],
    });
}
function decodeTimelock(data) {
    const hex = data.slice(2);
    if (hex.length < 16) {
        throw new Error(`Vault data must contain at least 8 bytes. Received: ${data}`);
    }
    const firstEightBytes = hex.slice(0, 16);
    const bytes = firstEightBytes.match(/.{2}/g);
    if (!bytes) {
        throw new Error(`Unable to decode vault timelock: ${data}`);
    }
    const bigEndian = bytes
        .reverse()
        .join("");
    return BigInt(`0x${bigEndian}`);
}
async function main() {
    console.log("Connecting to CKB devnet...");
    console.log("RPC:", RPC_URL);
    console.log("Deployment config:", SCRIPTS_PATH);
    console.log("System scripts:", SYSTEM_SCRIPTS_PATH);
    if (!VAULT_TX_HASH) {
        throw new Error("VAULT_TX_HASH is not set");
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(VAULT_TX_HASH)) {
        throw new Error("VAULT_TX_HASH must be a 32-byte transaction hash");
    }
    const privateKey = process.env.CKB_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("CKB_PRIVATE_KEY is not set");
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
        throw new Error("CKB_PRIVATE_KEY must be 0x followed by 64 hexadecimal characters");
    }
    const client = createClient();
    const signer = new core_1.ccc.SignerCkbPrivateKey(client, privateKey);
    const destination = await signer.getRecommendedAddressObj();
    console.log("Withdraw destination:", await signer.getRecommendedAddress());
    const vaultDeployment = loadVaultDeployment();
    const vaultCellDep = vaultDeployment
        .cellDeps[0]
        .cellDep;
    console.log("\nVault code hash:", vaultDeployment.codeHash);
    console.log("Vault hash type:", vaultDeployment.hashType);
    console.log("Vault CellDep:", `${vaultCellDep.outPoint.txHash}:${vaultCellDep.outPoint.index}`);
    const vaultOutPoint = core_1.ccc.OutPoint.from({
        txHash: VAULT_TX_HASH,
        index: VAULT_INDEX,
    });
    console.log("\nChecking vault Cell...");
    console.log("Vault OutPoint:", `${VAULT_TX_HASH}:${VAULT_INDEX}`);
    const vaultCell = await client.getCell(vaultOutPoint);
    if (!vaultCell) {
        throw new Error(`Vault Cell is not live: ${VAULT_TX_HASH}:${VAULT_INDEX}`);
    }
    console.log("Vault Cell is live.");
    const vaultLock = vaultCell.cellOutput.lock;
    if (vaultLock.codeHash !==
        vaultDeployment.codeHash) {
        throw new Error(`Vault Cell codeHash does not match current vault-lock deployment`);
    }
    if (vaultLock.hashType !==
        vaultDeployment.hashType) {
        throw new Error(`Vault Cell hashType does not match current vault-lock deployment`);
    }
    console.log("Vault capacity:", vaultCell.cellOutput.capacity.toString(), "Shannons");
    console.log("Vault data:", vaultCell.outputData);
    const timelock = decodeTimelock(vaultCell.outputData);
    console.log("Decoded timelock:", timelock.toString());
    if (vaultCell.cellOutput.capacity <=
        TX_FEE) {
        throw new Error("Vault capacity is smaller than or equal to withdrawal fee");
    }
    const withdrawCapacity = vaultCell.cellOutput.capacity -
        TX_FEE;
    const vaultDepOutPoint = core_1.ccc.OutPoint.from({
        txHash: vaultCellDep
            .outPoint
            .txHash,
        index: vaultCellDep
            .outPoint
            .index,
    });
    const tx = core_1.ccc.Transaction.from({
        inputs: [
            {
                previousOutput: vaultOutPoint,
                since: timelock,
            },
        ],
        outputs: [
            {
                capacity: withdrawCapacity,
                lock: destination.script,
            },
        ],
        outputsData: [
            "0x",
        ],
    });
    tx.cellDeps.push(core_1.ccc.CellDep.from({
        outPoint: vaultDepOutPoint,
        depType: vaultCellDep.depType,
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
    tx.cellDeps.forEach((dep, index) => {
        console.log(`CellDep ${index}: ${dep.outPoint.txHash}:${dep.outPoint.index} depType=${dep.depType}`);
    });
    console.log("\nBroadcasting withdrawal...");
    const txHash = await client.sendTransaction(tx);
    console.log("\n========================================");
    console.log("VAULT WITHDRAWN");
    console.log("========================================");
    console.log("Transaction hash:", txHash);
    console.log("New output Cell:", `${txHash}:0`);
    console.log("Returned capacity:", withdrawCapacity.toString(), "Shannons");
}
main().catch((error) => {
    console.error("\n========================================");
    console.error("WITHDRAW FAILED");
    console.error("========================================");
    console.error(error);
    process.exit(1);
});
