import {
  getCkbNetwork,
} from "./networks.ts";

import {
  openDevnetClient,
} from "./devnet-client.ts";

import {
  openTestnetClient,
} from "./testnet-client.ts";

export function openCkbClient() {
  const network =
    getCkbNetwork();

  if (network === "devnet") {
    return openDevnetClient();
  }

  return openTestnetClient();
}