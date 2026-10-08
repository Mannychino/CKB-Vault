# CKB-Vault Development Context

## Project
CKB-Vault is a Nervos CKB timelock vault implemented as a Rust lock script.

## Current contract
Path:
contracts/vault-lock/src/contract.rs

## Current security work
The vault-lock must:

- Read the relevant input using `Source::GroupInput`, not `Source::Input`.
- Read `since` using `load_input_since`.
- Parse the raw u64 with `ckb_std::since::Since`.
- Reject invalid since flags.
- Require absolute since values for V1.
- Require block-number metric for V1.
- Compare the decoded block number against the vault's stored unlock block.
- Never compare the raw encoded since u64 directly against the timelock.

## Vault data
The first 8 bytes of Cell data contain the unlock block as little-endian u64.

## Expected behavior
- absolute block 99 vs unlock 100 => reject
- absolute block 100 => accept
- absolute block 101 => accept
- relative block 0 => reject
- relative block 100 => reject
- timestamp since => reject
- malformed since => reject

## Tooling
- Rust
- ckb-std 1.1
- ckb-testtool 1.1.x
- OffCKB local devnet
- CCC TypeScript client
- RPC: http://127.0.0.1:8114

## Important rule
Preserve the existing project architecture unless there is a clear reason to change it.
Explain changes before making large refactors.