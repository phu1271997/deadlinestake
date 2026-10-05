import { useCallback, useEffect, useState } from 'react';
import {
  explainError,
  getBalance,
  getMarket,
  getStake,
  setEvidence,
  settle,
  stake,
  withdraw,
  type WriteProgress,
} from '../lib/client';
import { parseGen } from '../lib/format';
import {
  countdown,
  formatEpoch,
  formatGen,
  impliedOdds,
  poolSplit,
  shortAddress,
} from '../lib/format';
import { explorerAddress } from '../lib/config';
import type { Market, Side } from '../lib/types';
import { navigate } from '../hooks/useHashRoute';
import { ConsensusProgress } from '../components/ConsensusProgress';
import { SplitBar } from '../components/SplitBar';
import { OutcomeBadge, StatusBadge } from '../components/StatusBadge';
import type { WalletState } from '../hooks/useWallet';

interface MyPosition {
  yes: string;
  no: string;
  claimable: string;
}

export function MarketDetailPage({ id, wallet }: { id: string; wallet: WalletState }) {
  const [market, setMarket] = useState<Market | null | undefined>(undefined);
  const [error, setError] = useState('');
  const [position, setPosition] = useState<MyPosition | null>(null);

  const account = wallet.account;

  const loadMarket = useCallback(async () => {
    try {
      const m = await getMarket(id);
      setMarket(m);
    } catch (err) {
      setError(explainError(err));
      setMarket(null);
    }
  }, [id]);

  const loadPosition = useCallback(async () => {
    if (!account) {
      setPosition(null);
      return;
    }
    try {
      const [yes, no, claimable] = await Promise.all([
        getStake(id, 'YES', account),
        getStake(id, 'NO', account),
        getBalance(account),
      ]);
      setPosition({ yes, no, claimable });
    } catch {
      /* non-fatal */
    }
  }, [id, account]);

  useEffect(() => {
    loadMarket();
  }, [loadMarket]);

  useEffect(() => {
    loadPosition();
  }, [loadPosition]);

  if (market === undefined) return <div className="page loading">Loading market…</div>;
  if (market === null)
    return (
      <div className="page page-narrow">
        <button className="back-link" onClick={() => navigate('/')}>
          ← All markets
        </button>
        <div className="alert alert-error">{error || `No market #${id} exists.`}</div>
      </div>
    );

  const cd = countdown(market.resolve_not_before);
  const isOpen = market.status === 'OPEN';
  const beforeDeadline = isOpen && !cd.passed;
  const settleable = isOpen && cd.passed;
  const resolved = !isOpen;
  const isProposer =
    !!account && account.toLowerCase() === market.proposer.toLowerCase();

  const { yes, no, pool, yesPct, noPct } = poolSplit(market.yes_total, market.no_total);
  const yesOdds = impliedOdds(market.yes_total, pool);
  const noOdds = impliedOdds(market.no_total, pool);

  const refresh = () => {
    loadMarket();
    loadPosition();
    wallet.refreshBalance();
  };

  return (
    <div className="page page-narrow">
      <button className="back-link" onClick={() => navigate('/')}>
        ← All markets
      </button>

      <div className="detail-head">
        <div className="detail-head-badges">
          <StatusBadge status={market.status} />
          <span className="market-id mono">#{market.id}</span>
        </div>
        <h1 className="detail-statement">{market.statement}</h1>
        <div className="detail-meta">
          <span>
            Proposer{' '}
            <a
              className="mono"
              href={explorerAddress(market.proposer) ?? '#'}
              target="_blank"
              rel="noreferrer noopener"
            >
              {shortAddress(market.proposer)}
            </a>
          </span>
          <span className="dot-sep">·</span>
          <span>Opened {formatEpoch(market.opened_at)}</span>
        </div>
      </div>

      <div className="card detail-evidence">
        <h2 className="card-title">Evidence</h2>
        <div className="evidence-row">
          <span className="evidence-label">Primary</span>
          <a href={market.evidence_url} target="_blank" rel="noreferrer noopener" className="evidence-link">
            {market.evidence_url}
          </a>
        </div>
        {market.corroborating_url && (
          <div className="evidence-row">
            <span className="evidence-label">Corroborating</span>
            <a
              href={market.corroborating_url}
              target="_blank"
              rel="noreferrer noopener"
              className="evidence-link"
            >
              {market.corroborating_url}
            </a>
          </div>
        )}
        <div className="evidence-row">
          <span className="evidence-label">Deadline</span>
          <span>
            {formatEpoch(market.resolve_not_before)}{' '}
            <span className={settleable ? 'deadline deadline-hot' : 'deadline'}>
              ({settleable ? 'deadline passed — settle now' : cd.label})
            </span>
          </span>
        </div>
      </div>

      <div className="card">
        <h2 className="card-title">The pool</h2>
        <SplitBar yesWei={market.yes_total} noWei={market.no_total} />
        <div className="odds-row">
          <div className="odds odds-yes">
            <span className="odds-side">YES</span>
            <span className="odds-total">{formatGen(yes)} GEN</span>
            <span className="odds-meta">
              {market.yes_stakers.length} backer{market.yes_stakers.length === 1 ? '' : 's'}
              {yesOdds && ` · ${yesOdds} if YES wins`}
            </span>
          </div>
          <div className="odds odds-no">
            <span className="odds-side">NO</span>
            <span className="odds-total">{formatGen(no)} GEN</span>
            <span className="odds-meta">
              {market.no_stakers.length} backer{market.no_stakers.length === 1 ? '' : 's'}
              {noOdds && ` · ${noOdds} if NO wins`}
            </span>
          </div>
        </div>
        <p className="pool-note muted">
          Total pool {formatGen(pool)} GEN · implied YES {yesPct.toFixed(0)}% / NO {noPct.toFixed(0)}%
        </p>
      </div>

      {resolved && <VerdictPanel market={market} position={position} />}

      {beforeDeadline && (
        <StakePanel marketId={market.id} wallet={wallet} onDone={refresh} />
      )}

      {beforeDeadline && isProposer && (
        <SetEvidencePanel market={market} onDone={refresh} />
      )}

      {settleable && <SettlePanel marketId={market.id} onDone={refresh} />}

      <WithdrawPanel wallet={wallet} claimable={position?.claimable ?? '0'} onDone={refresh} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

function VerdictPanel({ market, position }: { market: Market; position: MyPosition | null }) {
  const refunded = market.status === 'REFUNDED';
  const won =
    (market.status === 'RESOLVED_YES' && position && BigInt(position.yes || '0') > 0n) ||
    (market.status === 'RESOLVED_NO' && position && BigInt(position.no || '0') > 0n);

  const myStake =
    position && (BigInt(position.yes || '0') > 0n || BigInt(position.no || '0') > 0n)
      ? BigInt(position.yes || '0') + BigInt(position.no || '0')
      : null;

  return (
    <div className={`card verdict ${refunded ? 'verdict-refunded' : won ? 'verdict-win' : ''}`}>
      <div className="verdict-top">
        <h2 className="card-title">Verdict</h2>
        <OutcomeBadge outcome={market.outcome} />
      </div>

      <div className="verdict-confidence">
        <div className="confidence-bar">
          <div className="confidence-fill" style={{ width: `${Math.max(0, Math.min(100, market.confidence))}%` }} />
        </div>
        <span className="confidence-label">{market.confidence}% confidence</span>
      </div>

      <blockquote className="verdict-reason">
        <span className="verdict-reason-tag">Validators' reasoning</span>
        {market.reason || 'No reason was recorded.'}
      </blockquote>

      <div className="verdict-stats">
        <div className="stat">
          <span className="stat-label">Settled</span>
          <span className="stat-value">{formatEpoch(market.settled_at)}</span>
        </div>
        <div className="stat">
          <span className="stat-label">Paid out</span>
          <span className="stat-value">{formatGen(market.paid_total)} GEN</span>
        </div>
        {myStake !== null && (
          <div className="stat">
            <span className="stat-label">Your stake</span>
            <span className="stat-value">{formatGen(myStake)} GEN</span>
          </div>
        )}
      </div>

      <p className="verdict-note muted">
        {refunded
          ? 'The evidence was inconclusive, so every stake was refunded to its backer. Claim yours below.'
          : won
            ? 'You backed the winning side. Your stake plus a pro-rata share of the losing pool is in your claimable balance below.'
            : 'The winning side split the whole pool pro-rata. Winnings are credited to each backer’s claimable balance.'}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stake
// ---------------------------------------------------------------------------

function StakePanel({
  marketId,
  wallet,
  onDone,
}: {
  marketId: string;
  wallet: WalletState;
  onDone: () => void;
}) {
  const [side, setSide] = useState<Side>('YES');
  const [amount, setAmount] = useState('');
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  let valueWei: bigint | null = null;
  let parseError = '';
  if (amount.trim()) {
    try {
      valueWei = parseGen(amount);
      if (valueWei <= 0n) parseError = 'Stake must be greater than zero.';
    } catch (err) {
      parseError = err instanceof Error ? err.message : String(err);
    }
  }

  const canSubmit = !!valueWei && valueWei > 0n && !parseError && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || !valueWei) return;
    setError('');
    setBusy(true);
    try {
      if (!wallet.account) {
        const addr = await wallet.connect();
        if (!addr) {
          setBusy(false);
          return;
        }
      }
      await stake({ marketId, side, valueWei, onProgress: setProgress });
      setAmount('');
      setProgress(null);
      onDone();
    } catch (err) {
      setError(explainError(err));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card stake-panel">
      <h2 className="card-title">Take a position</h2>
      <form onSubmit={submit}>
        <div className="side-toggle" role="radiogroup" aria-label="Pick a side">
          <button
            type="button"
            className={`side-btn side-btn-yes ${side === 'YES' ? 'side-active' : ''}`}
            onClick={() => setSide('YES')}
            role="radio"
            aria-checked={side === 'YES'}
          >
            YES — it comes true
          </button>
          <button
            type="button"
            className={`side-btn side-btn-no ${side === 'NO' ? 'side-active' : ''}`}
            onClick={() => setSide('NO')}
            role="radio"
            aria-checked={side === 'NO'}
          >
            NO — it won't
          </button>
        </div>

        <label className="field">
          <span className="field-label">Amount (GEN)</span>
          <input
            className="input"
            inputMode="decimal"
            value={amount}
            placeholder="1.0"
            onChange={(e) => setAmount(e.target.value)}
          />
          {parseError && <span className="field-hint field-error">{parseError}</span>}
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        {progress ? (
          <ConsensusProgress progress={progress} />
        ) : (
          <button className={`btn btn-lg ${side === 'YES' ? 'btn-yes' : 'btn-no'}`} type="submit" disabled={!canSubmit}>
            {busy
              ? 'Staking…'
              : wallet.account
                ? `Stake ${amount || '…'} GEN on ${side}`
                : `Connect & stake on ${side}`}
          </button>
        )}
      </form>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Set evidence (proposer only)
// ---------------------------------------------------------------------------

function SetEvidencePanel({ market, onDone }: { market: Market; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState(market.evidence_url);
  const [corroboratingUrl, setCorroboratingUrl] = useState(market.corroborating_url);
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await setEvidence({
        marketId: market.id,
        evidenceUrl: evidenceUrl.trim(),
        corroboratingUrl: corroboratingUrl.trim(),
        onProgress: setProgress,
      });
      setProgress(null);
      setOpen(false);
      onDone();
    } catch (err) {
      setError(explainError(err));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card proposer-panel">
      <div className="proposer-head">
        <div>
          <h2 className="card-title">You proposed this market</h2>
          <p className="muted small">You can refine the evidence URLs until the deadline.</p>
        </div>
        {!open && (
          <button className="btn btn-ghost" onClick={() => setOpen(true)}>
            Edit evidence
          </button>
        )}
      </div>

      {open && (
        <form onSubmit={submit} className="form">
          <label className="field">
            <span className="field-label">Evidence URL</span>
            <input
              className="input"
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field-label">
              Corroborating URL <span className="muted">(optional)</span>
            </span>
            <input
              className="input"
              type="url"
              value={corroboratingUrl}
              onChange={(e) => setCorroboratingUrl(e.target.value)}
            />
          </label>

          {error && <div className="alert alert-error">{error}</div>}

          {progress ? (
            <ConsensusProgress progress={progress} />
          ) : (
            <div className="btn-row">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save evidence'}
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Settle
// ---------------------------------------------------------------------------

function SettlePanel({ marketId, onDone }: { marketId: string; onDone: () => void }) {
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function doSettle() {
    setError('');
    setBusy(true);
    try {
      await settle({ marketId, onProgress: setProgress });
      setProgress(null);
      onDone();
    } catch (err) {
      setError(explainError(err));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card settle-panel">
      <h2 className="card-title">Ready to settle</h2>
      <p className="settle-note">
        The deadline has passed. Anyone can now trigger settlement. GenLayer validators will each
        render the evidence page on-chain, read it with a model, and independently decide YES / NO /
        AMBIGUOUS. The pool pays out the moment they agree.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {progress ? (
        <ConsensusProgress progress={progress} />
      ) : (
        <button className="btn btn-primary btn-lg" onClick={doSettle} disabled={busy}>
          {busy ? 'Settling…' : 'Settle this market'}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Withdraw
// ---------------------------------------------------------------------------

function WithdrawPanel({
  wallet,
  claimable,
  onDone,
}: {
  wallet: WalletState;
  claimable: string;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const amount = BigInt(claimable || '0');
  const hasBalance = amount > 0n;

  async function doWithdraw() {
    setError('');
    setBusy(true);
    try {
      if (!wallet.account) {
        const addr = await wallet.connect();
        if (!addr) {
          setBusy(false);
          return;
        }
      }
      await withdraw({ onProgress: setProgress });
      setProgress(null);
      onDone();
    } catch (err) {
      setError(explainError(err));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card withdraw-panel">
      <div className="withdraw-head">
        <div>
          <h2 className="card-title">Your claimable balance</h2>
          <p className="withdraw-amount">
            {formatGen(amount)} <span className="muted">GEN</span>
          </p>
        </div>
        {progress ? null : (
          <button className="btn btn-primary" onClick={doWithdraw} disabled={!hasBalance || busy}>
            {busy ? 'Withdrawing…' : 'Withdraw'}
          </button>
        )}
      </div>
      <p className="muted small">
        Winnings and refunds accrue here across every market you back. Withdraw pulls the whole
        balance to your wallet.
      </p>
      {error && <div className="alert alert-error">{error}</div>}
      {progress && <ConsensusProgress progress={progress} />}
    </div>
  );
}
