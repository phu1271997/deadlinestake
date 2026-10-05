import { formatGen, poolSplit } from '../lib/format';

/**
 * A YES-vs-NO pool split bar. Green YES fills from the left, red NO from the
 * right, with each side's GEN total labelled.
 */
export function SplitBar({
  yesWei,
  noWei,
  compact = false,
}: {
  yesWei: string;
  noWei: string;
  compact?: boolean;
}) {
  const { yes, no, pool, yesPct, noPct } = poolSplit(yesWei, noWei);
  const empty = pool === 0n;

  return (
    <div className={`split ${compact ? 'split-compact' : ''}`}>
      {!compact && (
        <div className="split-labels">
          <span className="split-yes-label">
            YES · {formatGen(yes)} <span className="muted">GEN</span>
          </span>
          <span className="split-no-label">
            <span className="muted">GEN</span> {formatGen(no)} · NO
          </span>
        </div>
      )}
      <div className="split-track" role="img" aria-label={`YES ${yesPct.toFixed(0)} percent, NO ${noPct.toFixed(0)} percent`}>
        {empty ? (
          <div className="split-empty">No stakes yet</div>
        ) : (
          <>
            <div className="split-fill split-fill-yes" style={{ width: `${yesPct}%` }} />
            <div className="split-fill split-fill-no" style={{ width: `${noPct}%` }} />
          </>
        )}
      </div>
      {!empty && (
        <div className="split-pct">
          <span className="split-yes-label">{yesPct.toFixed(0)}%</span>
          <span className="split-no-label">{noPct.toFixed(0)}%</span>
        </div>
      )}
    </div>
  );
}
