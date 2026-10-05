#!/usr/bin/env node
/**
 * Seed demonstration markets on Studionet so a reviewer sees real, settled
 * outcomes rather than an empty page.
 *
 * Keys from the environment only (never disk, never logged):
 *   source ~/.genlayer/env.sh    # exports GENLAYER_PRIVATE_KEY (+ _2)
 *   node scripts/seed.mjs all
 *
 * GENLAYER_PRIVATE_KEY   = proposer + one side's staker.
 * GENLAYER_PRIVATE_KEY_2 = the other side's staker (must differ).
 *
 * Each market is opened with a ~75s deadline, both sides are staked, then the
 * script waits for the deadline and settles it from the live web by consensus.
 *
 *   node scripts/seed.mjs yes    # a claim the evidence confirms  -> RESOLVED_YES
 *   node scripts/seed.mjs no     # a claim the evidence refutes   -> RESOLVED_NO
 *   node scripts/seed.mjs all
 */
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../frontend/package.json', import.meta.url));
let createAccount, createClient, studionet, TransactionStatus;
try {
  ({ createAccount, createClient } = await import(pathToFileURL(require.resolve('genlayer-js')).href));
  ({ studionet } = await import(pathToFileURL(require.resolve('genlayer-js/chains')).href));
  ({ TransactionStatus } = await import(pathToFileURL(require.resolve('genlayer-js/types')).href));
} catch (e) {
  console.error('Could not load genlayer-js. Run `npm ci` in frontend/ first.');
  console.error(e?.message ?? e);
  process.exit(4);
}

const GEN = 10n ** 18n;
const CONTRACT =
  process.env.DEADLINESTAKE_ADDRESS || '0x77AB5BeEd7B77Df019D0BC5c33A303D126A7221d';
const LEAD_SECONDS = 75;

function accountFrom(name) {
  const raw = process.env[name];
  if (!raw) fail(`${name} is not set. Run: source ~/.genlayer/env.sh`);
  const key = raw.trim().startsWith('0x') ? raw.trim() : `0x${raw.trim()}`;
  if (!/^0x[0-9a-fA-F]{64}$/.test(key)) fail(`${name} is not a 32-byte hex key.`);
  return createAccount(key);
}
function fail(m) { console.error(`\n${m}\n`); process.exit(2); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const reader = createClient({ chain: studionet });
async function readJson(fn, args = []) {
  const raw = await reader.readContract({ address: CONTRACT, functionName: fn, args });
  return typeof raw === 'string' ? (raw ? JSON.parse(raw) : null) : raw;
}
async function send(account, fn, args, value = 0n) {
  const client = createClient({ chain: studionet, account });
  process.stdout.write(`  -> ${fn} ... `);
  const hash = await client.writeContract({ address: CONTRACT, functionName: fn, args, value });
  // Studionet is slow to FINALIZE; ACCEPTED already carries the leader result
  // and committed state, which is all the seeder needs.
  const receipt = await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 4000,
    retries: 120,
  });
  const leader = receipt?.consensus_data?.leader_receipt?.[0];
  const reverted =
    receipt?.txExecutionResultName === 'FINISHED_WITH_ERROR' ||
    leader?.execution_result === 'ERROR';
  if (reverted) {
    console.log('reverted');
    const stderr = leader?.genvm_result?.stderr || leader?.error || '';
    if (stderr) console.error('  ' + String(stderr).split('\n').slice(-4).join('\n  '));
    process.exit(1);
  }
  console.log('ok');
  return receipt;
}

const SCENARIOS = {
  yes: {
    statement:
      'Bitcoin has a fixed maximum supply capped at 21 million coins, as stated ' +
      'on the public reference page.',
    evidence_url: 'https://en.wikipedia.org/wiki/Bitcoin',
    corroborating_url: 'https://en.wikipedia.org/wiki/Bitcoin',
    yesStake: (GEN * 3n) / 100n,
    noStake: (GEN * 2n) / 100n,
  },
  no: {
    statement:
      'According to the public reference page, the planet Earth is flat and not ' +
      'an oblate spheroid.',
    evidence_url: 'https://en.wikipedia.org/wiki/Earth',
    corroborating_url: '',
    yesStake: (GEN * 2n) / 100n,
    noStake: (GEN * 3n) / 100n,
  },
};

async function run(name) {
  const s = SCENARIOS[name];
  if (!s) fail(`Unknown scenario ${name}`);
  const proposer = accountFrom('GENLAYER_PRIVATE_KEY');
  const other = accountFrom('GENLAYER_PRIVATE_KEY_2');
  if (proposer.address.toLowerCase() === other.address.toLowerCase())
    fail('Proposer and second staker must be different accounts.');

  const deadline = Math.floor(Date.now() / 1000) + LEAD_SECONDS;
  console.log(`\n[${name}] proposer=${proposer.address} other=${other.address} deadline=+${LEAD_SECONDS}s`);
  await send(proposer, 'open_market', [s.statement, s.evidence_url, s.corroborating_url, deadline]);

  const count = Number(await readJson('get_market_count'));
  const marketId = String(count);
  console.log(`Opened market #${marketId}. Staking both sides…`);
  await send(proposer, 'stake', [marketId, 'YES'], s.yesStake);
  await send(other, 'stake', [marketId, 'NO'], s.noStake);

  const waitMs = (deadline - Math.floor(Date.now() / 1000) + 5) * 1000;
  console.log(`Waiting ${Math.ceil(waitMs / 1000)}s for the deadline…`);
  await sleep(Math.max(waitMs, 0));

  console.log('Settling — validators each render the evidence and run a model…');
  await send(proposer, 'settle', [marketId]);

  const rec = await readJson('get_market', [marketId]);
  console.log(`\nMarket #${marketId} => status=${rec.status} outcome=${rec.outcome} confidence=${rec.confidence}%`);
  console.log(`reason: ${rec.reason}`);
}

const cmd = process.argv[2] || 'all';
(async () => {
  if (cmd === 'all') { await run('yes'); await run('no'); }
  else await run(cmd);
})().catch((e) => { console.error(`\n${e?.message ?? e}\n`); process.exit(1); });
