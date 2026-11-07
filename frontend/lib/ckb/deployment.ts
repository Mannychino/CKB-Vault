import {
  getCkbNetwork,
} from "./networks.ts";

import {
  vaultDeployment as devnetVaultDeployment,
} from "./deployment.devnet.generated.ts";

import {
  testnetVaultDeployment,
} from "./deployment.testnet.ts";

export function getVaultDeployment() {
  const network =
    getCkbNetwork();

  if (network === "devnet") {
    return devnetVaultDeployment;
  }

  if (!testnetVaultDeployment) {
    throw new Error(
      "CKB Vault has not been deployed to testnet yet.",
    );
  }

  return testnetVaultDeployment;
}