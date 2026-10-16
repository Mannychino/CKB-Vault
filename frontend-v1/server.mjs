import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  ccc,
  KnownScript,
} from '@ckb-ccc/core';

const __dirname =
  path.dirname(
    fileURLToPath(
      import.meta.url,
    ),
  );

const ROOT =
  path.resolve(
    process.env.CKB_VAULT_ROOT ??
      path.join(
        __dirname,
        '..',
      ),
  );

const PORT =
  Number(
    process.env.CKB_VAULT_UI_PORT ??
      '3000',
  );

const NETWORK =
  process.env.CKB_NETWORK ??
  'devnet';

const RPC_URL =
  process.env.CKB_RPC_URL ??
  'http://127.0.0.1:28114';

const RPC_FALLBACK =
  process.env.CKB_RPC_FALLBACK ??
  'http://127.0.0.1:8114';

const PRIVATE_KEY =
  process.env.CKB_PRIVATE_KEY ??
  '';

const BLOCK_SAMPLE_SIZE =
  BigInt(
    process.env.CKB_BLOCK_SAMPLE_SIZE ??
      '100',
  );

const FALLBACK_BLOCK_SECONDS =
  Number(
    process.env.CKB_FALLBACK_BLOCK_SECONDS ??
      '10',
  );

const DEPLOYMENT_DIR =
  path.join(
    ROOT,
    'contracts/vault-lock/deployment',
  );

const SCRIPTS_PATH =
  process.env.CKB_VAULT_SCRIPTS_PATH ??
  path.join(
    DEPLOYMENT_DIR,
    'scripts.json',
  );

const SYSTEM_SCRIPTS_PATH =
  process.env.CKB_SYSTEM_SCRIPTS_PATH ??
  path.join(
    DEPLOYMENT_DIR,
    'system-scripts.json',
  );

const CREATE_SCRIPT =
  path.join(
    ROOT,
    'dist-ts/contracts/vault-lock/scripts/create_vault.js',
  );

const WITHDRAW_SCRIPT =
  path.join(
    ROOT,
    'dist-ts/contracts/vault-lock/scripts/withdraw_vault.js',
  );

const INDEX_HTML =
  path.join(
    __dirname,
    'index.html',
  );

function json(
  res,
  status,
  body,
) {
  const data =
    JSON.stringify(
      body,
    );

  res.writeHead(
    status,
    {
      'content-type':
        'application/json; charset=utf-8',

      'content-length':
        Buffer.byteLength(
          data,
        ),

      'cache-control':
        'no-store',
    },
  );

  res.end(
    data,
  );
}

function readBody(
  req,
) {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      let data =
        '';

      req.on(
        'data',
        chunk => {
          data +=
            chunk.toString();

          if (
            data.length >
            1_000_000
          ) {
            reject(
              new Error(
                'Request too large',
              ),
            );
          }
        },
      );

      req.on(
        'end',
        () => {
          if (!data) {
            resolve(
              {},
            );

            return;
          }

          try {
            resolve(
              JSON.parse(
                data,
              ),
            );
          } catch {
            reject(
              new Error(
                'Invalid JSON body',
              ),
            );
          }
        },
      );

      req.on(
        'error',
        reject,
      );
    },
  );
}

function readJson(
  file,
) {
  return JSON.parse(
    fs.readFileSync(
      file,
      'utf8',
    ),
  );
}

function deploymentFiles() {
  return {
    scripts:
      fs.existsSync(
        SCRIPTS_PATH,
      ),

    systemScripts:
      fs.existsSync(
        SYSTEM_SCRIPTS_PATH,
      ),

    createScript:
      fs.existsSync(
        CREATE_SCRIPT,
      ),

    withdrawScript:
      fs.existsSync(
        WITHDRAW_SCRIPT,
      ),
  };
}

function loadVaultDeployment() {
  const file =
    readJson(
      SCRIPTS_PATH,
    );

  const network =
    file[NETWORK];

  if (!network) {
    throw new Error(
      `Network ${NETWORK} not found in scripts.json`,
    );
  }

  const vault =
    network['vault-lock'];

  if (
    !vault ||
    !vault.cellDeps ||
    vault.cellDeps.length === 0
  ) {
    throw new Error(
      'vault-lock deployment or CellDep missing',
    );
  }

  return vault;
}

function loadSystemScripts() {
  const file =
    readJson(
      SYSTEM_SCRIPTS_PATH,
    );

  const scripts =
    file[NETWORK];

  if (!scripts) {
    throw new Error(
      `Network ${NETWORK} not found in system-scripts.json`,
    );
  }

  const get =
    name => {
      const entry =
        scripts[name];

      if (
        !entry ||
        !entry.script
      ) {
        throw new Error(
          `System script ${name} not found`,
        );
      }

      return entry.script;
    };

  const convert =
    script => ({
      codeHash:
        script.codeHash,

      hashType:
        script.hashType,

      cellDeps:
        script.cellDeps,
    });

  return {
    [KnownScript.Secp256k1Blake160]:
      convert(
        get(
          'secp256k1_blake160_sighash_all',
        ),
      ),

    [KnownScript.Secp256k1Multisig]:
      convert(
        get(
          'secp256k1_blake160_multisig_all',
        ),
      ),

    [KnownScript.NervosDao]:
      convert(
        get(
          'dao',
        ),
      ),

    [KnownScript.AnyoneCanPay]:
      convert(
        get(
          'anyone_can_pay',
        ),
      ),

    [KnownScript.OmniLock]:
      convert(
        get(
          'omnilock',
        ),
      ),

    [KnownScript.XUdt]:
      convert(
        get(
          'xudt',
        ),
      ),
  };
}

function createClient() {
  return new ccc.ClientPublicTestnet(
    {
      url:
        RPC_URL,

      scripts:
        loadSystemScripts(),

      fallbacks:
        RPC_FALLBACK
          ? [
              RPC_FALLBACK,
            ]
          : [],
    },
  );
}

async function rpc(
  method,
  params = [],
) {
  const endpoints =
    [
      RPC_URL,
      RPC_FALLBACK,
    ].filter(
      Boolean,
    );

  let lastError =
    null;

  for (
    const endpoint
    of endpoints
  ) {
    try {
      const response =
        await fetch(
          endpoint,
          {
            method:
              'POST',

            headers: {
              'content-type':
                'application/json',
            },

            body:
              JSON.stringify({
                id:
                  1,

                jsonrpc:
                  '2.0',

                method,

                params,
              }),
          },
        );

      if (
        !response.ok
      ) {
        throw new Error(
          `RPC HTTP ${response.status}`,
        );
      }

      const body =
        await response.json();

      if (
        body.error
      ) {
        throw new Error(
          body.error.message ??
            `RPC ${method} failed`,
        );
      }

      return body.result;
    } catch (
      error
    ) {
      lastError =
        error;
    }
  }

  throw (
    lastError ??
    new Error(
      `RPC ${method} failed`,
    )
  );
}

function runScript(
  script,
  extraEnv = {},
) {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const child =
        spawn(
          process.execPath,
          [
            script,
          ],
          {
            cwd:
              ROOT,

            shell:
              false,

            env: {
              ...process.env,
              ...extraEnv,
            },
          },
        );

      let stdout =
        '';

      let stderr =
        '';

      child.stdout.on(
        'data',
        chunk => {
          stdout +=
            chunk.toString();
        },
      );

      child.stderr.on(
        'data',
        chunk => {
          stderr +=
            chunk.toString();
        },
      );

      child.on(
        'error',
        reject,
      );

      child.on(
        'close',
        code => {
          if (
            code === 0
          ) {
            resolve({
              stdout,
              stderr,
            });

            return;
          }

          reject(
            new Error(
              [
                `Script exited with code ${code}`,
                stdout.trim(),
                stderr.trim(),
              ]
                .filter(
                  Boolean,
                )
                .join(
                  '\n',
                ),
            ),
          );
        },
      );
    },
  );
}

function capture(
  text,
  label,
) {
  const escaped =
    label.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

  const match =
    text.match(
      new RegExp(
        `${escaped}\\s*:\\s*(.+)`,
      ),
    );

  return (
    match?.[1]?.trim() ??
    null
  );
}

function decodeLeU64(
  data,
) {
  const raw =
    data.startsWith(
      '0x',
    )
      ? data.slice(
          2,
        )
      : data;

  if (
    raw.length <
    16
  ) {
    throw new Error(
      'Vault data is shorter than 8 bytes',
    );
  }

  const firstEightBytes =
    raw.slice(
      0,
      16,
    );

  const bytes =
    firstEightBytes.match(
      /.{2}/g,
    );

  if (!bytes) {
    throw new Error(
      'Unable to decode Vault data',
    );
  }

  return BigInt(
    `0x${bytes
      .reverse()
      .join('')}`,
  );
}

function shannonsToCkb(
  value,
) {
  const whole =
    value /
    100000000n;

  const fraction =
    value %
    100000000n;

  if (
    fraction ===
    0n
  ) {
    return whole.toString();
  }

  return (
    `${whole}.` +
    fraction
      .toString()
      .padStart(
        8,
        '0',
      )
      .replace(
        /0+$/,
        '',
      )
  );
}

function formatEstimatedDuration(
  seconds,
) {
  if (
    !Number.isFinite(
      seconds,
    ) ||
    seconds <= 0
  ) {
    return '0 minutes';
  }

  let remaining =
    Math.ceil(
      seconds,
    );

  const days =
    Math.floor(
      remaining /
      86400,
    );

  remaining %=
    86400;

  const hours =
    Math.floor(
      remaining /
      3600,
    );

  remaining %=
    3600;

  const minutes =
    Math.floor(
      remaining /
      60,
    );

  const parts =
    [];

  if (
    days >
    0
  ) {
    parts.push(
      `${days} day${days === 1 ? '' : 's'}`,
    );
  }

  if (
    hours >
    0
  ) {
    parts.push(
      `${hours} hour${hours === 1 ? '' : 's'}`,
    );
  }

  if (
    minutes >
      0 ||
    parts.length ===
      0
  ) {
    parts.push(
      `${minutes} minute${minutes === 1 ? '' : 's'}`,
    );
  }

  return parts.join(
    ', ',
  );
}

async function estimateAverageBlockSeconds(
  sampleSize =
    BLOCK_SAMPLE_SIZE,
) {
  try {
    const tip =
      await rpc(
        'get_tip_header',
      );

    if (!tip) {
      throw new Error(
        'Unable to read tip header',
      );
    }

    const tipNumber =
      BigInt(
        tip.number,
      );

    const actualSample =
      tipNumber <
      sampleSize
        ? tipNumber
        : sampleSize;

    if (
      actualSample ===
      0n
    ) {
      return FALLBACK_BLOCK_SECONDS;
    }

    const startNumber =
      tipNumber -
      actualSample;

    const startHeader =
      await rpc(
        'get_header_by_number',
        [
          `0x${startNumber.toString(16)}`,
        ],
      );

    if (
      !startHeader
    ) {
      return FALLBACK_BLOCK_SECONDS;
    }

    const tipTimestamp =
      BigInt(
        tip.timestamp,
      );

    const startTimestamp =
      BigInt(
        startHeader.timestamp,
      );

    if (
      tipTimestamp <=
      startTimestamp
    ) {
      return FALLBACK_BLOCK_SECONDS;
    }

    const elapsedMilliseconds =
      tipTimestamp -
      startTimestamp;

    const averageMilliseconds =
      Number(
        elapsedMilliseconds,
      ) /
      Number(
        actualSample,
      );

    const averageSeconds =
      averageMilliseconds /
      1000;

    if (
      !Number.isFinite(
        averageSeconds,
      ) ||
      averageSeconds <=
        0
    ) {
      return FALLBACK_BLOCK_SECONDS;
    }

    return averageSeconds;
  } catch {
    return FALLBACK_BLOCK_SECONDS;
  }
}

async function getTransactionCommitmentInfo(
  txHash,
) {
  const transaction =
    await rpc(
      'get_transaction',
      [
        txHash,
      ],
    );

  if (
    !transaction ||
    !transaction.tx_status
  ) {
    throw new Error(
      'Unable to read Vault transaction status',
    );
  }

  const status =
    transaction
      .tx_status
      .status;

  if (
    status !==
    'committed'
  ) {
    throw new Error(
      `Vault transaction is not committed. Status: ${status}`,
    );
  }

  const blockHash =
    transaction
      .tx_status
      .block_hash;

  if (
    !blockHash
  ) {
    throw new Error(
      'Committed Vault transaction has no block hash',
    );
  }

  const header =
    await rpc(
      'get_header',
      [
        blockHash,
      ],
    );

  if (!header) {
    throw new Error(
      'Unable to read Vault commitment block header',
    );
  }

  return {
    blockHash,

    blockNumber:
      BigInt(
        header.number,
      ),

    timestamp:
      BigInt(
        header.timestamp,
      ),
  };
}

async function status() {
  const files =
    deploymentFiles();

  const result = {
    network:
      NETWORK,

    rpcUrl:
      RPC_URL,

    rpcFallback:
      RPC_FALLBACK,

    files,

    node: {
      connected:
        false,
    },

    contract: {
      active:
        false,
    },

    signer: {
      configured:
        false,
    },
  };

  try {
    const tip =
      await rpc(
        'get_tip_header',
      );

    result.node = {
      connected:
        true,

      blockNumber:
        BigInt(
          tip.number,
        ).toString(),

      blockHash:
        tip.hash,

      timestamp:
        BigInt(
          tip.timestamp,
        ).toString(),
    };
  } catch (
    error
  ) {
    result.node = {
      connected:
        false,

      error:
        error instanceof Error
          ? error.message
          : String(
              error,
            ),
    };
  }

  if (
    files.scripts &&
    files.systemScripts
  ) {
    try {
      const deployment =
        loadVaultDeployment();

      const dep =
        deployment
          .cellDeps[0]
          .cellDep;

      result.contract = {
        active:
          false,

        codeHash:
          deployment.codeHash,

        hashType:
          deployment.hashType,

        cellDep:
          `${dep.outPoint.txHash}:${dep.outPoint.index}`,
      };

      if (
        result.node
          .connected
      ) {
        const client =
          createClient();

        const cell =
          await client.getCell(
            ccc.OutPoint.from({
              txHash:
                dep
                  .outPoint
                  .txHash,

              index:
                dep
                  .outPoint
                  .index,
            }),
          );

        result.contract.active =
          Boolean(
            cell,
          );
      }
    } catch (
      error
    ) {
      result.contract = {
        active:
          false,

        error:
          error instanceof Error
            ? error.message
            : String(
                error,
              ),
      };
    }
  }

  try {
    if (
      !/^0x[0-9a-fA-F]{64}$/.test(
        PRIVATE_KEY,
      )
    ) {
      throw new Error(
        'CKB_PRIVATE_KEY is not configured',
      );
    }

    const signer =
      new ccc.SignerCkbPrivateKey(
        createClient(),
        PRIVATE_KEY,
      );

    result.signer = {
      configured:
        true,

      address:
        await signer
          .getRecommendedAddress(),
    };
  } catch (
    error
  ) {
    result.signer = {
      configured:
        false,

      error:
        error instanceof Error
          ? error.message
          : String(
              error,
            ),
    };
  }

  try {
    result.averageBlockSeconds =
      await estimateAverageBlockSeconds();
  } catch {
    result.averageBlockSeconds =
      FALLBACK_BLOCK_SECONDS;
  }

  return result;
}

async function inspectVault(
  txHash,
  indexText,
) {
  if (
    !/^0x[0-9a-fA-F]{64}$/.test(
      txHash,
    )
  ) {
    throw new Error(
      'Invalid Vault transaction hash',
    );
  }

  if (
    !/^\d+$/.test(
      indexText,
    )
  ) {
    throw new Error(
      'Invalid output index',
    );
  }

  const index =
    BigInt(
      indexText,
    );

  const livePromise =
    rpc(
      'get_live_cell',
      [
        {
          tx_hash:
            txHash,

          index:
            `0x${index.toString(16)}`,
        },

        true,
      ],
    );

  const tipPromise =
    rpc(
      'get_tip_header',
    );

  const commitmentPromise =
    getTransactionCommitmentInfo(
      txHash,
    );

  const averagePromise =
    estimateAverageBlockSeconds();

  const [
    live,
    tip,
    commitment,
    averageBlockSeconds,
  ] =
    await Promise.all([
      livePromise,
      tipPromise,
      commitmentPromise,
      averagePromise,
    ]);

  const currentBlock =
    BigInt(
      tip.number,
    );

  const currentTimestamp =
    BigInt(
      tip.timestamp,
    );

  if (
    live.status !==
      'live' ||
    !live.cell
  ) {
    return {
      live:
        false,

      status:
        live.status,

      outPoint:
        `${txHash}:${index}`,

      currentBlock:
        currentBlock.toString(),

      creationBlock:
        commitment
          .blockNumber
          .toString(),

      creationBlockHash:
        commitment
          .blockHash,

      creationBlockTimestamp:
        commitment
          .timestamp
          .toString(),
    };
  }

  const capacity =
    BigInt(
      live
        .cell
        .output
        .capacity,
    );

  const data =
    live
      .cell
      .data
      .content;

  const requiredBlocks =
    decodeLeU64(
      data,
    );

  const creationBlock =
    commitment
      .blockNumber;

  const maturityBlock =
    creationBlock +
    requiredBlocks;

  const mature =
    currentBlock >=
    maturityBlock;

  const blocksRemaining =
    mature
      ? 0n
      : maturityBlock -
        currentBlock;

  const estimatedSecondsRemaining =
    mature
      ? 0
      : Math.ceil(
          Number(
            blocksRemaining,
          ) *
          averageBlockSeconds,
        );

  const estimatedUnlockTimestamp =
    Number(
      currentTimestamp,
    ) +
    (
      estimatedSecondsRemaining *
      1000
    );

  return {
    live:
      true,

    status:
      live.status,

    outPoint:
      `${txHash}:${index}`,

    capacityShannons:
      capacity.toString(),

    capacityCkb:
      shannonsToCkb(
        capacity,
      ),

    data,

    requiredBlocks:
      requiredBlocks
        .toString(),

    creationBlock:
      creationBlock
        .toString(),

    maturityBlock:
      maturityBlock
        .toString(),

    currentBlock:
      currentBlock
        .toString(),

    mature,

    blocksRemaining:
      blocksRemaining
        .toString(),

    estimatedBlockSeconds:
      Number(
        averageBlockSeconds
          .toFixed(
            4,
          ),
      ),

    estimatedSecondsRemaining,

    estimatedDurationRemaining:
      formatEstimatedDuration(
        estimatedSecondsRemaining,
      ),

    estimatedUnlockDate:
      new Date(
        estimatedUnlockTimestamp,
      ).toISOString(),

    creationBlockHash:
      commitment
        .blockHash,

    creationBlockTimestamp:
      commitment
        .timestamp
        .toString(),

    currentBlockTimestamp:
      currentTimestamp
        .toString(),

    lock: {
      args:
        live
          .cell
          .output
          .lock
          .args,

      codeHash:
        live
          .cell
          .output
          .lock
          .code_hash,

      hashType:
        live
          .cell
          .output
          .lock
          .hash_type,
    },
  };
}

async function handleCreate(
  req,
  res,
) {
  if (
    !fs.existsSync(
      CREATE_SCRIPT,
    )
  ) {
    throw new Error(
      'Compiled create_vault.js missing. Run pnpm exec tsc from the repo root.',
    );
  }

  if (
    !/^0x[0-9a-fA-F]{64}$/.test(
      PRIVATE_KEY,
    )
  ) {
    throw new Error(
      'CKB_PRIVATE_KEY is not configured',
    );
  }

  const body =
    await readBody(
      req,
    );

  const amount =
    String(
      body.amount ??
      '',
    ).trim();

  const unlockDate =
    String(
      body.unlockDate ??
      '',
    ).trim();

  const timelock =
    String(
      body.timelock ??
      '',
    ).trim();

  if (
    !/^\d+(\.\d+)?$/.test(
      amount,
    ) ||
    Number(
      amount,
    ) <= 0
  ) {
    throw new Error(
      'Vault amount must be positive',
    );
  }

  const extraEnv = {
    VAULT_AMOUNT:
      amount,
  };

  if (
    unlockDate
  ) {
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        unlockDate,
      )
    ) {
      throw new Error(
        'Unlock date must use YYYY-MM-DD format',
      );
    }

    extraEnv.VAULT_UNLOCK_DATE =
      unlockDate;

    extraEnv.VAULT_TIMELOCK =
      '';
  } else {
    if (
      !/^\d+$/.test(
        timelock,
      ) ||
      BigInt(
        timelock,
      ) <= 0n
    ) {
      throw new Error(
        'Provide unlockDate or a positive relative block duration',
      );
    }

    extraEnv.VAULT_TIMELOCK =
      timelock;

    extraEnv.VAULT_UNLOCK_DATE =
      '';
  }

  const output =
    await runScript(
      CREATE_SCRIPT,
      extraEnv,
    );

  json(
    res,
    200,
    {
      ...output,

      transactionHash:
        capture(
          output.stdout,
          'Transaction hash',
        ),

      vaultCell:
        capture(
          output.stdout,
          'Vault Cell',
        ),

      vaultAmount:
        capture(
          output.stdout,
          'Vault amount',
        ),

      requiredBlocks:
        capture(
          output.stdout,
          'Required relative blocks',
        ),

      vaultData:
        capture(
          output.stdout,
          'Vault data',
        ),

      requestedUnlockDate:
        capture(
          output.stdout,
          'Requested unlock date',
        ),

      estimatedBlockInterval:
        capture(
          output.stdout,
          'Estimated block interval',
        ),
    },
  );
}

async function handleWithdraw(
  req,
  res,
) {
  if (
    !fs.existsSync(
      WITHDRAW_SCRIPT,
    )
  ) {
    throw new Error(
      'Compiled withdraw_vault.js missing. Run pnpm exec tsc from the repo root.',
    );
  }

  if (
    !/^0x[0-9a-fA-F]{64}$/.test(
      PRIVATE_KEY,
    )
  ) {
    throw new Error(
      'CKB_PRIVATE_KEY is not configured',
    );
  }

  const body =
    await readBody(
      req,
    );

  const txHash =
    String(
      body.txHash ??
      '',
    ).trim();

  const index =
    String(
      body.index ??
      '0',
    ).trim();

  if (
    !/^0x[0-9a-fA-F]{64}$/.test(
      txHash,
    )
  ) {
    throw new Error(
      'Invalid Vault transaction hash',
    );
  }

  if (
    !/^\d+$/.test(
      index,
    )
  ) {
    throw new Error(
      'Invalid output index',
    );
  }

  const output =
    await runScript(
      WITHDRAW_SCRIPT,
      {
        VAULT_TX_HASH:
          txHash,

        VAULT_INDEX:
          index,
      },
    );

  json(
    res,
    200,
    {
      ...output,

      transactionHash:
        capture(
          output.stdout,
          'Transaction hash',
        ),

      newOutputCell:
        capture(
          output.stdout,
          'New output Cell',
        ),

      returnedCapacity:
        capture(
          output.stdout,
          'Returned capacity',
        ),

      requiredBlocks:
        capture(
          output.stdout,
          'Required relative blocks',
        ),

      relativeSince:
        capture(
          output.stdout,
          'Relative since',
        ),
    },
  );
}

const server =
  http.createServer(
    async (
      req,
      res,
    ) => {
      try {
        const url =
          new URL(
            req.url ??
              '/',

            `http://${req.headers.host ?? 'localhost'}`,
          );

        if (
          req.method ===
            'GET' &&
          url.pathname ===
            '/'
        ) {
          const html =
            fs.readFileSync(
              INDEX_HTML,
            );

          res.writeHead(
            200,
            {
              'content-type':
                'text/html; charset=utf-8',

              'cache-control':
                'no-store',
            },
          );

          res.end(
            html,
          );

          return;
        }

        if (
          req.method ===
            'GET' &&
          url.pathname ===
            '/api/status'
        ) {
          json(
            res,
            200,
            await status(),
          );

          return;
        }

        if (
          req.method ===
            'GET' &&
          url.pathname ===
            '/api/vault'
        ) {
          const txHash =
            url.searchParams.get(
              'txHash',
            ) ??
            '';

          const index =
            url.searchParams.get(
              'index',
            ) ??
            '0';

          json(
            res,
            200,
            await inspectVault(
              txHash,
              index,
            ),
          );

          return;
        }

        if (
          req.method ===
            'POST' &&
          url.pathname ===
            '/api/create'
        ) {
          await handleCreate(
            req,
            res,
          );

          return;
        }

        if (
          req.method ===
            'POST' &&
          url.pathname ===
            '/api/withdraw'
        ) {
          await handleWithdraw(
            req,
            res,
          );

          return;
        }

        json(
          res,
          404,
          {
            error:
              'Not found',
          },
        );
      } catch (
        error
      ) {
        json(
          res,
          500,
          {
            error:
              error instanceof Error
                ? error.message
                : String(
                    error,
                  ),
          },
        );
      }
    },
  );

server.listen(
  PORT,
  '127.0.0.1',
  () => {
    console.log(
      `CKB-Vault V1 UI: http://127.0.0.1:${PORT}`,
    );

    console.log(
      `Repo root: ${ROOT}`,
    );

    console.log(
      `Network: ${NETWORK}`,
    );

    console.log(
      `RPC: ${RPC_URL}`,
    );

    console.log(
      `Fallback RPC: ${RPC_FALLBACK}`,
    );
  },
);