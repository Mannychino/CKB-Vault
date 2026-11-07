# Install and deploy

Use Linux or WSL2. Install Git, Node.js, pnpm, Rust/Cargo, OffCKB, and optionally CKB CLI for inspection. Use a Node version compatible with the frontend's installed Next.js version. The frontend declares pnpm 12.6.0; the root does not pin a package manager. CKB Debugger is useful for deeper script debugging.

Commands below run from the repository root unless stated otherwise.

```bash
git clone https://github.com/Mannychino/CKB-Vault.git
cd CKB-Vault
pnpm install
pnpm --dir frontend install
rustup target add riscv64imac-unknown-none-elf
```

## Start devnet

Keep this running in a separate terminal:

```bash
offckb node
```

In your working terminal:

```bash
offckb accounts
export CKB_NETWORK=devnet
export CKB_RPC_URL=http://127.0.0.1:28114
export CKB_RPC_FALLBACK=http://127.0.0.1:8114
```

The scripts default to port 28114 with port 8114 as fallback. Check the OffCKB startup output and [probe the endpoint](rpc-cookbook.md). Both URLs must address the same devnet. A responding port does not prove that it serves the right chain or indexer.

## Build and test

```bash
cargo build --manifest-path contracts/vault-lock/Cargo.toml \
  --release --target riscv64imac-unknown-none-elf \
  --features contract --bin vault-lock
cd contracts/vault-lock
cargo test
cd ../..
```

Tests load the compiled contract binary, so build it first. Inspect it if needed:

```bash
file contracts/vault-lock/target/riscv64imac-unknown-none-elf/release/vault-lock
ckb-cli util blake2b --binary-path contracts/vault-lock/target/riscv64imac-unknown-none-elf/release/vault-lock
```

## Deploy and synchronize

```bash
pnpm deploy:vault
offckb system-scripts --output contracts/vault-lock/deployment/system-scripts.json
pnpm exec tsc
```

The deployment command deploys to devnet, regenerates the frontend vault deployment configuration, and runs its synchronization tests. It does not build the Rust binary first.

The source deployment metadata is [scripts.json](../../contracts/vault-lock/deployment/scripts.json). The frontend consumes [deployment.devnet.generated.ts](../../frontend/lib/ckb/deployment.devnet.generated.ts). Do not copy transaction hashes from an earlier chain instance.

After manually deploying, run:

```bash
pnpm sync:vault-deployment
pnpm test:vault-deployment
```

Frontend system-script dependencies are separately configured in [networks.ts](../../frontend/lib/ckb/networks.ts); the synchronization command only updates the custom vault deployment. Recheck system dependencies after resetting devnet.

## Configure a development signer

Use an OffCKB prefunded account. You can inspect development keys with `offckb accounts --show-private-keys`. Enter the selected key without placing it in shell history:

```bash
read -rsp 'Devnet private key: ' CKB_PRIVATE_KEY
export CKB_PRIVATE_KEY
```

The expected format is `0x` followed by 64 hexadecimal characters. Never use a real-funds key. Continue with [the transaction walkthrough](transactions.md).
