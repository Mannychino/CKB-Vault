import assert from "node:assert/strict";
import test from "node:test";

import { ccc } from "@ckb-ccc/connector-react";

import {
  openTestnetClient,
} from "./testnet-client.ts";

test(
  "testnet client resolves official secp256k1 script",
  async () => {
    const clientOwner =
      openTestnetClient();

    try {
      const script =
        await clientOwner.value.getKnownScript(
          ccc.KnownScript.Secp256k1Blake160,
        );

      assert.ok(
        script.codeHash,
      );

      assert.equal(
        script.hashType,
        "type",
      );

      assert.ok(
        script.cellDeps.length > 0,
      );
    } finally {
      await clientOwner.dispose();
    }
  },
);