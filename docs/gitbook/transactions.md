# Create and withdraw a vault

Complete [installation](installation.md) first. Run from the repository root with the devnet RPC variables and `CKB_PRIVATE_KEY` configured.

## Create and fund

For a short local test:

```bash
export VAULT_AMOUNT=5000
export VAULT_TIMELOCK=5
unset VAULT_UNLOCK_DATE
node dist-ts/contracts/vault-lock/scripts/create_vault.js
```

This creates a vault requiring five blocks of age after its creation is committed. It does not mean block height five.

The script loads deployment and system-script metadata, checks the contract cell, creates a vault output with empty lock args, writes the duration as eight little-endian bytes, selects funding inputs, completes fees/change, and signs and submits the transaction.

Record the reported transaction hash and vault outpoint. The script places the vault at output index zero:

```bash
export VAULT_TX_HASH=0xREPLACE_WITH_64_HEX_DIGITS
export VAULT_INDEX=0
```

The placeholder must be replaced with your real devnet transaction hash. A returned hash means submission succeeded, not that the transaction is committed. Use [transaction status and live-cell queries](rpc-cookbook.md).

## Choose a calendar date instead

```bash
unset VAULT_TIMELOCK
export VAULT_UNLOCK_DATE=2027-12-31
node dist-ts/contracts/vault-lock/scripts/create_vault.js
```

Choose a future date at the time you run the command. The terminal script interprets it as the end of the selected day in the process's local timezone. It estimates the number of blocks using recent headers, rounds upward, and stores the resulting duration. Actual block production can change: this is **not a guaranteed wall-clock unlock date**.

`VAULT_TIMELOCK` takes precedence whenever defined. Unset it for date mode; setting it to an empty string causes validation to fail.

## Confirm and wait

1. Query `get_transaction` until `tx_status.status` is `committed`.
2. Read the commitment block via `tx_status.block_hash` and `get_header`.
3. Verify output zero is live with `get_live_cell`, requesting data.
4. Decode the first eight data bytes as an unsigned little-endian block duration.
5. Estimate maturity as creation block plus duration and inspect the current tip.

The local developer API performs this inspection for you. The node's consensus and transaction-pool validation remain authoritative about spendability; the withdrawal script itself does not wait for maturity.

## Withdraw

```bash
export VAULT_WITHDRAW_FEE=100000
node dist-ts/contracts/vault-lock/scripts/withdraw_vault.js
```

The fee is in shannons: 100,000 shannons equals 0.001 CKB. The script consumes the selected vault, checks its code hash/hash type against the configured deployment, decodes the duration, and sets its input `since` to the relative-block encoding. It creates a destination output using the address derived from `CKB_PRIVATE_KEY`, with capacity equal to vault capacity minus the fixed fee.

Unlike creation, withdrawal calls `client.sendTransaction(tx)` directly. The key selects a destination; it does **not** prove vault ownership. The current vault lock does not require a signature. Never interpret the key requirement in this script as an on-chain authorization rule.

Confirm the withdrawal is committed. The old outpoint should no longer be live and the withdrawal's output zero should hold the returned capacity. The script's success message is printed after submission, before this confirmation.

## Capacity, fees, and repeat operations

Outputs must meet occupied-capacity requirements. The withdrawal script checks that capacity exceeds its fee but does not independently guarantee the resulting destination output has sufficient occupied capacity. Keep enough capacity for the output lock and data; a fixed fee is also not guaranteed to satisfy every node's fee policy.

Create another vault to deposit more CKB. There is no in-place balance update or dedicated top-up operation. Consuming and recreating a cell would require satisfying its current lock and would start a new relative-age period.

Use one vault input per withdrawal. The current contract validates only the first input in each identical-lock group; it is not safe to generalize the example into a multi-vault batch.
