import { createClient } from 'genlayer-js';
import {
  ExecutionResult,
  TransactionStatus,
  type CalldataEncodable,
  type GenLayerTransaction,
  type Hash,
} from 'genlayer-js/types';
import { chain, contractAddress } from './config';
import { connectWallet, ensureNetwork, getProvider } from './wallet';
import type { Market, Page, Side } from './types';

/**
 * The only place this app talks to the chain.
 *
 * Reads use a client with no account: the market registry is public and
 * browsing it must never prompt a wallet. Writes build a client bound to the
 * *address* of the connected account, which makes MetaMask the signer — the
 * SDK also accepts a full account object and would then sign itself, which
 * would mean holding a key in the browser.
 */

const readClient = createClient({ chain });

/** Reads that return a JSON string get parsed. Reads that return a value pass through. */
async function readJson<T>(functionName: string, args: CalldataEncodable[] = []): Promise<T> {
  const raw = await readClient.readContract({ address: contractAddress, functionName, args });
  if (typeof raw === 'string') return JSON.parse(raw) as T;
  return raw as T;
}

/** Reads whose return is a bare wei string (get_balance / get_stake) — never JSON.parse these. */
async function readString(functionName: string, args: CalldataEncodable[] = []): Promise<string> {
  const raw = await readClient.readContract({ address: contractAddress, functionName, args });
  return typeof raw === 'string' ? raw : String(raw ?? '0');
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export function listMarkets(start = 0, limit = 50): Promise<Page<Market>> {
  return readJson('list_markets', [start, limit]);
}

export async function getMarket(marketId: string): Promise<Market | null> {
  const raw = await readString('get_market', [marketId]);
  if (!raw) return null;
  return JSON.parse(raw) as Market;
}

export function getMarketCount(): Promise<number> {
  return readJson('get_market_count');
}

export function getTotalLocked(): Promise<number> {
  return readJson('get_total_locked');
}

/** Caller's claimable balance, in wei (bare string). */
export function getBalance(wallet: string): Promise<string> {
  return readString('get_balance', [wallet]);
}

/** Caller's stake on one side of one market, in wei (bare string). */
export function getStake(marketId: string, side: Side, wallet: string): Promise<string> {
  return readString('get_stake', [marketId, side, wallet]);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type WritePhase =
  | 'validating'
  | 'awaiting-signature'
  | 'submitted'
  | 'awaiting-consensus'
  | 'finalized';

export interface WriteProgress {
  phase: WritePhase;
  hash?: `0x${string}`;
  /** True for settle(): a non-deterministic consensus write that is slow by design. */
  nondet?: boolean;
}

interface WriteOptions {
  functionName: string;
  args: CalldataEncodable[];
  value?: bigint;
  nondet?: boolean;
  onProgress?: (progress: WriteProgress) => void;
}

/**
 * Finality is not success.
 *
 * A transaction can finalize having reverted inside the GenVM, and a naive
 * client reports that as "done" while the state never changed. The receipt is
 * checked for an actual return before this app claims anything happened. When
 * it reverted, the leader receipt's `error` carries the `[EXPECTED] CODE`
 * marker, which `explainError` turns into human copy.
 */
function assertExecuted(receipt: GenLayerTransaction): void {
  // The revert signal surfaces in two shapes depending on the SDK build — the
  // typed enum and the raw leader receipt — so both are checked.
  const execution = receipt.txExecutionResultName;
  const leader = receipt.consensus_data?.leader_receipt?.[0] as
    | { error?: unknown; execution_result?: string; genvm_result?: { stderr?: string } }
    | undefined;
  const reverted =
    execution === ExecutionResult.FINISHED_WITH_ERROR || leader?.execution_result === 'ERROR';
  if (reverted) {
    const raw = (typeof leader?.error === 'string' && leader.error) || leader?.genvm_result?.stderr || '';
    const marker = String(raw).match(/\[EXPECTED\]\s+[A-Z_]+/);
    const detail = marker ? `: ${marker[0]}` : '';
    throw new Error(`The transaction reverted inside the contract${detail}`);
  }
}

/**
 * Send one write and wait for it to finalize.
 *
 * The phase callback exists because a non-deterministic transaction is slow in
 * a way users have no prior experience of: every validator independently
 * renders the evidence page and runs a model over it. A spinner with no
 * explanation reads as a hang, so each phase is named as it happens.
 */
export async function write({
  functionName,
  args,
  value,
  nondet,
  onProgress,
}: WriteOptions): Promise<`0x${string}`> {
  onProgress?.({ phase: 'validating', nondet });

  const account = await connectWallet();
  await ensureNetwork(getProvider());

  const client = createClient({ chain, account });

  onProgress?.({ phase: 'awaiting-signature', nondet });
  const hash = (await client.writeContract({
    address: contractAddress,
    functionName,
    args,
    value: value ?? 0n,
  })) as Hash;

  onProgress?.({ phase: 'submitted', hash, nondet });
  onProgress?.({ phase: 'awaiting-consensus', hash, nondet });

  // Studionet can take minutes to FINALIZE; ACCEPTED already carries the
  // committed state and the leader's result, which is what the UI reads back.
  const receipt = (await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    interval: 4000,
    retries: 150,
  })) as GenLayerTransaction;

  assertExecuted(receipt);
  onProgress?.({ phase: 'finalized', hash, nondet });
  return hash;
}

const GEN = 10n ** 18n;
/** GEN per wei, exposed for callers that want the unit. */
export { GEN };

export function openMarket(params: {
  statement: string;
  evidenceUrl: string;
  corroboratingUrl: string;
  resolveNotBefore: number; // epoch seconds
  onProgress?: (progress: WriteProgress) => void;
}) {
  return write({
    functionName: 'open_market',
    args: [
      params.statement,
      params.evidenceUrl,
      params.corroboratingUrl,
      params.resolveNotBefore,
    ],
    onProgress: params.onProgress,
  });
}

export function stake(params: {
  marketId: string;
  side: Side;
  valueWei: bigint;
  onProgress?: (progress: WriteProgress) => void;
}) {
  return write({
    functionName: 'stake',
    args: [params.marketId, params.side],
    value: params.valueWei,
    onProgress: params.onProgress,
  });
}

export function setEvidence(params: {
  marketId: string;
  evidenceUrl: string;
  corroboratingUrl: string;
  onProgress?: (progress: WriteProgress) => void;
}) {
  return write({
    functionName: 'set_evidence',
    args: [params.marketId, params.evidenceUrl, params.corroboratingUrl],
    onProgress: params.onProgress,
  });
}

export function settle(params: {
  marketId: string;
  onProgress?: (progress: WriteProgress) => void;
}) {
  return write({
    functionName: 'settle',
    args: [params.marketId],
    nondet: true,
    onProgress: params.onProgress,
  });
}

export function withdraw(params: { onProgress?: (progress: WriteProgress) => void }) {
  return write({ functionName: 'withdraw', args: [], onProgress: params.onProgress });
}

/**
 * Turn a contract error into something a human can act on.
 *
 * The contract raises `[EXPECTED] CODE` markers precisely so the UI does not
 * have to guess at intent from a stack trace.
 */
export function explainError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  const marker = message.match(/\[EXPECTED\]\s+([A-Z_]+)/);
  if (marker) {
    const code = marker[1];
    return ERROR_COPY[code] ?? `The contract rejected this: ${code}.`;
  }
  if (/insufficient funds/i.test(message)) {
    return 'This account has no GEN on Studionet. Fund it from the Studio Accounts panel first.';
  }
  if (/chain|network|'from'/i.test(message)) {
    return 'Your wallet is on a different network. Approve the switch to GenLayer Studionet and try again.';
  }
  if (/user rejected|denied/i.test(message)) return 'You cancelled the signature request.';
  return message;
}

const ERROR_COPY: Record<string, string> = {
  STATEMENT_TOO_SHORT: 'Describe a concrete, checkable claim — at least 16 characters.',
  INVALID_URL: 'Evidence links must be public HTTPS pages (no localhost or private hosts).',
  DEADLINE_IN_PAST: 'The resolve time must be in the future.',
  DEADLINE_TOO_FAR: 'The deadline can be at most one year out.',
  ZERO_STAKE: 'Attach some GEN to take a position.',
  INVALID_SIDE: 'Pick a side — YES or NO.',
  MARKET_NOT_FOUND: 'No market with that id exists.',
  MARKET_CLOSED: 'This market has already been resolved.',
  STAKING_CLOSED: 'The deadline has been reached — staking is closed and the market can be settled.',
  NOT_PROPOSER: 'Only the proposer who opened this market can set its evidence.',
  EVIDENCE_FROZEN: 'The deadline has been reached — the evidence URLs are now frozen.',
  ALREADY_SETTLED: 'This market has already been settled.',
  TOO_EARLY: 'The deadline has not been reached yet, so this cannot be settled.',
  SIDE_FULL: 'This side already has the maximum number of distinct stakers.',
  NOTHING_TO_WITHDRAW: 'You have no claimable balance to withdraw.',
  BAD_LLM_JSON: 'The validators could not produce a well-formed verdict. Try settling again.',
};
