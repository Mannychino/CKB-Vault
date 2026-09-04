
import { ccc } from "@ckb-ccc/core";

const RPC_URL = "http://127.0.0.1:8114";


const VAULT_LOCK_CODE_HASH =
  "0x6c4c1c2174b32852799498439844ff66100fba73d10b4b8941f800b14d50496b";

const VAULT_LOCK_HASH_TYPE = "data2";

// Verified live deployment Cell
const VAULT_LOCK_DEP_TX_HASH =
  "0xb596420ac646a86316d6133df789d3f8fe3495970265587f266f380492e59484";

const VAULT_LOCK_DEP_INDEX = 0n;




const FUNDING_TX_HASH =
  "0x1bb87da347a776a927ab6593e1e10304ca195f8e24279f039008d5e3115b1bf7";

const FUNDING_INDEX = 22n;

// Expected funding capacity:
// 42,000,000 CKB = 4,200,000,000,000,000 Shannons
const FUNDING_CAPACITY = ccc.fixedPointFrom("42000000");

// --------------------------------------------------
// Vault parameters
// --------------------------------------------------

const VAULT_AMOUNT = "5000";
const TIMELOCK = 100n;

async function main() {
  const client = new ccc.ClientPublicTestnet({
    url: RPC_URL,
  });

  console.log("Connected to CKB devnet!");

  const tip = await client.getTip();
  console.log("Tip block:", tip.toString());

  // --------------------------------------------------
  // Signer
  // --------------------------------------------------

  const privateKey = process.env.CKB_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "CKB_PRIVATE_KEY is not set. Export the private key for OffCKB account #0 first.",
    );
  }

  console.log("Creating signer...");

  const signer = new ccc.SignerCkbPrivateKey(
    client,
    privateKey,
  );

  console.log("Signer created.");

  console.log("Connecting signer...");
  await signer.connect();

  console.log("Signer connected.");

  const senderAddress = await signer.getRecommendedAddress();

  console.log("Sender:", senderAddress);

  // --------------------------------------------------
  // Verify funding Cell
  // --------------------------------------------------

  console.log("\nChecking verified funding Cell...");

  const fundingOutPoint = ccc.OutPoint.from({
    txHash: FUNDING_TX_HASH,
    index: FUNDING_INDEX,
  });

  const fundingCell = await client.getCell(fundingOutPoint);

  if (!fundingCell) {
    throw new Error(
      `Funding Cell is not live: ${FUNDING_TX_HASH}:${FUNDING_INDEX}`,
    );
  }

  console.log("Funding Cell found.");
  console.log(
    "Funding capacity:",
    fundingCell.cellOutput.capacity.toString(),
    "Shannons",
  );

  if (fundingCell.cellOutput.capacity !== FUNDING_CAPACITY) {
    throw new Error(
      `Unexpected funding capacity. Expected ${FUNDING_CAPACITY.toString()} Shannons, got ${fundingCell.cellOutput.capacity.toString()} Shannons.`,
    );
  }

  console.log("Funding capacity verified: 42,000,000 CKB.");

  // --------------------------------------------------
  // Verify vault contract CellDep
  // --------------------------------------------------

  console.log("\nChecking vault contract Cell...");

  const vaultDepOutPoint = ccc.OutPoint.from({
    txHash: VAULT_LOCK_DEP_TX_HASH,
    index: VAULT_LOCK_DEP_INDEX,
  });

  const vaultDepCell = await client.getCell(vaultDepOutPoint);

  if (!vaultDepCell) {
    throw new Error(
      `Vault contract Cell is not live: ${VAULT_LOCK_DEP_TX_HASH}:${VAULT_LOCK_DEP_INDEX}`,
    );
  }

  console.log("Vault contract Cell found.");
  console.log(
    "Contract capacity:",
    vaultDepCell.cellOutput.capacity.toString(),
    "Shannons",
  );

  // --------------------------------------------------
  // Create vault lock
  // --------------------------------------------------

  const vaultLock = ccc.Script.from({
    codeHash: VAULT_LOCK_CODE_HASH,
    hashType: VAULT_LOCK_HASH_TYPE,
    args: "0x",
  });

  console.log("\nVault lock script created.");

  // --------------------------------------------------
  // Encode timelock
  // --------------------------------------------------

  const timelockBytes = new Uint8Array(8);

  new DataView(timelockBytes.buffer).setBigUint64(
    0,
    TIMELOCK,
    true,
  );

  const timelockData = ccc.hexFrom(timelockBytes);

  console.log("Timelock:", TIMELOCK.toString());
  console.log("Timelock data:", timelockData);

  // --------------------------------------------------
  // Create transaction with EXPLICIT input
  // --------------------------------------------------

  const vaultCapacity = ccc.fixedPointFrom(VAULT_AMOUNT);

  console.log("\nCreating transaction...");

  const tx = ccc.Transaction.from({
    inputs: [
      {
        previousOutput: fundingOutPoint,
      },
    ],

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

  // --------------------------------------------------
  // Add vault contract CellDep
  // --------------------------------------------------

  tx.cellDeps.push(
    ccc.CellDep.from({
      outPoint: vaultDepOutPoint,
      depType: "code",
    }),
  );

  console.log("Explicit input:", `${FUNDING_TX_HASH}:${FUNDING_INDEX}`);
  console.log(
    "Vault output capacity:",
    vaultCapacity.toString(),
    "Shannons",
  );
  console.log("CellDep:", `${VAULT_LOCK_DEP_TX_HASH}:0`);

  // --------------------------------------------------
  // Calculate fee and create change
  // --------------------------------------------------

  console.log("\nCalculating fee and change...");

  const [addedInputs, hasChange] = await tx.completeFeeBy(
    signer,
    undefined,
    undefined,
    {
      shouldAddInputs: false,
    },
  );

  console.log("Additional inputs added by completeFeeBy:", addedInputs);
  console.log("Change created:", hasChange);

  // --------------------------------------------------
  // Inspect transaction before sending
  // --------------------------------------------------

  console.log("\nTransaction prepared.");

  console.log("Input count:", tx.inputs.length);
  console.log("Output count:", tx.outputs.length);
  console.log("CellDep count:", tx.cellDeps.length);

  for (let i = 0; i < tx.outputs.length; i++) {
    console.log(
      `Output ${i} capacity:`,
      tx.outputs[i].capacity.toString(),
      "Shannons",
    );
  }

  // --------------------------------------------------
  // Send transaction
  // --------------------------------------------------
console.log("\nCellDeps before send:");

tx.cellDeps.forEach((dep, i) => {
  console.log(
    `CellDep ${i}:`,
    `${dep.outPoint.txHash}:${dep.outPoint.index}`,
    "depType:",
    dep.depType,
  );
});

console.log("\nInputs before send:");

tx.inputs.forEach((input, i) => {
  console.log(
    `Input ${i}:`,
    `${input.previousOutput.txHash}:${input.previousOutput.index}`,
  );
});

  console.log("\nSending transaction...");

  console.log("\nCellDeps before send:");

tx.cellDeps.forEach((dep, i) => {
  console.log(
    `CellDep ${i}:`,
    `${dep.outPoint.txHash}:${dep.outPoint.index}`,
    "depType:",
    dep.depType,
  );
});console.log("\nCellDeps before send:");

tx.cellDeps.forEach((dep, i) => {
  console.log(
    `CellDep ${i}:`,
    `${dep.outPoint.txHash}:${dep.outPoint.index}`,
    "depType:",
    dep.depType,
  );
});

  const txHash = await signer.sendTransaction(tx);

  console.log("\n========================================");
  console.log("VAULT TRANSACTION SENT");
  console.log("========================================");
  console.log("Transaction hash:", txHash);

  // --------------------------------------------------
  // Wait for confirmation
  // --------------------------------------------------

  console.log("\nWaiting for confirmation...");

  const confirmed = await client.waitTransaction(txHash, 1);

  if (confirmed) {
    console.log(
      "Confirmed in block:",
      confirmed.blockNumber?.toString(),
    );
  } else {
    console.log("Transaction sent but not yet confirmed.");
  }

  // --------------------------------------------------
  // Inspect resulting vault Cell
  // --------------------------------------------------

  console.log("\nInspecting Vault Cell...");

  const vaultCell = await client.getCell(
    ccc.OutPoint.from({
      txHash,
      index: 0n,
    }),
  );

  if (!vaultCell) {
    throw new Error(
      `Could not resolve newly created Vault Cell: ${txHash}:0`,
    );
  }

  console.log("\n========================================");
  console.log("VAULT CELL CREATED");
  console.log("========================================");

  console.log("OutPoint:", `${txHash}:0`);
  console.log(
    "Capacity:",
    vaultCell.cellOutput.capacity.toString(),
    "Shannons",
  );
  console.log("Lock:", vaultCell.cellOutput.lock);
  console.log("Type:", vaultCell.cellOutput.type);
  console.log("Data:", vaultCell.outputData);
}

main().catch((error) => {
  console.error("\nFailed to create vault:");
  console.error(error);
  process.exit(1);
});
