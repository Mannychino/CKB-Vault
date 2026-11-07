import { ccc } from "@ckb-ccc/connector-react";

import {
  TESTNET_RPC_URL,
} from "./networks.ts";

export function openTestnetClient() {
  return ccc.ClientPublicTestnet.open({
    urls: [
      TESTNET_RPC_URL,
    ],
  });
}