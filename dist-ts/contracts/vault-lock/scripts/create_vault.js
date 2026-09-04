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
const VAULT_AMOUNT = process.env.VAULT_AMOUNT ??
    "5000";
const TIMELOCK = BigInt(process.env.VAULT_TIMELOCK ??
    "100");
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
    const systemScripts = loadSystemScripts();
    return new core_1.ccc.ClientPublicTestnet({
        url: RPC_URL,
        scripts: systemScripts,
        fallbacks: RPC_FALLBACK
            ? [RPC_FALLBACK]
            : [],
    });
}
function encodeTimelock(timelock) {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setBigUint64(0, timelock, true);
    return core_1.ccc.hexFrom(bytes);
}
async function main() {
    console.log("Connecting to CKB devnet...");
    console.log("RPC:", RPC_URL);
    console.log("Deployment config:", SCRIPTS_PATH);
    console.log("System scripts:", SYSTEM_SCRIPTS_PATH);
    const privateKey = process.env.CKB_PRIVATE_KEY;
    if (!privateKey) {
        throw new Error("CKB_PRIVATE_KEY is not set");
    }
    if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
        throw new Error("CKB_PRIVATE_KEY must be 0x followed by 64 hexadecimal characters");
    }
    const client = createClient();
    const signer = new core_1.ccc.SignerCkbPrivateKey(client, privateKey);
    const signerAddress = await signer.getRecommendedAddress();
    console.log("Signer:", signerAddress);
    const vaultDeployment = loadVaultDeployment();
    const vaultCellDep = vaultDeployment
        .cellDeps[0]
        .cellDep;
    console.log("\nVault code hash:", vaultDeployment.codeHash);
    console.log("Vault hash type:", vaultDeployment.hashType);
    console.log("Vault CellDep:", `${vaultCellDep.outPoint.txHash}:${vaultCellDep.outPoint.index}`);
    const vaultDepOutPoint = core_1.ccc.OutPoint.from({
        txHash: vaultCellDep
            .outPoint
            .txHash,
        index: vaultCellDep
            .outPoint
            .index,
    });
    console.log("\nChecking vault contract Cell...");
    const contractCell = await client.getCell(vaultDepOutPoint);
    if (!contractCell) {
        throw new Error(`Vault contract Cell is not live: ${vaultCellDep.outPoint.txHash}:${vaultCellDep.outPoint.index}`);
    }
    console.log("Vault contract Cell found.");
    const vaultLock = core_1.ccc.Script.from({
        codeHash: vaultDeployment.codeHash,
        hashType: vaultDeployment.hashType,
        args: "0x",
    });
    const timelockData = encodeTimelock(TIMELOCK);
    console.log("\nTimelock:", TIMELOCK.toString());
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
        outPoint: vaultDepOutPoint,
        depType: vaultCellDep.depType,
    }));
    console.log("\nCreating transaction...");
    console.log("Vault output capacity:", vaultCapacity.toString(), "Shannons");
    console.log("\nSelecting funding Cells...");
    await tx.completeInputsByCapacity(signer);
    console.log("Inputs selected:", tx.inputs.length);
    console.log("\nCalculating fee and change...");
    const [additionalInputs, changeCreated,] = await tx.completeFeeBy(signer);
    console.log("Additional inputs:", additionalInputs);
    console.log("Change created:", changeCreated);
    console.log("\n========================================");
    console.log("TRANSACTION");
    console.log("========================================");
    console.log("\nInputs:");
    tx.inputs.forEach((input, index) => {
        console.log(`Input ${index}: ${input.previousOutput.txHash}:${input.previousOutput.index}`);
    });
    console.log("\nOutputs:");
    tx.outputs.forEach((output, index) => {
        console.log(`Output ${index}: ${output.capacity.toString()} Shannons`);
    });
    console.log("\nOutputsData:");
    tx.outputsData.forEach((data, index) => {
        console.log(`OutputData ${index}: ${data}`);
    });
    console.log("\nCellDeps:");
    tx.cellDeps.forEach((dep, index) => {
        console.log(`CellDep ${index}: ${dep.outPoint.txHash}:${dep.outPoint.index} depType=${dep.depType}`);
    });
    console.log("\nSending transaction...");
    const txHash = await signer.sendTransaction(tx);
    console.log("\n========================================");
    console.log("VAULT CREATED");
    console.log("========================================");
    console.log("Transaction hash:", txHash);
    console.log("Vault Cell:", `${txHash}:0`);
    console.log("Vault amount:", VAULT_AMOUNT, "CKB");
    console.log("Timelock:", TIMELOCK.toString());
    console.log("Vault data:", timelockData);
}
main().catch((error) => {
    console.error("\n========================================");
    console.error("FAILED TO CREATE VAULT");
    console.error("========================================");
    console.error(error);
    process.exit(1);
});
