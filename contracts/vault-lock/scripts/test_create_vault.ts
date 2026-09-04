import {
  ccc,
  CellDepInfoLike,
  KnownScript,
  Script,
} from "@ckb-ccc/core";

const RPC_URL = "http://127.0.0.1:28114";
const RPC_FALLBACK = "http://127.0.0.1:8114";

const VAULT_LOCK_CODE_HASH =
  "0x6c4c1c2174b32852799498439844ff66100fba73d10b4b8941f800b14d50496b";

const VAULT_LOCK_HASH_TYPE = "data2" as const;

const VAULT_LOCK_DEP_TX_HASH =
  "0xb596420ac646a86316d6133df789d3f8fe3495970265587f266f380492e59484";

const VAULT_LOCK_DEP_INDEX = 0n;

const VAULT_AMOUNT = "5000";
const TIMELOCK = 100n;

type KnownScriptType = Pick<Script, "codeHash" | "hashType"> & {
  cellDeps: CellDepInfoLike[];
};

const DEVNET_SCRIPTS: Record<string, KnownScriptType> = {
  [KnownScript.Secp256k1Blake160]: {
    codeHash:
      "0x9bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },

  [KnownScript.Secp256k1Multisig]: {
    codeHash:
      "0x5c5069eb0857efc65e1bca0c07df34c31663b3622fd3876c876320fc9634e2a8",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 1,
          },
          depType: "depGroup",
        },
      },
    ],
  },

  [KnownScript.NervosDao]: {
    codeHash:
      "0x82d76d1b75fe2fd9a27dfbaa65a039221a380d76c926f378d3f81cf3e7e13f2e",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 2,
          },
          depType: "code",
        },
      },
    ],
  },

  [KnownScript.AnyoneCanPay]: {
    codeHash:
      "0xe09352af0066f3162287763ce4ddba9af6bfaeab198dc7ab37f8c71c9e68bb5b",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 8,
          },
          depType: "code",
        },
      },
    ],
  },

  [KnownScript.OmniLock]: {
    codeHash:
      "0x9c6933d977360f115a3e9cd5a2e0e475853681b80d775d93ad0f8969da343e56",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 7,
          },
          depType: "code",
        },
      },
      {
        cellDep: {
          outPoint: {
            txHash:
              "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
            index: 0,
          },
          depType: "depGroup",
        },
      },
    ],
  },

  [KnownScript.XUdt]: {
    codeHash:
      "0x1a1e4fef34f5982906f745b048fe7b1089647e82346074e0f32c2ece26cf6b1e",
    hashType: "type",
    cellDeps: [
      {
        cellDep: {
          outPoint: {
            txHash:
              "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7",
            index: 6,
          },
          depType: "code",
        },
      },
    ],
  },
};

function createDevnetClient() {
  return new ccc.ClientPublicTestnet({
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

  if (!/^0x[0-9a-fA-F]{64}$/.test(privateKey)) {
    throw new Error("Invalid CKB_PRIVATE_KEY");
  }

  const signer = new ccc.SignerCkbPrivateKey(
    client,
    privateKey,
  );

  const senderAddress =
    await signer.getRecommendedAddress();

  console.log("Signer:", senderAddress);

  const vaultDepOutPoint = ccc.OutPoint.from({
    txHash: VAULT_LOCK_DEP_TX_HASH,
    index: VAULT_LOCK_DEP_INDEX,
  });

  console.log("\nChecking vault contract Cell...");

  const vaultContractCell =
    await client.getCell(vaultDepOutPoint);

  if (!vaultContractCell) {
    throw new Error(
      `Vault contract Cell not found: ${VAULT_LOCK_DEP_TX_HASH}:${VAULT_LOCK_DEP_INDEX}`,
    );
  }

  console.log("Vault contract Cell found.");
  console.log(
    "Contract capacity:",
    vaultContractCell.cellOutput.capacity.toString(),
    "Shannons",
  );

  const vaultLock = ccc.Script.from({
    codeHash: VAULT_LOCK_CODE_HASH,
    hashType: VAULT_LOCK_HASH_TYPE,
    args: "0x",
  });

  const timelockBytes = new Uint8Array(8);

  new DataView(
    timelockBytes.buffer,
  ).setBigUint64(
    0,
    TIMELOCK,
    true,
  );

  const timelockData =
    ccc.hexFrom(timelockBytes);

  console.log("\nVault lock script created.");
  console.log("Timelock:", TIMELOCK.toString());
  console.log("Timelock data:", timelockData);

  const vaultCapacity =
    ccc.fixedPointFrom(VAULT_AMOUNT);

  const tx = ccc.Transaction.from({
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

  tx.cellDeps.push(
    ccc.CellDep.from({
      outPoint: vaultDepOutPoint,
      depType: "code",
    }),
  );

  console.log("\nCreating transaction...");
  console.log(
    "Vault output capacity:",
    vaultCapacity.toString(),
    "Shannons",
  );

  console.log(
    "Vault CellDep:",
    `${VAULT_LOCK_DEP_TX_HASH}:${VAULT_LOCK_DEP_INDEX}`,
  );

  console.log("\nSelecting funding Cells...");

  await tx.completeInputsByCapacity(signer);

  console.log(
    "Inputs selected:",
    tx.inputs.length,
  );

  console.log("\nCalculating fee and change...");

  const [
    additionalInputs,
    changeCreated,
  ] = await tx.completeFeeBy(signer);

  console.log(
    "Additional inputs:",
    additionalInputs,
  );

  console.log(
    "Change created:",
    changeCreated,
  );

  console.log("\n========================================");
  console.log("TRANSACTION");
  console.log("========================================");

  console.log("\nInputs:");

  tx.inputs.forEach((input, i) => {
    console.log(
      `Input ${i}: ${input.previousOutput.txHash}:${input.previousOutput.index}`,
    );
  });

  console.log("\nOutputs:");

  tx.outputs.forEach((output, i) => {
    console.log(
      `Output ${i}: ${output.capacity.toString()} Shannons`,
    );
  });

  console.log("\nOutputsData:");

  tx.outputsData.forEach((data, i) => {
    console.log(
      `OutputData ${i}: ${data}`,
    );
  });

  console.log("\nCellDeps:");

  tx.cellDeps.forEach((dep, i) => {
    console.log(
      `CellDep ${i}: ${dep.outPoint.txHash}:${dep.outPoint.index} depType=${dep.depType}`,
    );
  });

  console.log("\nSending transaction...");

  const txHash =
    await signer.sendTransaction(tx);

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