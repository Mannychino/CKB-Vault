

`docs/use-cases.md`

```markdown
# CKB Vault — Use Cases

## 1. Actors

### Primary Actor

**User**

The user owns CKB and interacts with CKB Vault through a CKB wallet.

### External Systems

- CKB Blockchain
- CKB Wallet
- CCC
- CKB Indexer / RPC infrastructure

---

# 2. Use Case Overview

```text
                     ┌──────────────────────┐
                     │        User          │
                     └──────────┬───────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
          Connect Wallet   Deposit CKB     View Vaults
                                │               │
                                ▼               ▼
                         Create Vault      View Details
                                │
                                ▼
                          Withdraw CKB