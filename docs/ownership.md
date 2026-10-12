# CKB-Vault Ownership Model

## Version

CKB-Vault v1.0.1

## Purpose

This document defines who owns a Vault Cell and who has authority to
spend it.

## V1.0.1 Ownership Rule

For CKB-Vault v1.0.1:

**creator = owner**

The wallet that funds and creates a Vault is also the owner of that Vault.

Ownership is assigned when the Vault Cell is created and does not change
during the lifetime of the Vault.

## Creation

A user creates a Vault by spending CKB Cells they already control.

The user's existing lock script provides authorization for spending those
funding Cells.

When the new Vault Cell is created, the creator's identity must be bound
to the Vault.

## Withdrawal

A Vault can only be spent when both conditions are satisfied:

1. The Vault timelock has matured.
2. The transaction is authorized by the Vault owner.

The timelock alone must never grant spending authority.

## Expected Behaviour

- Owner before maturity: reject.
- Non-owner before maturity: reject.
- Owner at maturity: accept.
- Owner after maturity: accept.
- Non-owner after maturity: reject.

## Ownership Lifetime

Ownership is immutable in v1.0.1.

The following features are not supported:

- ownership transfer
- separate creator and beneficiary
- multiple owners
- multisig ownership
- recovery owner
- administrator override

These may be considered in later versions.

## Security Invariant

A Vault Cell must not be spendable unless:

**the timelock condition is satisfied AND the creator/owner authorizes
the transaction.**