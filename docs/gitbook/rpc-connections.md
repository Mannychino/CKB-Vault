# RPC connection methods

RPC is the node interface. Signing is a separate operation: a node does not sign arbitrary funding inputs just because you can connect to it.

## Available paths

| Method | Read chain | Create/fund | Withdraw | Where signing happens |
| --- | --- | --- | --- | --- |
| Existing TypeScript CLI scripts | Yes | Implemented | Implemented | Local development key signs funding inputs |
| Next.js + CCC wallet connector | Yes | Implemented | No withdrawal UI implemented | Connected wallet signs funding inputs |
| Local developer UI or REST API | Yes | Implemented in block-duration mode | Implemented | Server invokes CLI scripts with its environment key |
| HTTP JSON-RPC: curl, fetch, Postman, Insomnia | Yes | Submit a separately built, signed transaction | Submit a correctly constructed spend | External signer/SDK; RPC itself does not sign |
| CKB CLI | Yes | CLI transaction tooling requires custom assembly | Requires custom vault input/data/dependency handling | CLI-managed signing for inputs that require it |
| Custom SDK application | Yes | Possible by implementing the same transaction flow | Possible by implementing the current lock rules | SDK signer or wallet integration |

These cover the repository's implemented paths and the practical protocol-level alternatives. Other HTTP clients can make the same JSON-RPC requests; they are not additional vault implementations.

## 1. Existing CCC terminal client

The [creation](../../contracts/vault-lock/scripts/create_vault.ts) and [withdrawal](../../contracts/vault-lock/scripts/withdraw_vault.ts) scripts instantiate `ccc.ClientPublicTestnet` with:

```typescript
// Configuration shape used by the root scripts; loadSystemScripts is
// a local helper in those scripts, not a CCC SDK export.
const client = new ccc.ClientPublicTestnet({
  url: RPC_URL,
  scripts: loadSystemScripts(),
  fallbacks: RPC_FALLBACK ? [RPC_FALLBACK] : [],
});
const signer = new ccc.SignerCkbPrivateKey(client, privateKey);
```

Despite the class name, this configuration connects to **local devnet**, supplying local system scripts. The scripts reject `CKB_NETWORK` values other than `devnet`. Changing only the URL is not a supported public-network migration.

The root package uses CCC core 1.x. The frontend uses connector-react 2.x and its `ClientPublicTestnet.open({ urls, scripts })` API. Use the API for the package installed in the relevant directory.

## 2. Wallet-connected browser

The [frontend client](../../frontend/lib/ckb/devnet-client.ts) opens the URL configured in [networks.ts](../../frontend/lib/ckb/networks.ts), then supplies it to a CCC React provider. Wallet selection supplies a signer; the client supplies chain access.

Wallet availability does not imply local-devnet compatibility. Verify that the selected wallet can sign the configured funding lock and that its address has funds on this devnet. The README mentions JoyID as a goal; the current generic connector does not establish that every wallet, including JoyID, works on this local chain.

The browser must reach the RPC URL. In a browser, `127.0.0.1` means the user's machine. Remote workspaces, WSL, CORS restrictions, and HTTPS pages calling HTTP endpoints can affect connectivity. Root shell environment variables do not change the hard-coded frontend URL.

## 3. Local server API

The [developer server](../../frontend-v1/server.mjs) listens on loopback and provides REST endpoints. Those endpoints invoke the CLI and query JSON-RPC; they are not CKB node methods. See [API examples](frontends.md).

## 4. Direct HTTP JSON-RPC

Send HTTP POST requests with `Content-Type: application/json` and a body containing `jsonrpc`, `id`, `method`, and `params`. The same body works in curl, Node fetch, Postman, or Insomnia. See the [cookbook](rpc-cookbook.md) for requests, cell discovery, submission, and confirmation.

## 5. CKB CLI

Point CKB CLI at the chosen node:

```bash
ckb-cli --url "$CKB_RPC_URL" rpc get_tip_header
ckb-cli --url "$CKB_RPC_URL" rpc get_transaction --help
ckb-cli --url "$CKB_RPC_URL" rpc get_live_cell --help
ckb-cli --url "$CKB_RPC_URL" tx --help
```

Flags for transaction assembly differ by CLI version. Use its installed help. An ordinary wallet transfer command does not automatically encode this custom vault's eight-byte data, relative `since`, or dependency. Use the existing scripts for the documented end-to-end workflow.

## 6. Other SDKs and remote nodes

A custom CCC application, Lumos-based application, or another CKB SDK can build compatible transactions. Those alternatives are not implemented here. They must discover cells, resolve matching script dependencies, encode the lock policy, balance capacity, generate required witnesses, and submit through JSON-RPC.

A remote devnet node is possible if it exposes the required RPC/indexer methods and hosts the same deployed scripts. Public testnet/mainnet requires matching deployment metadata, system scripts, wallet/network configuration, funding, and code changes to the devnet guard. The current ownership and input-group limitations must be addressed before considering real assets.

## Fallback and indexer behavior

CCC clients in the CLI accept a fallback URL. The creation script's direct `fetch` calls for estimating block time use only the primary URL; on failure they use the configured block-time estimate. The local server's direct RPC helper tries primary and fallback. The Next.js client configures only one URL.

`get_tip_header` proves basic node access. Funding-cell selection also requires an available, synchronized indexer, commonly through `get_cells`. Do not assume a node-only endpoint can perform all SDK operations. Keep fallback endpoints on the same chain; inspect their genesis header and expected deployment cell before using them interchangeably.
