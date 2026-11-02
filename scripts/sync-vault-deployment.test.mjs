import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test(
  "generated frontend deployment matches scripts.json",
  () => {
    const deployment =
      JSON.parse(
        fs.readFileSync(
          "contracts/vault-lock/deployment/scripts.json",
          "utf8",
        ),
      );

    const generated =
      fs.readFileSync(
        "frontend/lib/ckb/deployment.generated.ts",
        "utf8",
      );

    const vault =
      deployment.devnet["vault-lock"];

    const txHash =
      vault
        .cellDeps[0]
        .cellDep
        .outPoint
        .txHash;

    assert.match(
      generated,
      new RegExp(vault.codeHash),
    );

    assert.match(
      generated,
      new RegExp(txHash),
    );
  },
);