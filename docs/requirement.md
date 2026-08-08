

# 2. `docs/requirements.md`

 a `docs` folder, that explain `requirements.md` :

<!-- ```markdown -->
# CKB Vault — MVP Requirements

## 1. Product Goal

CKB Vault allows a user to deposit CKB and lock it until a specified future time.

Once the unlock time is reached, the user can withdraw the CKB.

The vault is immutable after creation.

---

# 2. Functional Requirements

## 2.1 Wallet

The user must be able to connect a supported CKB wallet.

For the MVP, JoyID is the initial wallet integration target.

The application should be able to obtain:

- Wallet address
- Wallet balance
- Network information

---

## 2.2 Deposit CKB

The user must be able to initiate the vault creation process through a **Deposit CKB** action.

The user provides:

- Amount of CKB
- Unlock time

The user may optionally provide:

- Vault name

The application constructs the required transaction and asks the user to sign it.

After successful confirmation, a Vault Cell exists on-chain.

---

## 2.3 Vault Creation

Creating a vault must result in an on-chain representation of the vault.

The vault must contain:

- Owner
- Asset
- Amount
- Lock policy
- Unlock time

The exact representation of these values inside the CKB Cell will be determined during the technical architecture phase.

---

## 2.4 Vault Immutability

After creation, the vault cannot be modified.

The following properties cannot be changed:

- Owner
- Asset type
- Amount
- Unlock time
- Lock policy

If the user wants a different vault configuration, they must create another vault.

---

## 2.5 Time Lock

The MVP supports one lock policy:

**Time Lock**

The vault remains locked until the configured unlock time.

Before the unlock time:

```text
Withdraw = Not Allowed