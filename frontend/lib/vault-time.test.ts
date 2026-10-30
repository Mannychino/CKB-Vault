import test from "node:test";
import assert from "node:assert/strict";

import {
  daysToRelativeBlocks,
} from "./vault-time.ts";

test("1 day at 10 seconds per block returns 8640 blocks", () => {
  const blocks =
    daysToRelativeBlocks(1, 10);

  assert.equal(blocks, 8640n);
});

test("7 days at 10 seconds per block returns 60480 blocks", () => {
  const blocks =
    daysToRelativeBlocks(7, 10);

  assert.equal(blocks, 60480n);
});

test("rounds upward when block calculation is fractional", () => {
  const blocks =
    daysToRelativeBlocks(1, 6.1);

  assert.equal(blocks, 14164n);
});

test("rejects a lock duration below 1 day", () => {
  assert.throws(
    () => daysToRelativeBlocks(0, 10),
    /Lock days must be between 1 and 7/,
  );
});

test("rejects a lock duration above 7 days", () => {
  assert.throws(
    () => daysToRelativeBlocks(8, 10),
    /Lock days must be between 1 and 7/,
  );
});

test("rejects fractional lock days", () => {
  assert.throws(
    () => daysToRelativeBlocks(1.5, 10),
    /Lock days must be between 1 and 7/,
  );
});

test("rejects zero average block time", () => {
  assert.throws(
    () => daysToRelativeBlocks(1, 0),
    /Average block time must be greater than zero/,
  );
});

test("rejects negative average block time", () => {
  assert.throws(
    () => daysToRelativeBlocks(1, -5),
    /Average block time must be greater than zero/,
  );
});