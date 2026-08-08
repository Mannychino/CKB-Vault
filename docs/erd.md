

# 3. `docs/erd.md`

# CKB Vault — Entity Relationship Diagram

## 1. Overview

The CKB Vault MVP has four primary domain entities:

- Wallet
- Vault
- Asset
- Lock Policy

The relationship is:

```text
Wallet
  │
  │ owns
  │
  ▼
Vault
  │
  ├──────────────► Asset
  │
  └──────────────► Lock Policy