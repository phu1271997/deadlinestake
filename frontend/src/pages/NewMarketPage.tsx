import { useMemo, useState } from 'react';
import { openMarket, explainError, type WriteProgress } from '../lib/client';
import { navigate } from '../hooks/useHashRoute';
import { ConsensusProgress } from '../components/ConsensusProgress';
import type { WalletState } from '../hooks/useWallet';

function defaultDeadline(): string {
  // Two weeks out, rounded to the hour, formatted for datetime-local.
  const d = new Date(Date.now() + 14 * 86400 * 1000);
  d.setMinutes(0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

const HTTPS_RE = /^https:\/\/[^\s]+$/i;

export function NewMarketPage({ wallet }: { wallet: WalletState }) {
  const [statement, setStatement] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [corroboratingUrl, setCorroboratingUrl] = useState('');
  const [deadline, setDeadline] = useState<string>(defaultDeadline());
  const [progress, setProgress] = useState<WriteProgress | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const deadlineEpoch = useMemo(() => {
    if (!deadline) return null;
    const ms = new Date(deadline).getTime();
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
  }, [deadline]);

  const now = Math.floor(Date.now() / 1000);
  const oneYear = 365 * 24 * 60 * 60;

  const problems: string[] = [];
  if (statement.trim().length < 16) problems.push('Statement must be at least 16 characters.');
  if (!HTTPS_RE.test(evidenceUrl.trim())) problems.push('Evidence URL must be a public https link.');
  if (corroboratingUrl.trim() && !HTTPS_RE.test(corroboratingUrl.trim()))
    problems.push('Corroborating URL must be a public https link (or left blank).');
  if (deadlineEpoch === null) problems.push('Pick a valid deadline.');
  else if (deadlineEpoch <= now) problems.push('The deadline must be in the future.');
  else if (deadlineEpoch - now > oneYear) problems.push('The deadline can be at most one year out.');

  const canSubmit = problems.length === 0 && !busy;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || deadlineEpoch === null) return;
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
      await openMarket({
        statement: statement.trim(),
        evidenceUrl: evidenceUrl.trim(),
        corroboratingUrl: corroboratingUrl.trim(),
        resolveNotBefore: deadlineEpoch,
        onProgress: setProgress,
      });
      wallet.refreshBalance();
      // Land back on the market list where the new market appears first.
      navigate('/');
    } catch (err) {
      setError(explainError(err));
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-narrow">
      <button className="back-link" onClick={() => navigate('/')}>
        ← All markets
      </button>
      <h1 className="page-title">Open a market</h1>
      <p className="page-lede">
        Frame a claim that a stranger could check from a public web page at the deadline. The more
        concrete the statement and the more direct the evidence link, the cleaner the settlement.
      </p>

      <form className="form card" onSubmit={submit}>
        <label className="field">
          <span className="field-label">Claim</span>
          <textarea
            className="input"
            rows={3}
            value={statement}
            maxLength={600}
            placeholder="e.g. Project Foo ships v1.0 with a public demo video by the deadline, evidenced on its releases page."
            onChange={(e) => setStatement(e.target.value)}
          />
          <span className="field-hint">
            {statement.trim().length}/600 — at least 16 characters. Write it so YES / NO is
            unambiguous from the evidence.
          </span>
        </label>

        <label className="field">
          <span className="field-label">Evidence URL</span>
          <input
            className="input"
            type="url"
            value={evidenceUrl}
            placeholder="https://github.com/org/foo/releases"
            onChange={(e) => setEvidenceUrl(e.target.value)}
          />
          <span className="field-hint">
            The page validators will render and read at settlement. Must be public https.
          </span>
        </label>

        <label className="field">
          <span className="field-label">
            Corroborating URL <span className="muted">(optional)</span>
          </span>
          <input
            className="input"
            type="url"
            value={corroboratingUrl}
            placeholder="https://foo.dev/blog/v1-launch"
            onChange={(e) => setCorroboratingUrl(e.target.value)}
          />
          <span className="field-hint">A second page the validators may cross-check.</span>
        </label>

        <label className="field">
          <span className="field-label">Deadline</span>
          <input
            className="input"
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
          <span className="field-hint">
            Staking closes at this moment; the market can be settled any time after it. At most one
            year out.
          </span>
        </label>

        {error && <div className="alert alert-error">{error}</div>}

        {progress ? (
          <ConsensusProgress progress={progress} />
        ) : (
          <>
            {statement.length > 0 && problems.length > 0 && (
              <ul className="problems">
                {problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
            <button className="btn btn-primary btn-lg" type="submit" disabled={!canSubmit}>
              {busy ? 'Opening…' : wallet.account ? 'Open market' : 'Connect wallet & open'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
