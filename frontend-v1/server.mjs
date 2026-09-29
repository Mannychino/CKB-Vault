import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ccc, KnownScript } from '@ckb-ccc/core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.env.CKB_VAULT_ROOT ?? path.join(__dirname, '..'));
const PORT = Number(process.env.CKB_VAULT_UI_PORT ?? '3000');
const NETWORK = process.env.CKB_NETWORK ?? 'devnet';
const RPC_URL = process.env.CKB_RPC_URL ?? 'http://127.0.0.1:28114';
const RPC_FALLBACK = process.env.CKB_RPC_FALLBACK ?? 'http://127.0.0.1:8114';
const PRIVATE_KEY = process.env.CKB_PRIVATE_KEY ?? '';

const DEPLOYMENT_DIR = path.join(ROOT, 'contracts/vault-lock/deployment');
const SCRIPTS_PATH = process.env.CKB_VAULT_SCRIPTS_PATH ?? path.join(DEPLOYMENT_DIR, 'scripts.json');
const SYSTEM_SCRIPTS_PATH = process.env.CKB_SYSTEM_SCRIPTS_PATH ?? path.join(DEPLOYMENT_DIR, 'system-scripts.json');
const CREATE_SCRIPT = path.join(ROOT, 'dist-ts/contracts/vault-lock/scripts/create_vault.js');
const WITHDRAW_SCRIPT = path.join(ROOT, 'dist-ts/contracts/vault-lock/scripts/withdraw_vault.js');
const INDEX_HTML = path.join(__dirname, 'index.html');

function json(res, status, body) {
  const data = JSON.stringify(body);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
  });
  res.end(data);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 1_000_000) reject(new Error('Request too large'));
    });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function deploymentFiles() {
  return {
    scripts: fs.existsSync(SCRIPTS_PATH),
    systemScripts: fs.existsSync(SYSTEM_SCRIPTS_PATH),
    createScript: fs.existsSync(CREATE_SCRIPT),
    withdrawScript: fs.existsSync(WITHDRAW_SCRIPT),
  };
}

function loadVaultDeployment() {
  const file = readJson(SCRIPTS_PATH);
  const network = file[NETWORK];
  if (!network) throw new Error(`Network ${NETWORK} not found in scripts.json`);
  const vault = network['vault-lock'];
  if (!vault?.cellDeps?.length) throw new Error('vault-lock deployment or CellDep missing');
  return vault;
}

function loadSystemScripts() {
  const file = readJson(SYSTEM_SCRIPTS_PATH);
  const scripts = file[NETWORK];
  if (!scripts) throw new Error(`Network ${NETWORK} not found in system-scripts.json`);
  const get = name => {
    const entry = scripts[name];
    if (!entry?.script) throw new Error(`System script ${name} not found`);
    return entry.script;
  };
  const cvt = s => ({ codeHash: s.codeHash, hashType: s.hashType, cellDeps: s.cellDeps });
  return {
    [KnownScript.Secp256k1Blake160]: cvt(get('secp256k1_blake160_sighash_all')),
    [KnownScript.Secp256k1Multisig]: cvt(get('secp256k1_blake160_multisig_all')),
    [KnownScript.NervosDao]: cvt(get('dao')),
    [KnownScript.AnyoneCanPay]: cvt(get('anyone_can_pay')),
    [KnownScript.OmniLock]: cvt(get('omnilock')),
    [KnownScript.XUdt]: cvt(get('xudt')),
  };
}

function createClient() {
  return new ccc.ClientPublicTestnet({
    url: RPC_URL,
    scripts: loadSystemScripts(),
    fallbacks: RPC_FALLBACK ? [RPC_FALLBACK] : [],
  });
}

async function rpc(method, params = []) {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: 1, jsonrpc: '2.0', method, params }),
  });
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message ?? `RPC ${method} failed`);
  return body.result;
}

function runScript(script, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      cwd: ROOT,
      shell: false,
      env: { ...process.env, ...extraEnv },
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', x => stdout += x.toString());
    child.stderr.on('data', x => stderr += x.toString());
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0) return resolve({ stdout, stderr });
      reject(new Error([`Script exited with code ${code}`, stdout.trim(), stderr.trim()].filter(Boolean).join('\n')));
    });
  });
}

function capture(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.match(new RegExp(`${escaped}\\s*:\\s*(.+)`))?.[1]?.trim() ?? null;
}

function decodeLeU64(data) {
  const raw = data.startsWith('0x') ? data.slice(2) : data;
  if (raw.length < 16) throw new Error('Vault data is shorter than 8 bytes');
  const bytes = raw.slice(0, 16).match(/.{2}/g);
  return BigInt(`0x${bytes.reverse().join('')}`);
}

function shannonsToCkb(n) {
  const whole = n / 100000000n;
  const frac = n % 100000000n;
  if (frac === 0n) return whole.toString();
  return `${whole}.${frac.toString().padStart(8, '0').replace(/0+$/, '')}`;
}

async function status() {
  const files = deploymentFiles();
  const result = {
    network: NETWORK,
    rpcUrl: RPC_URL,
    rpcFallback: RPC_FALLBACK,
    files,
    node: { connected: false },
    contract: { active: false },
    signer: { configured: false },
  };

  try {
    const tip = await rpc('get_tip_header');
    result.node = { connected: true, blockNumber: BigInt(tip.number).toString(), blockHash: tip.hash };
  } catch (e) {
    result.node = { connected: false, error: e.message };
  }

  if (files.scripts && files.systemScripts) {
    try {
      const deployment = loadVaultDeployment();
      const dep = deployment.cellDeps[0].cellDep;
      result.contract = {
        active: false,
        codeHash: deployment.codeHash,
        hashType: deployment.hashType,
        cellDep: `${dep.outPoint.txHash}:${dep.outPoint.index}`,
      };
      if (result.node.connected) {
        const cell = await createClient().getCell(ccc.OutPoint.from({
          txHash: dep.outPoint.txHash,
          index: dep.outPoint.index,
        }));
        result.contract.active = Boolean(cell);
      }
    } catch (e) {
      result.contract = { active: false, error: e.message };
    }
  }

  try {
    if (!/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) throw new Error('CKB_PRIVATE_KEY is not configured');
    const signer = new ccc.SignerCkbPrivateKey(createClient(), PRIVATE_KEY);
    result.signer = { configured: true, address: await signer.getRecommendedAddress() };
  } catch (e) {
    result.signer = { configured: false, error: e.message };
  }

  return result;
}

async function inspectVault(txHash, indexText) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error('Invalid vault transaction hash');
  if (!/^\d+$/.test(indexText)) throw new Error('Invalid output index');
  const index = BigInt(indexText);
  const [live, tip] = await Promise.all([
    rpc('get_live_cell', [{ tx_hash: txHash, index: `0x${index.toString(16)}` }, true]),
    rpc('get_tip_header'),
  ]);
  const currentBlock = BigInt(tip.number);
  if (live.status !== 'live' || !live.cell) {
    return { live: false, status: live.status, outPoint: `${txHash}:${index}`, currentBlock: currentBlock.toString() };
  }
  const capacity = BigInt(live.cell.output.capacity);
  const data = live.cell.data.content;
  const timelock = decodeLeU64(data);
  return {
    live: true,
    status: live.status,
    outPoint: `${txHash}:${index}`,
    capacityShannons: capacity.toString(),
    capacityCkb: shannonsToCkb(capacity),
    data,
    timelock: timelock.toString(),
    currentBlock: currentBlock.toString(),
    mature: currentBlock >= timelock,
    blocksRemaining: currentBlock >= timelock ? '0' : (timelock - currentBlock).toString(),
    lock: {
      args: live.cell.output.lock.args,
      codeHash: live.cell.output.lock.code_hash,
      hashType: live.cell.output.lock.hash_type,
    },
  };
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);

    if (req.method === 'GET' && url.pathname === '/') {
      const html = fs.readFileSync(INDEX_HTML);
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/status') {
      json(res, 200, await status());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/vault') {
      json(res, 200, await inspectVault(url.searchParams.get('txHash') ?? '', url.searchParams.get('index') ?? '0'));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/create') {
      if (!fs.existsSync(CREATE_SCRIPT)) throw new Error('Compiled create_vault.js missing. Run pnpm exec tsc from the repo root.');
      if (!/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) throw new Error('CKB_PRIVATE_KEY is not configured');
      const body = await readBody(req);
      const amount = String(body.amount ?? '').trim();
      const timelock = String(body.timelock ?? '').trim();
      if (!/^\d+(\.\d+)?$/.test(amount) || Number(amount) <= 0) throw new Error('Vault amount must be positive');
      if (!/^\d+$/.test(timelock) || BigInt(timelock) <= 0n) throw new Error('V1 timelock must be a positive absolute block number');
      const out = await runScript(CREATE_SCRIPT, { VAULT_AMOUNT: amount, VAULT_TIMELOCK: timelock });
      json(res, 200, {
        ...out,
        transactionHash: capture(out.stdout, 'Transaction hash'),
        vaultCell: capture(out.stdout, 'Vault Cell'),
        vaultAmount: capture(out.stdout, 'Vault amount'),
        timelock: capture(out.stdout, 'Timelock'),
        vaultData: capture(out.stdout, 'Vault data'),
      });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/withdraw') {
      if (!fs.existsSync(WITHDRAW_SCRIPT)) throw new Error('Compiled withdraw_vault.js missing. Run pnpm exec tsc from the repo root.');
      if (!/^0x[0-9a-fA-F]{64}$/.test(PRIVATE_KEY)) throw new Error('CKB_PRIVATE_KEY is not configured');
      const body = await readBody(req);
      const txHash = String(body.txHash ?? '').trim();
      const index = String(body.index ?? '0').trim();
      if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) throw new Error('Invalid vault transaction hash');
      if (!/^\d+$/.test(index)) throw new Error('Invalid output index');
      const out = await runScript(WITHDRAW_SCRIPT, { VAULT_TX_HASH: txHash, VAULT_INDEX: index });
      json(res, 200, {
        ...out,
        transactionHash: capture(out.stdout, 'Transaction hash'),
        newOutputCell: capture(out.stdout, 'New output Cell'),
        returnedCapacity: capture(out.stdout, 'Returned capacity'),
      });
      return;
    }

    json(res, 404, { error: 'Not found' });
  } catch (e) {
    json(res, 500, { error: e instanceof Error ? e.message : String(e) });
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`CKB-Vault V1 UI: http://127.0.0.1:${PORT}`);
  console.log(`Repo root: ${ROOT}`);
  console.log(`RPC: ${RPC_URL}`);
});
