# CKB Vault

CKB Vault is a decentralized vault prototype built on the **Nervos CKB blockchain**. The project explores how assets can be deposited into a vault and controlled by programmable lock policies implemented through CKB scripts.

The current implementation focuses on understanding and testing the fundamental pieces required to build a vault on CKB: **Cells, Lock Scripts, transactions, contract deployment, Cell Dependencies, and time-lock conditions**.

> **Project status:** Early MVP / Development
> **Network:** CKB Devnet
> **Asset:** CKB
> **Unit:** CKB / Shannons

---

## Overview

The goal of CKB Vault is to allow a user to:

1. Connect a CKB wallet.
2. Create a vault.
3. Deposit CKB into the vault.
4. Configure a lock policy.
5. Keep the deposited asset locked until the policy is satisfied.
6. Eventually unlock and withdraw the asset when the conditions are met.

The project is being developed as a learning-focused MVP while exploring how these operations can be implemented using the Nervos CKB Cell Model.

The first version focuses on **CKB itself**. Token support and more advanced vault policies can be added later.

---

## How the Vault Model Works

The basic architecture is:

```text
User
 │
 │ Connect Wallet
 ▼
CKB Vault dApp
 │
 │ Create Vault
 ▼
Vault Lock Script
 │
 │ Deposit CKB
 ▼
Vault Cell
 │
 │ Lock Policy
 ▼
CKB Blockchain
```

The vault does not work like a traditional account balance.

On CKB, assets are stored inside **Cells**.

A vault therefore represents one or more Cells whose lock conditions determine when the assets can be spent.

---

## Current MVP

The current MVP is focused on proving that a CKB vault can be created and controlled using a custom lock script.

The current development flow includes:

```text
Build Rust Lock Script
        ↓
Run Rust Tests
        ↓
Compile Contract
        ↓
Inspect Contract Binary
        ↓
Deploy Contract to CKB Devnet
        ↓
Obtain Contract Code Hash
        ↓
Obtain Cell Dependency
        ↓
Create Vault Transaction
        ↓
Fund Vault Cell
        ↓
Test Lock Policy
```

The current vault-lock contract has been successfully built and deployed to the local CKB devnet.

### Current deployment

```text
Network: Devnet

Contract:
vault-lock

Code Hash:
0x6c4c1c2174b32852799498439844ff66100fba73d10b4b8941f800b14d50496b

Hash Type:
data2

Deployment Transaction:
0xb596420ac646a86316d6133df789d3f8fe3495970265587f266f380492e59484

Cell Dependency Transaction:
0x2f7577de9ac8cb93e89f06a82c387ef8634b81bc2830d09577fccca48cf17b01

Cell Dependency Index:
0

Dep Type:
code
```

These values are specific to the current local devnet deployment. If the devnet is reset or the contract is redeployed, the deployment transaction and Cell Dependency may change.

The generated deployment information is stored in:

```text
contracts/vault-lock/deployment/
```

---

# Technology Stack

## Nervos CKB

**CKB** is the blockchain on which the vault is being built.

It provides the underlying:

* Cell Model
* Transaction Model
* Lock Scripts
* Type Scripts
* Cell Dependencies
* Script execution environment

CKB is particularly useful for this project because vault rules can be implemented directly at the transaction-validation level.

---

## Rust

The vault-lock contract is written in **Rust**.

Rust is used for the on-chain script because CKB scripts execute inside the CKB-VM and can be compiled to the required RISC-V target.

The contract is compiled for:

```text
riscv64imac-unknown-none-elf
```

---

## CCC

The project uses **@ckb-ccc/core** for TypeScript interaction with CKB.

CCC is used by the off-chain scripts to:

* Connect to CKB.
* Query blockchain state.
* Create transactions.
* Work with Cells.
* Create lock scripts.
* Sign transactions.
* Submit transactions.

The current project uses:

```text
@ckb-ccc/core
```

---

## TypeScript

TypeScript is used for the off-chain scripts that interact with the deployed CKB contract.

For example:

```text
contracts/vault-lock/scripts/
```

contains scripts responsible for operations such as creating and testing vault transactions.

TypeScript provides type safety while interacting with CCC and the CKB transaction model.

---

## OffCKB

**OffCKB** is used to create and manage the local CKB development environment.

It provides the local CKB devnet used for development and testing.

The local RPC endpoint is:

```text
http://127.0.0.1:8114
```

OffCKB is also used to deploy the compiled vault-lock contract to the devnet.

---

## CKB CLI

CKB CLI is used for inspecting and interacting with the local CKB node.

It has been useful for:

* Checking transaction status.
* Inspecting live Cells.
* Inspecting transactions.
* Calculating Blake2b hashes.
* Inspecting deployed contract information.
* Verifying Cell data.

For example:

```bash
ckb-cli rpc get_transaction
```

and:

```bash
ckb-cli rpc get_live_cell
```

are useful when debugging transactions and Cells.

---

## CKB Testtool

CKB Testtool is used for testing the Rust contract before deploying it to the blockchain.

This allows the lock script to be tested in an isolated environment before it is deployed to the devnet.

The general development process is:

```text
Rust Contract
      ↓
CKB Testtool
      ↓
Tests Pass
      ↓
Build Binary
      ↓
Deploy to Devnet
```

---

# Why These Technologies?

The technologies were selected because each one corresponds to a specific part of the CKB development stack.

| Technology   | Purpose                                     |
| ------------ | ------------------------------------------- |
| CKB          | Blockchain and Cell Model                   |
| Rust         | On-chain lock script                        |
| CKB Testtool | Contract testing                            |
| CCC          | TypeScript/CKB interaction                  |
| TypeScript   | Off-chain transaction scripts               |
| OffCKB       | Local CKB devnet                            |
| CKB CLI      | Blockchain inspection and debugging         |
| pnpm         | JavaScript/TypeScript dependency management |
| Node.js      | Runtime for TypeScript scripts              |

Together they provide an end-to-end CKB development environment.

---

# Vault Lock Policy

The current vault-lock implementation uses a **time-lock value**.

The current test configuration uses:

```text
Timelock: 100
```

The value is encoded into the transaction as:

```text
0x6400000000000000
```

The purpose of this experiment is to understand how a lock policy can be represented as script data and enforced by the CKB transaction validation system.

The long-term goal is to expand this into configurable vault policies such as:

```text
Time Lock
    │
    ├── Lock until block/time
    │
    ├── Unlock after condition
    │
    └── Withdraw when policy is satisfied
```

More complex policies can eventually be added.

---

# Devnet Testing Account

For development and testing, the project currently uses **CKB Devnet account #0**.

OffCKB provides pre-funded development accounts in the devnet genesis block.

Account #0 is used as the funding account for the project.

The development flow is:

```text
OffCKB Account #0
        │
        │ CKB
        ▼
Create Vault Transaction
        │
        ▼
Vault Cell
```

The account's CKB balance is therefore used to fund and test the vault.

> **Important:** These accounts are for development and testing only. They must never be used with real funds or reused on mainnet.

---

# Understanding CKB Cells

One of the main purposes of CKB Vault is to develop a practical understanding of the CKB Cell Model.

A vault does not simply store:

```text
user.balance = 5000 CKB
```

Instead, the CKB is stored in Cells.

A simplified vault Cell looks like:

```text
┌──────────────────────────────┐
│          Vault Cell           │
├──────────────────────────────┤
│ Capacity                      │
│ Lock Script                   │
│ Type Script                   │
│ Data                          │
└──────────────────────────────┘
```

The lock script determines the conditions under which the Cell can be spent.

When the vault is spent:

```text
Old Vault Cell
      │
      │ Transaction
      ▼
New Output Cells
```

The original Cell is consumed and new Cells are created.

This is one of the fundamental concepts behind the CKB architecture and an important reason for building this project.

---

# Important Development Lessons

During development, several issues helped clarify how CKB works internally.

### Cell Dependencies Matter

When a contract is deployed, the resulting deployment Cell becomes a dependency that transactions executing the contract need to reference.

A deployment therefore produces information such as:

```text
codeHash
txHash
index
depType
hashType
```

For the current vault-lock deployment:

```text
codeHash
0x6c4c1c2174b32852799498439844ff66100fba73d10b4b8941f800b14d50496b
```

and the Cell Dependency points to:

```text
txHash:
0x2f7577de9ac8cb93e89f06a82c387ef8634b81bc2830d09577fccca48cf17b01

index:
0

depType:
code
```

If the contract is redeployed, these values can change.

---

# Current Project Structure

The project currently follows a structure similar to:

```text
CKB-Vault/
│
├── contracts/
│   └── vault-lock/
│       ├── scripts/
│       │   └── create_vault.ts
│       │
│       ├── src/
│       │
│       ├── target/
│       │   └── riscv64imac-unknown-none-elf/
│       │
│       └── deployment/
│           └── devnet/
│               └── vault-lock/
│
├── dist-ts/
│   └── contracts/
│       └── vault-lock/
│           └── scripts/
│
├── docs/
│
├── package.json
├── pnpm-lock.yaml
└── tsconfig.json
```

The exact structure may continue to evolve as the MVP grows.

---

# Current Stage

CKB Vault is currently in the **early MVP development stage**.

### Completed

* [x] Local CKB devnet setup
* [x] OffCKB configuration
* [x] CKB CLI setup
* [x] Rust vault-lock contract
* [x] Rust contract testing workflow
* [x] Contract compilation
* [x] Contract binary inspection
* [x] Contract deployment to CKB devnet
* [x] Deployment transaction obtained
* [x] Contract code hash obtained
* [x] Cell Dependency obtained
* [x] CCC TypeScript connection to local CKB node
* [x] Devnet account #0 identified
* [x] TypeScript build configuration
* [x] Vault creation transaction development
* [x] Timelock data generation
* [x] Funding-cell selection and transaction construction

### Currently Being Developed

* [ ] Complete vault creation transaction
* [ ] Successfully create the vault Cell
* [ ] Verify the vault Cell on-chain
* [ ] Complete timelock enforcement testing
* [ ] Build deposit flow
* [ ] Build withdrawal/unlock flow
* [ ] Connect wallet
* [ ] Build frontend interface

---

# Project Direction

The current implementation is intentionally small.

The first goal is not to build a complete production DeFi vault.

The goal is to first prove the underlying architecture:

```text
Create Vault
      ↓
Deposit CKB
      ↓
Lock CKB
      ↓
Wait for Policy
      ↓
Satisfy Policy
      ↓
Unlock
      ↓
Withdraw
```

Once this basic flow works reliably, the project can evolve into a more complete vault protocol.

Future versions may support:

* Multiple lock policies
* Custom timelocks
* Multi-signature vaults
* Scheduled withdrawals
* Multiple CKB assets
* xUDT assets
* Wallet integration
* Vault management UI
* Vault history
* Transaction tracking
* Automated vault policies

---

# Disclaimer

CKB Vault is currently an experimental development project.

The project runs against a **local CKB devnet** and uses pre-funded development accounts.

It is **not production-ready** and should not be used to store real assets.

All contracts, transactions, deployment artifacts, and account configurations in the current MVP are intended for development and educational purposes only.

