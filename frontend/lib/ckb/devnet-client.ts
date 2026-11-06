import { ccc } from "@ckb-ccc/connector-react";

import {
  DEVNET_RPC_URL,
  devnetKnownScripts,
} from "./networks.ts";

export function openDevnetClient() {
  return ccc.ClientPublicTestnet.open({
    urls: [DEVNET_RPC_URL],

    scripts: {
      [ccc.KnownScript.Secp256k1Blake160]:
        devnetKnownScripts.Secp256k1Blake160,

      [ccc.KnownScript.Secp256k1Multisig]:
        devnetKnownScripts.Secp256k1Multisig,

      [ccc.KnownScript.OmniLock]:
        devnetKnownScripts.OmniLock,
    },
  });
}