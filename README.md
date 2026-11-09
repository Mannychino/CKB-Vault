# CKB Vault

CKB Vault is a decentralized vault prototype built on the **Nervos CKB blockchain**. The project explores how assets can be deposited into a vault and controlled by programmable lock policies implemented through CKB scripts.

**Project status:** MVP / Development
**Network:** CKB Devnet / Testnet
**Asset:** CKB
**Unit:** CKB / Shannons

---
## Overview
The goal of CKB Vault is to allow a user to:

1. Connect a CKB wallet. (JoyID)
2. Create a vault.
3. Deposit CKB into the vault.
4. Configure a lock policy.
5. Keep the deposited asset locked until the policy is satisfied.
6. Eventually unlock and withdraw the asset when the Since condition are met.

### How it works
1. A TypeScript client builds a transaction that creates a Vault Cell holding CKB and a required lock duration in its data.
2. The lock script checks the spending input's since against the stored duration.
3. CKB consensus separately checks whether the relative block delay has elapsed since the Vault Cell was committed.
4. Once mature, a valid withdrawal consumes the Vault Cell and creates outputs.

Current lock policy (V1.0.1): relative block-number since only. The contract uses ckb_std::since::Since, rejects invalid flags and non-relative/non-block metrics, and accepts a delay greater than or equal to the stored block count. For 100 blocks, the spending input uses 0x8000000000000064; the Cell stores the duration 100 as eight little-endian bytes (0x6400000000000000).

### Stack
- On-chain: Rust, ckb-std, CKB-VM (RISC-V)
- Transactions: TypeScript, CCC, Node.js, pnpm
- Local chain/deployment: OffCKB
- Testing: Cargo, ckb-testtool; Node's built-in test runner for deployment tooling
- Interfaces: frontend/ (Next.js) and frontend-v1/ (local prototype)


# Devnet Testing Account

For development and testing, the project currently uses **CKB Devnet account 

OffCKB provides pre-funded development accounts in the devnet genesis block.

The account's CKB balance is therefore used to fund and test the vault.

> **Important:** These accounts are for development and testing only. They must never be used with real funds or reused on mainnet.

---

# Important Development Lessons

During development, several issues helped clarify how CKB works internally.

The exact structure may continue to evolve as the MVP grows.
---


### Currently Being Developed

*  Complete vault creation transaction
   Successfully create the vault Cell
*  Verify the vault Cell on-chain
*  Complete timelock enforcement testing
*  Build deposit flow
 *  Build withdrawal/unlock flow
 *  Connect wallet
   Build frontend interface

### Local Setup 
```
### 1. Terminal 1 — start devnet:
```

cd ~/CKB-Vault
offckb node

### 2. Terminal 2 — verify the devnet is reachable:
```

cd ~/CKB-Vault
offckb accounts
```

### 3. Build the Rust contract:
```

cd ~/CKB-Vault/contracts/vault-lock

cargo build \
  --release \
  --target riscv64imac-unknown-none-elf \
  --features contract \
  --bin vault-lock
```
### 4. Return to the repo root and deploy using the automated workflow:
```
cd ~/CKB-Vault
pnpm deploy:vault
```

### 5. Verify the generated frontend deployment:
```
cat frontend/lib/ckb/deployment.devnet.generated.ts
```

### 7. Verify the stale OutPoint is gone from the repo:
```
grep -R -n \
  --exclude-dir=node_modules \
  --exclude-dir=.git \
  --exclude-dir=.next \
  "4a596d31dc35e88fb1591debbf680b04a44b4a434e3a94453c21ea8950ffb4d9" \
  .
```

  ### 8. Type-check the frontend:
  ```
  cd ~/CKB-Vault/frontend
pnpm exec tsc --noEmit
```
### 9. Run the frontend tests:
```
 node --test \
  lib/vault-time.test.ts \
  lib/block-time.test.ts \
  lib/ckb/vault-data.test.ts \
  lib/ckb/create-vault.test.ts
```
  ## 10. Clear the frontend cache and start Next.js:
```
  rm -rf .next
pnpm dev
```
Prerequisites: Rust with the RISC-V target, Node.js, pnpm, and OffCKB. Commands below run from the repository root unless noted.

---

# Project Direction

The current implementation is intentionally small.

The first goal is not to build a complete production DeFi vault.

The goal is to first prove the underlying architecture:


---

# Disclaimer

CKB Vault is currently an experimental development project.

The project runs against a **local CKB devnet** and uses pre-funded development accounts.

It is **not production-ready** and should not be used to store real assets.

All contracts, transactions, deployment artifacts, and account configurations in the current MVP are intended for development and educational purposes only.

