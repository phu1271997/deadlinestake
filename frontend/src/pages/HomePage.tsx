import { useEffect, useState } from 'react';
import { listMarkets, getTotalLocked } from '../lib/client';
import { explainError } from '../lib/client';
import { formatGen } from '../lib/format';
import type { Market } from '../lib/types';
import { navigate } from '../hooks/useHashRoute';
import { MarketCard } from '../components/MarketCard';

const STEPS = [
  {
    n: '1',
    title: 'Open a market',
    body: 'State a concrete, publicly verifiable claim with a deadline and a link to where the evidence will live.',
  },
  {
    n: '2',
    title: 'Back a side',
    body: 'Anyone stakes GEN on YES (it comes true by the deadline) or NO. The pool builds on both sides.',
  },
  {
    n: '3',
    title: 'Anyone settles',
    body: 'After the deadline, anyone triggers settlement. Validators each render the evidence page on-chain and read it with a model.',
  },
  {
    n: '4',
    title: 'The pool pays out',
    body: 'The winning side splits the whole pool pro-rata. If the evidence is genuinely ambiguous, every stake is refunded.',
  },
];

type Filter = 'all' | 'open' | 'settleable' | 'resolved';

export function HomePage() {
  const [markets, setMarkets] = useState<Market[] | null>(null);
  const [totalLocked, setTotalLocked] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    let live = true;
    listMarkets(0, 50)
      .then((page) => {
        if (live) setMarkets([...page.items].reverse());
      })
      .catch((err) => live && setError(explainError(err)));
    getTotalLocked()
      .then((v) => live && setTotalLocked(v))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const now = Math.floor(Date.now() / 1000);
  const visible = (markets ?? []).filter((m) => {
    if (filter === 'all') return true;
    if (filter === 'open') return m.status === 'OPEN';
    if (filter === 'settleable')
      return m.status === 'OPEN' && Number(m.resolve_not_before) <= now;
    if (filter === 'resolved') return m.status !== 'OPEN';
    return true;
  });

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">Self-resolving commitment markets</p>
          <h1>
            Bet on whether it actually <span className="accent">ships</span>.
          </h1>
          <p className="hero-sub">
            Open a market around a concrete public claim with a deadline. Stake GEN on YES or NO.
            After the deadline, GenLayer validators render the evidence page on-chain, read it with
            an LLM, and settle the market themselves — no human oracle, no trusted reporter.
          </p>
          <div className="hero-actions">
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/new')}>
              Open a market
            </button>
            <a
              className="btn btn-ghost btn-lg"
              href="#markets"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('markets')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              Browse markets
            </a>
          </div>
          {totalLocked !== null && totalLocked > 0 && (
            <p className="hero-stat">
              <strong>{formatGen(BigInt(totalLocked))} GEN</strong> staked across live markets
            </p>
          )}
        </div>
      </section>

      <section className="how">
        <h2 className="section-title">How it works</h2>
        <div className="steps">
          {STEPS.map((s) => (
            <div className="step" key={s.n}>
              <span className="step-n">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="markets" id="markets">
        <div className="markets-head">
          <h2 className="section-title">Markets</h2>
          <div className="filters" role="tablist" aria-label="Filter markets">
            {(['all', 'open', 'settleable', 'resolved'] as Filter[]).map((f) => (
              <button
                key={f}
                className={`filter ${filter === f ? 'filter-active' : ''}`}
                onClick={() => setFilter(f)}
                role="tab"
                aria-selected={filter === f}
              >
                {f === 'settleable' ? 'ready to settle' : f}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {markets === null && !error && <div className="loading">Loading markets…</div>}

        {markets !== null && visible.length === 0 && !error && (
          <div className="empty">
            <p>No markets here yet.</p>
            <button className="btn btn-primary" onClick={() => navigate('/new')}>
              Open the first one
            </button>
          </div>
        )}

        <div className="market-grid">
          {visible.map((m) => (
            <MarketCard key={m.id} market={m} />
          ))}
        </div>
      </section>
    </div>
  );
}
