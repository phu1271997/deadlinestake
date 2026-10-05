import type { Market } from '../lib/types';
import { countdown, formatGen, poolSplit } from '../lib/format';
import { navigate } from '../hooks/useHashRoute';
import { SplitBar } from './SplitBar';
import { StatusBadge } from './StatusBadge';

function truncate(text: string, max = 160): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function MarketCard({ market }: { market: Market }) {
  const { pool } = poolSplit(market.yes_total, market.no_total);
  const cd = countdown(market.resolve_not_before);
  const open = market.status === 'OPEN';
  const deadlinePassed = open && cd.passed;

  return (
    <button
      className="market-card"
      onClick={() => navigate(`/market/${market.id}`)}
      aria-label={`Market ${market.id}: ${market.statement}`}
    >
      <div className="market-card-top">
        <StatusBadge status={market.status} />
        <span className="market-id mono">#{market.id}</span>
      </div>

      <p className="market-statement">{truncate(market.statement)}</p>

      <SplitBar yesWei={market.yes_total} noWei={market.no_total} compact />

      <div className="market-card-foot">
        <span className="pool-total">
          {formatGen(pool)} <span className="muted">GEN pool</span>
        </span>
        {open ? (
          deadlinePassed ? (
            <span className="deadline deadline-hot">deadline passed — settle now</span>
          ) : (
            <span className="deadline">{cd.label}</span>
          )
        ) : (
          <span className="deadline muted">settled</span>
        )}
      </div>
    </button>
  );
}
