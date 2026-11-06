import { ccc } from "@ckb-ccc/connector-react";

import {
  encodeVaultData,
} from "./vault-data.ts";

import {
  vaultDeployment,
} from "./deployment.generated.ts";

type CreateVaultParams = {
  signer: ccc.Signer;
  amountCkb: bigint;
  requiredBlocks: bigint;
};

export async function createVault({
  signer,
  amountCkb,
  requiredBlocks,
}: CreateVaultParams): Promise<string> {
  if (amountCkb <= 0n) {
    throw new Error(
      "Vault amount must be greater than zero.",
    );
  }

  if (requiredBlocks <= 0n) {
    throw new Error(
      "Required blocks must be greater than zero.",
    );
  }

  const vaultData =
    encodeVaultData(requiredBlocks);

  const vaultLock = {
    codeHash:
      vaultDeployment.codeHash,

    hashType:
      vaultDeployment.hashType,

    args: "0x",
  };

  const tx =
    ccc.Transaction.from({
      outputs: [
        {
          capacity:
            ccc.fixedPointFrom(
              amountCkb.toString(),
            ),

          lock: vaultLock,
        },
      ],

      outputsData: [
        vaultData,
      ],
    });

  tx.cellDeps.push(
    ccc.CellDep.from(
      vaultDeployment.cellDep,
    ),
  );

  await tx.completeInputsByCapacity(
    signer,
  );

  await tx.completeFeeBy(
    signer,
  );

  console.log(
    "Vault CellDeps before send:",
    tx.cellDeps,
  );

  const txHash =
    await signer.sendTransaction(
      tx,
    );

  return txHash;
}