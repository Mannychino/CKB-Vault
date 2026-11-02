import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const deploymentPath = path.join(
  root,
  "contracts/vault-lock/deployment/scripts.json",
);

const outputPath = path.join(
  root,
  "frontend/lib/ckb/deployment.generated.ts",
);

if (!fs.existsSync(deploymentPath)) {
  throw new Error(
    `Deployment file not found: ${deploymentPath}`,
  );
}

const raw = fs.readFileSync(
  deploymentPath,
  "utf8",
);

const deployments = JSON.parse(raw);

const vault =
  deployments?.devnet?.["vault-lock"];

if (!vault) {
  throw new Error(
    'Missing "devnet.vault-lock" in scripts.json',
  );
}

if (
  typeof vault.codeHash !== "string" ||
  !vault.codeHash.startsWith("0x")
) {
  throw new Error(
    "Invalid vault-lock codeHash.",
  );
}

if (vault.hashType !== "data2") {
  throw new Error(
    `Unexpected hashType: ${vault.hashType}`,
  );
}

const cellDepEntry =
  vault.cellDeps?.[0]?.cellDep;

if (!cellDepEntry) {
  throw new Error(
    "Missing vault-lock CellDep.",
  );
}

const txHash =
  cellDepEntry.outPoint?.txHash;

const index =
  cellDepEntry.outPoint?.index;

const depType =
  cellDepEntry.depType;

if (
  typeof txHash !== "string" ||
  !txHash.startsWith("0x")
) {
  throw new Error(
    "Invalid deployment transaction hash.",
  );
}

if (
  typeof index !== "number" &&
  typeof index !== "string"
) {
  throw new Error(
    "Invalid CellDep index.",
  );
}

if (depType !== "code") {
  throw new Error(
    `Unexpected depType: ${depType}`,
  );
}

const generated = `
// THIS FILE IS GENERATED.
// DO NOT EDIT MANUALLY.

export const vaultDeployment = {
  codeHash: "${vault.codeHash}",
  hashType: "${vault.hashType}",
  cellDep: {
    outPoint: {
      txHash: "${txHash}",
      index: ${JSON.stringify(index)},
    },
    depType: "${depType}",
  },
} as const;
`.trimStart();

fs.writeFileSync(
  outputPath,
  generated,
);

console.log(
  "Vault frontend deployment config updated.",
);

console.log(
  `codeHash: ${vault.codeHash}`,
);

console.log(
  `txHash: ${txHash}`,
);