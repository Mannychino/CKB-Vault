import test from "node:test";
import assert from "node:assert/strict";

import {
  encodeVaultData,
} from "./vault-data.ts";

test("encodes 5 blocks as little-endian u64", () => {
  assert.equal(
    encodeVaultData(5n),
    "0x0500000000000000",
  );
});

test("encodes 200 blocks as little-endian u64", () => {
  assert.equal(
    encodeVaultData(200n),
    "0xc800000000000000",
  );
});

test("encodes zero correctly", () => {
  assert.equal(
    encodeVaultData(0n),
    "0x0000000000000000",
  );
});

test("rejects negative values", () => {
  assert.throws(
    () => encodeVaultData(-1n),
    /cannot be negative/,
  );
});

test("rejects values larger than u64", () => {
  assert.throws(
    () =>
      encodeVaultData(
        0x1_0000_0000_0000_0000n,
      ),
    /exceed u64/,
  );
});