import test from "node:test";
import assert from "node:assert/strict";

import {
  createVault,
} from "./create-vault.ts";

test("rejects zero vault amount", async () => {
  await assert.rejects(
    () =>
      createVault({
        signer: {} as any,
        amountCkb: 0n,
        requiredBlocks: 100n,
      }),
    /Vault amount must be greater than zero/,
  );
});

test("rejects zero required blocks", async () => {
  await assert.rejects(
    () =>
      createVault({
        signer: {} as any,
        amountCkb: 500n,
        requiredBlocks: 0n,
      }),
    /Required blocks must be greater than zero/,
  );
});                                                                 