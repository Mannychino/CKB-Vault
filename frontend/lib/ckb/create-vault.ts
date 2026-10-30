import { ccc } from "@ckb-ccc/connector-react";

import {
  encodeVaultData,
} from "./vault-data.ts";

type CreateVaultParams = {
  signer: ccc.Signer;
  amountCkb: bigint;
  requiredBlocks: bigint;
};

const VAULT_CODE_HASH =
  "0xaf54cce2729447798f0cb8de2d74bfc7fc56d69d36f76b47c03335cb1b338648";

const VAULT_CELL_DEP_TX_HASH =
  "0x2c9760c8c2a8cc596f1655e76814c88362b2358fa9fe69e8b8d2841a6fee338b";

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
    codeHash: VAULT_CODE_HASH,
    hashType: "data2" as const,
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
    ccc.CellDep.from({
      outPoint: {
        txHash:
          VAULT_CELL_DEP_TX_HASH,
        index: 0,
      },

      depType: "code",
    }),
  );

  await tx.completeInputsByCapacity(
    signer,
  );

  await tx.completeFeeBy(
    signer,
  );

  const txHash =
    await signer.sendTransaction(
      tx,
    );

  return txHash;
}