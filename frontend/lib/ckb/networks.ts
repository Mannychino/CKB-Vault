import { ccc } from "@ckb-ccc/connector-react";

export type CkbNetwork =
  | "devnet"
  | "testnet";

export const DEVNET_RPC_URL =
  "http://127.0.0.1:28114";

export const TESTNET_RPC_URL =
  "https://testnet.ckb.dev";

export function getCkbNetwork(): CkbNetwork {
  const network =
    process.env.NEXT_PUBLIC_CKB_NETWORK ??
    "devnet";

  if (
    network !== "devnet" &&
    network !== "testnet"
  ) {
    throw new Error(
      `Unsupported CKB network: ${network}`,
    );
  }

  return network;
}

type DevnetKnownScripts = {
  Secp256k1Blake160: ccc.ScriptInfoLike;
  Secp256k1Multisig: ccc.ScriptInfoLike;
  OmniLock: ccc.ScriptInfoLike;
};

export const devnetKnownScripts:
  DevnetKnownScripts = {
  Secp256k1Blake160: {
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

  Secp256k1Multisig: {
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

  OmniLock: {
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
};