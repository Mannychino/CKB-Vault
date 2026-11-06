import test from "node:test";
import assert from "node:assert/strict";

import { ccc } from "@ckb-ccc/connector-react";

import {
  openDevnetClient,
} from "./devnet-client.ts";

test(
  "devnet client resolves OffCKB secp256k1 script",
  async () => {
    const clientOwner =
      openDevnetClient();

    try {
      const client =
        clientOwner.value;

      const script =
        await client.getKnownScript(
          ccc.KnownScript.Secp256k1Blake160,
        );

      const dep =
        script.cellDeps[0];

      assert.equal(
        dep.cellDep.outPoint.txHash,
        "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
      );

      assert.equal(
        dep.cellDep.outPoint.index,
        0n,
      );

      assert.equal(
        dep.cellDep.depType,
        "depGroup",
      );
    } finally {
      await clientOwner.dispose();
    }
  },
);