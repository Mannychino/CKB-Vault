import { readFileSync } from "node:fs";
import path from "node:path";

import {
  ccc,
  CellDepInfoLike,
  KnownScript,
  Script,
} from "@ckb-ccc/core";

type Hex = `0x${string}`;

type HashType =
  | "data"
  | "type"
  | "data1"
  | "data2";

type DepType =
  | "code"
  | "depGroup";

type JsonCellDep = {
  cellDep: {
    outPoint: {
      txHash: Hex;
      index: number;
    };
    depType: DepType;
  };
};

type JsonScript = {
  codeHash: Hex;
  hashType: HashType;
  cellDeps: JsonCellDep[];
};

type DeploymentScript = {
  codeHash: Hex;
  hashType: HashType;
  cellDeps: JsonCellDep[];
};

type DeploymentFile = Record<
  string,
  Record<string, DeploymentScript>
>;

type SystemScriptEntry = {
  script: JsonScript;
};

type SystemScriptsFile = Record<
  string,
  Record<string, SystemScriptEntry>
>;

type KnownScriptType =
  Pick<Script, "codeHash" | "hashType"> & {
    cellDeps: CellDepInfoLike[];
  };

type RpcHeader = {
  number: Hex;
  timestamp: Hex;
  hash: Hex;
};

const NETWORK =
  process.env.CKB_NETWORK ??
  "devnet";

const RPC_URL =
  process.env.CKB_RPC_URL ??
  "http://127.0.0.1:28114";

const RPC_FALLBACK =
  process.env.CKB_RPC_FALLBACK ??
  "http://127.0.0.1:8114";

const VAULT_AMOUNT =
  process.env.VAULT_AMOUNT ??
  "5000";

/*
 * Normal user-facing mode:
 *
 * VAULT_UNLOCK_DATE=2026-10-19
 *
 * The user chooses a calendar date.
 */
const VAULT_UNLOCK_DATE =
  process.env.VAULT_UNLOCK_DATE;

/*
 * Developer/testing override.
 *
 * Example:
 *
 * VAULT_TIMELOCK=5
 *
 * means:
 * lock for 5 relative blocks.
 *
 * If this is supplied, it takes priority over
 * VAULT_UNLOCK_DATE.
 */
const VAULT_TIMELOCK =
  process.env.VAULT_TIMELOCK;

/*
 * Number of recent blocks used to estimate
 * average block interval.
 */
const BLOCK_SAMPLE_SIZE =
  BigInt(
    process.env.CKB_BLOCK_SAMPLE_SIZE ??
      "100",
  );

/*
 * Emergency/fallback estimate.
 *
 * This should only be used if recent block
 * timestamps cannot be read.
 */
const FALLBACK_BLOCK_SECONDS =
  Number(
    process.env.CKB_FALLBACK_BLOCK_SECONDS ??
      "10",
  );

const DEPLOYMENT_DIR =
  process.env.CKB_DEPLOYMENT_DIR ??
  path.resolve(
    process.cwd(),
    "contracts/vault-lock/deployment",
  );

const SCRIPTS_PATH =
  process.env.CKB_VAULT_SCRIPTS_PATH ??
  path.join(
    DEPLOYMENT_DIR,
    "scripts.json",
  );

const SYSTEM_SCRIPTS_PATH =
  process.env.CKB_SYSTEM_SCRIPTS_PATH ??
  path.join(
    DEPLOYMENT_DIR,
    "system-scripts.json",
  );

function readJsonFile<T>(
  filePath: string,
): T {
  try {
    return JSON.parse(
      readFileSync(
        filePath,
        "utf8",
      ),
    ) as T;
  } catch (error) {
    throw new Error(
      `Failed to read ${filePath}: ${String(
        error,
      )}`,
    );
  }
}

function loadVaultDeployment():
  DeploymentScript {
  const deployments =
    readJsonFile<DeploymentFile>(
      SCRIPTS_PATH,
    );

  const network =
    deployments[NETWORK];

  if (!network) {
    throw new Error(
      `Network "${NETWORK}" not found in ${SCRIPTS_PATH}`,
    );
  }

  const vault =
    network["vault-lock"];

  if (!vault) {
    throw new Error(
      `vault-lock deployment not found for "${NETWORK}"`,
    );
  }

  if (
    !vault.cellDeps ||
    vault.cellDeps.length === 0
  ) {
    throw new Error(
      "vault-lock deployment has no CellDep",
    );
  }

  return vault;
}

function toKnownScript(
  script: JsonScript,
): KnownScriptType {
  return {
    codeHash:
      script.codeHash,

    hashType:
      script.hashType,

    cellDeps:
      script.cellDeps as CellDepInfoLike[],
  };
}

function loadSystemScripts():
  Record<string, KnownScriptType> {
  const file =
    readJsonFile<SystemScriptsFile>(
      SYSTEM_SCRIPTS_PATH,
    );

  const scripts =
    file[NETWORK];

  if (!scripts) {
    throw new Error(
      `Network "${NETWORK}" not found in ${SYSTEM_SCRIPTS_PATH}`,
    );
  }

  const getScript = (
    name: string,
  ) => {
    const entry =
      scripts[name];

    if (!entry) {
      throw new Error(
        `System script "${name}" not found`,
      );
    }

    return entry.script;
  };

  return {
    [KnownScript.Secp256k1Blake160]:
      toKnownScript(
        getScript(
          "secp256k1_blake160_sighash_all",
        ),
      ),

    [KnownScript.Secp256k1Multisig]:
      toKnownScript(
        getScript(
          "secp256k1_blake160_multisig_all",
        ),
      ),

    [KnownScript.NervosDao]:
      toKnownScript(
        getScript(
          "dao",
        ),
      ),

    [KnownScript.AnyoneCanPay]:
      toKnownScript(
        getScript(
          "anyone_can_pay",
        ),
      ),

    [KnownScript.OmniLock]:
      toKnownScript(
        getScript(
          "omnilock",
        ),
      ),

    [KnownScript.XUdt]:
      toKnownScript(
        getScript(
          "xudt",
        ),
      ),
  };
}

function createClient() {
  if (NETWORK !== "devnet") {
    throw new Error(
      `Only devnet is currently supported. Received: ${NETWORK}`,
    );
  }

  return new ccc.ClientPublicTestnet({
    url:
      RPC_URL,

    scripts:
      loadSystemScripts(),

    fallbacks:
      RPC_FALLBACK
        ? [RPC_FALLBACK]
        : [],
  });
}

async function rpc<T>(
  method: string,
  params: unknown[] = [],
): Promise<T> {
  const response =
    await fetch(
      RPC_URL,
      {
        method:
          "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body:
          JSON.stringify({
            id:
              1,

            jsonrpc:
              "2.0",

            method,

            params,
          }),
      },
    );

  if (!response.ok) {
    throw new Error(
      `RPC HTTP error ${response.status}`,
    );
  }

  const body =
    await response.json() as {
      result?: T;
      error?: {
        message?: string;
      };
    };

  if (body.error) {
    throw new Error(
      body.error.message ??
        `RPC ${method} failed`,
    );
  }

  if (body.result === undefined) {
    throw new Error(
      `RPC ${method} returned no result`,
    );
  }

  return body.result;
}

function encodeRelativeDuration(
  blocks: bigint,
): Hex {
  const bytes =
    new Uint8Array(8);

  new DataView(
    bytes.buffer,
  ).setBigUint64(
    0,
    blocks,
    true,
  );

  return ccc.hexFrom(
    bytes,
  );
}

/*
 * Parse YYYY-MM-DD.
 *
 * The user only chooses a date.
 *
 * We interpret that date as the END of the
 * selected local calendar day.
 *
 * Example:
 *
 * 2026-10-19
 *
 * becomes:
 *
 * 19 Oct 2026 23:59:59.999 local time
 */
function parseUnlockDate(
  value: string,
): Date {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(
        value,
      );

  if (!match) {
    throw new Error(
      "VAULT_UNLOCK_DATE must use YYYY-MM-DD format",
    );
  }

  const year =
    Number(
      match[1],
    );

  const month =
    Number(
      match[2],
    );

  const day =
    Number(
      match[3],
    );

  const unlockDate =
    new Date(
      year,
      month - 1,
      day,
      23,
      59,
      59,
      999,
    );

  /*
   * Detect impossible dates such as:
   *
   * 2026-02-31
   */
  if (
    unlockDate.getFullYear() !==
      year ||
    unlockDate.getMonth() !==
      month - 1 ||
    unlockDate.getDate() !==
      day
  ) {
    throw new Error(
      `Invalid unlock date: ${value}`,
    );
  }

  if (
    unlockDate.getTime() <=
    Date.now()
  ) {
    throw new Error(
      "Unlock date must be in the future",
    );
  }

  return unlockDate;
}

async function estimateAverageBlockSeconds():
  Promise<number> {
  try {
    const tip =
      await rpc<RpcHeader>(
        "get_tip_header",
      );

    const tipNumber =
      BigInt(
        tip.number,
      );

    const sampleSize =
      tipNumber <
      BLOCK_SAMPLE_SIZE
        ? tipNumber
        : BLOCK_SAMPLE_SIZE;

    if (
      sampleSize ===
      0n
    ) {
      throw new Error(
        "Not enough blocks to calculate block interval",
      );
    }

    const startNumber =
      tipNumber -
      sampleSize;

    const startHeader =
      await rpc<RpcHeader>(
        "get_header_by_number",
        [
          `0x${startNumber.toString(
            16,
          )}`,
        ],
      );

    const tipTimestamp =
      BigInt(
        tip.timestamp,
      );

    const startTimestamp =
      BigInt(
        startHeader.timestamp,
      );

    if (
      tipTimestamp <=
      startTimestamp
    ) {
      throw new Error(
        "Invalid block timestamps",
      );
    }

    const elapsedMilliseconds =
      tipTimestamp -
      startTimestamp;

    const averageMilliseconds =
      Number(
        elapsedMilliseconds,
      ) /
      Number(
        sampleSize,
      );

    const averageSeconds =
      averageMilliseconds /
      1000;

    if (
      !Number.isFinite(
        averageSeconds,
      ) ||
      averageSeconds <=
      0
    ) {
      throw new Error(
        "Invalid calculated block interval",
      );
    }

    return averageSeconds;
  } catch (error) {
    console.warn(
      "\nUnable to calculate recent block interval.",
    );

    console.warn(
      "Reason:",
      String(
        error,
      ),
    );

    console.warn(
      "Using fallback block interval:",
      FALLBACK_BLOCK_SECONDS,
      "seconds",
    );

    return FALLBACK_BLOCK_SECONDS;
  }
}

function calculateRequiredBlocks(
  unlockDate: Date,
  averageBlockSeconds: number,
): bigint {
  const durationMilliseconds =
    unlockDate.getTime() -
    Date.now();

  if (
    durationMilliseconds <=
    0
  ) {
    throw new Error(
      "Unlock date must be in the future",
    );
  }

  const durationSeconds =
    Math.ceil(
      durationMilliseconds /
      1000,
    );

  /*
   * Always round UP.
   *
   * We do not want the conversion to produce
   * a shorter lock than requested.
   */
  const blocks =
    Math.ceil(
      durationSeconds /
      averageBlockSeconds,
    );

  if (
    !Number.isSafeInteger(
      blocks,
    ) ||
    blocks <=
    0
  ) {
    throw new Error(
      "Calculated block duration is invalid",
    );
  }

  return BigInt(
    blocks,
  );
}

function formatDuration(
  seconds: number,
): string {
  const days =
    Math.floor(
      seconds /
      86400,
    );

  const hours =
    Math.floor(
      (
        seconds %
        86400
      ) /
      3600,
    );

  const minutes =
    Math.floor(
      (
        seconds %
        3600
      ) /
      60,
    );

  const parts: string[] =
    [];

  if (days > 0) {
    parts.push(
      `${days} day${days === 1 ? "" : "s"}`,
    );
  }

  if (hours > 0) {
    parts.push(
      `${hours} hour${hours === 1 ? "" : "s"}`,
    );
  }

  if (
    minutes > 0 ||
    parts.length === 0
  ) {
    parts.push(
      `${minutes} minute${minutes === 1 ? "" : "s"}`,
    );
  }

  return parts.join(
    ", ",
  );
}

async function resolveRequiredBlocks():
  Promise<{
    requiredBlocks: bigint;
    unlockDate?: Date;
    averageBlockSeconds?: number;
  }> {

  /*
   * Development override.
   *
   * This lets us continue doing:
   *
   * VAULT_TIMELOCK=5
   *
   * for fast local tests.
   */
  if (
    VAULT_TIMELOCK !==
    undefined
  ) {
    if (
      !/^\d+$/.test(
        VAULT_TIMELOCK,
      )
    ) {
      throw new Error(
        "VAULT_TIMELOCK must be a positive integer",
      );
    }

    const requiredBlocks =
      BigInt(
        VAULT_TIMELOCK,
      );

    if (
      requiredBlocks <=
      0n
    ) {
      throw new Error(
        "VAULT_TIMELOCK must be greater than zero",
      );
    }

    console.log(
      "\nUsing developer block-duration override.",
    );

    return {
      requiredBlocks,
    };
  }

  if (
    !VAULT_UNLOCK_DATE
  ) {
    throw new Error(
      "Set VAULT_UNLOCK_DATE=YYYY-MM-DD or use VAULT_TIMELOCK for development",
    );
  }

  const unlockDate =
    parseUnlockDate(
      VAULT_UNLOCK_DATE,
    );

  const averageBlockSeconds =
    await estimateAverageBlockSeconds();

  const requiredBlocks =
    calculateRequiredBlocks(
      unlockDate,
      averageBlockSeconds,
    );

  return {
    requiredBlocks,
    unlockDate,
    averageBlockSeconds,
  };
}

async function main() {
  console.log(
    "Connecting to CKB devnet...",
  );

  console.log(
    "RPC:",
    RPC_URL,
  );

  console.log(
    "Deployment config:",
    SCRIPTS_PATH,
  );

  console.log(
    "System scripts:",
    SYSTEM_SCRIPTS_PATH,
  );

  const privateKey =
    process.env.CKB_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "CKB_PRIVATE_KEY is not set",
    );
  }

  if (
    !/^0x[0-9a-fA-F]{64}$/.test(
      privateKey,
    )
  ) {
    throw new Error(
      "CKB_PRIVATE_KEY must be 0x followed by 64 hexadecimal characters",
    );
  }

  const client =
    createClient();

  const signer =
    new ccc.SignerCkbPrivateKey(
      client,
      privateKey,
    );

  const signerAddress =
    await signer
      .getRecommendedAddress();

  console.log(
    "Signer:",
    signerAddress,
  );

  const {
    requiredBlocks,
    unlockDate,
    averageBlockSeconds,
  } =
    await resolveRequiredBlocks();

  /*
   * The Vault Cell stores ONLY the relative
   * block duration.
   *
   * It does NOT store:
   *
   * - an absolute block height
   * - a Unix timestamp
   * - an encoded since value
   */
  const vaultData =
    encodeRelativeDuration(
      requiredBlocks,
    );

  console.log(
    "\n========================================",
  );

  console.log(
    "VAULT LOCK POLICY",
  );

  console.log(
    "========================================",
  );

  if (
    unlockDate &&
    averageBlockSeconds
  ) {
    const remainingSeconds =
      Math.ceil(
        (
          unlockDate.getTime() -
          Date.now()
        ) /
        1000,
      );

    console.log(
      "Selected unlock date:",
      VAULT_UNLOCK_DATE,
    );

    console.log(
      "Date boundary:",
      unlockDate.toString(),
    );

    console.log(
      "Requested duration:",
      formatDuration(
        remainingSeconds,
      ),
    );

    console.log(
      "Estimated block interval:",
      averageBlockSeconds.toFixed(
        2,
      ),
      "seconds",
    );
  }

  console.log(
    "Required relative blocks:",
    requiredBlocks.toString(),
  );

  console.log(
    "Vault data:",
    vaultData,
  );

  const vaultDeployment =
    loadVaultDeployment();

  const vaultCellDep =
    vaultDeployment
      .cellDeps[0]
      .cellDep;

  console.log(
    "\nVault code hash:",
    vaultDeployment.codeHash,
  );

  console.log(
    "Vault hash type:",
    vaultDeployment.hashType,
  );

  console.log(
    "Vault CellDep:",
    `${vaultCellDep.outPoint.txHash}:${vaultCellDep.outPoint.index}`,
  );

  const vaultDepOutPoint =
    ccc.OutPoint.from({
      txHash:
        vaultCellDep
          .outPoint
          .txHash,

      index:
        vaultCellDep
          .outPoint
          .index,
    });

  console.log(
    "\nChecking vault contract Cell...",
  );

  const contractCell =
    await client.getCell(
      vaultDepOutPoint,
    );

  if (!contractCell) {
    throw new Error(
      `Vault contract Cell is not live: ${vaultCellDep.outPoint.txHash}:${vaultCellDep.outPoint.index}`,
    );
  }

  console.log(
    "Vault contract Cell found.",
  );

  const vaultLock =
    ccc.Script.from({
      codeHash:
        vaultDeployment.codeHash,

      hashType:
        vaultDeployment.hashType,

      /*
       * Ownership will be added in the next
       * sprint.
       *
       * v1.0.1 currently still uses empty args.
       */
      args:
        "0x",
    });

  const vaultCapacity =
    ccc.fixedPointFrom(
      VAULT_AMOUNT,
    );

  const tx =
    ccc.Transaction.from({
      outputs: [
        {
          capacity:
            vaultCapacity,

          lock:
            vaultLock,
        },
      ],

      outputsData: [
        vaultData,
      ],
    });

  tx.cellDeps.push(
    ccc.CellDep.from({
      outPoint:
        vaultDepOutPoint,

      depType:
        vaultCellDep.depType,
    }),
  );

  console.log(
    "\nCreating transaction...",
  );

  console.log(
    "Vault output capacity:",
    vaultCapacity.toString(),
    "Shannons",
  );

  console.log(
    "\nSelecting funding Cells...",
  );

  await tx.completeInputsByCapacity(
    signer,
  );

  console.log(
    "Inputs selected:",
    tx.inputs.length,
  );

  console.log(
    "\nCalculating fee and change...",
  );

  const [
    additionalInputs,
    changeCreated,
  ] =
    await tx.completeFeeBy(
      signer,
    );

  console.log(
    "Additional inputs:",
    additionalInputs,
  );

  console.log(
    "Change created:",
    changeCreated,
  );

  console.log(
    "\nTRANSACTION",
  );

  console.log(
    "\nInputs:",
  );

  tx.inputs.forEach(
    (
      input,
      index,
    ) => {
      console.log(
        `Input ${index}: ${input.previousOutput.txHash}:${input.previousOutput.index}`,
      );
    },
  );

  console.log(
    "\nOutputs:",
  );

  tx.outputs.forEach(
    (
      output,
      index,
    ) => {
      console.log(
        `Output ${index}: ${output.capacity.toString()} Shannons`,
      );
    },
  );

  console.log(
    "\nOutputsData:",
  );

  tx.outputsData.forEach(
    (
      data,
      index,
    ) => {
      console.log(
        `OutputData ${index}: ${data}`,
      );
    },
  );

  console.log(
    "\nCellDeps:",
  );

  tx.cellDeps.forEach(
    (
      dep,
      index,
    ) => {
      console.log(
        `CellDep ${index}: ${dep.outPoint.txHash}:${dep.outPoint.index} depType=${dep.depType}`,
      );
    },
  );

  console.log(
    "\nSending transaction...",
  );

  const txHash =
    await signer.sendTransaction(
      tx,
    );

  console.log(
    "\n========================================",
  );

  console.log(
    "VAULT CREATED",
  );

  console.log(
    "========================================",
  );

  console.log(
    "Transaction hash:",
    txHash,
  );

  console.log(
    "Vault Cell:",
    `${txHash}:0`,
  );

  console.log(
    "Vault amount:",
    VAULT_AMOUNT,
    "CKB",
  );

  console.log(
    "Required relative blocks:",
    requiredBlocks.toString(),
  );

  console.log(
    "Vault data:",
    vaultData,
  );

  if (
    VAULT_UNLOCK_DATE
  ) {
    console.log(
      "Requested unlock date:",
      VAULT_UNLOCK_DATE,
    );

    console.log(
      "Note: date is an estimate; CKB enforces block count.",
    );
  }
}

main().catch(
  (
    error,
  ) => {
    console.error(
      "\n========================================",
    );

    console.error(
      "FAILED TO CREATE VAULT",
    );

    console.error(
      "========================================",
    );

    console.error(
      error,
    );

    process.exit(
      1,
    );
  },
);