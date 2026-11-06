import test from "node:test";
import assert from "node:assert/strict";

import {
  DEVNET_RPC_URL,
  devnetKnownScripts,
} from "./networks.ts";

test(
  "devnet uses local OffCKB RPC",
  () => {
    assert.equal(
      DEVNET_RPC_URL,
      "http://127.0.0.1:28114",
    );
  },
);

test(
  "devnet secp256k1 dependency matches OffCKB",
  () => {
    const dep =
      devnetKnownScripts
        .Secp256k1Blake160
        .cellDeps[0]
        .cellDep;

    assert.equal(
      dep.outPoint.txHash,
      "0x4d804f1495612631da202fe9902fa9899118554b08138cfe5dfb50e1ede76293",
    );

    assert.equal(
      dep.outPoint.index,
      0,
    );

    assert.equal(
      dep.depType,
      "depGroup",
    );
  },
);