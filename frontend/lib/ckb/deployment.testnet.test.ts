import assert from "node:assert/strict";
import test from "node:test";

import { ccc } from "@ckb-ccc/connector-react";

import {
  testnetVaultDeployment,
} from "./deployment.testnet.ts";

test(
  "testnet vault deployment matches committed code cell",
  async () => {
    const response = await fetch(
      "https://testnet.ckb.dev",
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
        },
        body: JSON.stringify({
          id: 1,
          jsonrpc: "2.0",
          method:
            "get_transaction",
          params: [
            testnetVaultDeployment
              .cellDep.outPoint.txHash,
          ],
        }),
      },
    );

    const rpc =
      await response.json();

    assert.ok(
      rpc.result,
      "deployment transaction not found",
    );

    assert.equal(
      rpc.result.tx_status.status,
      "committed",
    );

    const index =
      testnetVaultDeployment
        .cellDep.outPoint.index;

    const data =
      rpc.result.transaction
        .outputs_data[index];

    const hash =
      ccc.hashCkb(data);

    assert.equal(
      hash,
      testnetVaultDeployment.codeHash,
    );
  },
);