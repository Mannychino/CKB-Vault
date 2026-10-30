import test from "node:test";
import assert from "node:assert/strict";

import {
  estimateAverageBlockSeconds,
} from "./block-time.ts";

test("calculates average block time from 100 blocks", async () => {
  const client = {
    getTip: async () => 1000n,

    getHeaderByNumber: async (
      blockNumber: bigint,
    ) => {
      if (blockNumber === 1000n) {
        return {
          timestamp: 1_000_000n,
        };
      }

      if (blockNumber === 900n) {
        return {
          timestamp: 400_000n,
        };
      }

      throw new Error("Unexpected block number");
    },
  };

  const average =
    await estimateAverageBlockSeconds(
      client as any,
      100n,
    );

  assert.equal(average, 6);
});

test("rejects when chain height is too small", async () => {
  const client = {
    getTip: async () => 50n,
  };

  await assert.rejects(
    () =>
      estimateAverageBlockSeconds(
        client as any,
        100n,
      ),
    /Not enough blocks/,
  );
});

test("rejects invalid timestamp order", async () => {
  const client = {
    getTip: async () => 1000n,

    getHeaderByNumber: async (
      blockNumber: bigint,
    ) => {
      if (blockNumber === 1000n) {
        return {
          timestamp: 400_000n,
        };
      }

      return {
        timestamp: 1_000_000n,
      };
    },
  };

  await assert.rejects(
    () =>
      estimateAverageBlockSeconds(
        client as any,
        100n,
      ),
    /Invalid block timestamps/,
  );
});