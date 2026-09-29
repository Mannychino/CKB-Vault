# CKB-Vault V1 Local UI

This is a zero-framework frontend for testing the existing V1 flow.

It does not duplicate the transaction code. The local server executes:

- `dist-ts/contracts/vault-lock/scripts/create_vault.js`
- `dist-ts/contracts/vault-lock/scripts/withdraw_vault.js`

The UI also reads the same `scripts.json` and `system-scripts.json` used by V1.

## Put it in the repo

Copy the `frontend-v1` folder into the root of `CKB-Vault`:

```text
CKB-Vault/
├── contracts/
├── dist-ts/
├── frontend-v1/
└── ...
```

## Prerequisites

From `CKB-Vault`:

```bash
offckb node
pnpm exec tsc
```

Your deployed configuration must already exist:

```text
contracts/vault-lock/deployment/scripts.json
contracts/vault-lock/deployment/system-scripts.json
```

## Run it

Use the same local OffCKB devnet key you already test V1 with:

```bash
export CKB_PRIVATE_KEY="0xYOUR_DEVNET_PRIVATE_KEY"
export CKB_RPC_URL="http://127.0.0.1:28114"
export CKB_RPC_FALLBACK="http://127.0.0.1:8114"
```

From the CKB-Vault root:

```bash
node frontend-v1/server.mjs
```

Open:

```text
http://127.0.0.1:3000
```

The page automatically shows:

- OffCKB connection + current block
- deployed vault-lock + CellDep
- signer address derived from the exported private key
- compiled V1 script status
- Create Vault
- Vault Cell inspection and maturity
- Withdraw
- raw script output for debugging

## Security

This is a local V1 developer demo. Never use a real mainnet private key. The server process reads `CKB_PRIVATE_KEY`; it is never returned to the browser.

V1 still has no owner authorization in the custom vault lock. V2 will address that.
