# CKB Vault

CKB Vault is an experimental Nervos CKB application that creates cells with a custom relative-block timelock. This guide documents the checked-in implementation, including terminal scripts, wallet integration, and the local developer API.

**Use local devnet funds only. The current lock does not check ownership or require an owner signature. Anyone can spend a matured vault to a destination they choose.** Connecting a wallet does not add ownership protection to the vault.

## Start here

1. [Install dependencies and deploy the contract](installation.md).
2. [Choose how to connect to RPC](rpc-connections.md).
3. [Create a vault, verify it, and withdraw](transactions.md).
4. Use the [wallet frontend or local API](frontends.md) if you prefer a UI.

## What exists today

| Capability | Implementation status |
| --- | --- |
| Local devnet connection | Implemented with CCC and HTTP JSON-RPC |
| Create and fund a vault | Terminal scripts, Next.js wallet frontend, local developer API |
| Inspect a vault and estimate maturity | Raw RPC and local developer UI/API |
| Withdraw one vault cell | Terminal script and local developer UI/API |
| Wallet connection | CCC connector in Next.js; available wallets depend on the connector and environment |
| Owner authorization | Not implemented |
| Add capacity to an existing cell | No dedicated deposit/top-up workflow; cells are immutable |
| Mainnet or public testnet vault deployment | Not supported by the current terminal scripts |
| Token vaults, multisignature vault policies | Not implemented; system-script configuration alone does not provide these features |

## How the pieces fit

The Rust lock validates a spending input. OffCKB supplies the development chain and deployment tooling. CCC selects funding cells, constructs transactions, and signs ordinary funding inputs. A CKB node validates and broadcasts transactions; an indexer finds cells by script.

One CKB equals **100,000,000 shannons**. A cell's capacity pays for its occupied bytes and holds the CKB being locked. Creating a vault is also its initial deposit. Withdrawing consumes that cell and creates a new output, minus a fee.

The guide follows [the current contract](../../contracts/vault-lock/src/contract.rs) and [transaction scripts](../../contracts/vault-lock/scripts/). Older repository notes describe an absolute-block policy; the current implementation uses relative blocks. See [contract behavior](contract-and-troubleshooting.md) before extending it.

## Use this as a GitBook

The repository root contains GitBook configuration pointing to this directory. Connect the repository using GitBook Git Sync and select the intended branch. The table of contents is defined in [SUMMARY.md](SUMMARY.md). These files are ready to import or sync; writing them does not publish a hosted GitBook.
