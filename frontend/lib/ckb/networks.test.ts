import assert from "node:assert/strict";
import test from "node:test";

import {
  getCkbNetwork,
} from "./networks.ts";

test(
  "defaults to devnet",
  () => {
    delete process.env
      .NEXT_PUBLIC_CKB_NETWORK;

    assert.equal(
      getCkbNetwork(),
      "devnet",
    );
  },
);

test(
  "selects testnet",
  () => {
    process.env
      .NEXT_PUBLIC_CKB_NETWORK =
      "testnet";

    assert.equal(
      getCkbNetwork(),
      "testnet",
    );

    delete process.env
      .NEXT_PUBLIC_CKB_NETWORK;
  },
);

test(
  "rejects unsupported network",
  () => {
    process.env
      .NEXT_PUBLIC_CKB_NETWORK =
      "mainnet";

    assert.throws(
      () => getCkbNetwork(),
      /Unsupported CKB network/,
    );

    delete process.env
      .NEXT_PUBLIC_CKB_NETWORK;
  },
);