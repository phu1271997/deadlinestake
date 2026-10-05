import type { MarketStatus, Outcome } from '../lib/types';

const STATUS_COPY: Record<MarketStatus, { label: string; tone: string }> = {
  OPEN: { label: 'Open', tone: 'badge-open' },
  RESOLVED_YES: { label: 'Resolved · YES', tone: 'badge-yes' },
  RESOLVED_NO: { label: 'Resolved · NO', tone: 'badge-no' },
  REFUNDED: { label: 'Refunded', tone: 'badge-refunded' },
};

export function StatusBadge({ status }: { status: MarketStatus }) {
  const copy = STATUS_COPY[status] ?? { label: status, tone: 'badge-open' };
  return <span className={`badge ${copy.tone}`}>{copy.label}</span>;
}

const OUTCOME_COPY: Record<Exclude<Outcome, ''>, { label: string; tone: string }> = {
  YES: { label: 'YES', tone: 'badge-yes' },
  NO: { label: 'NO', tone: 'badge-no' },
  AMBIGUOUS: { label: 'AMBIGUOUS', tone: 'badge-refunded' },
};

export function OutcomeBadge({ outcome }: { outcome: Outcome }) {
  if (!outcome) return null;
  const copy = OUTCOME_COPY[outcome];
  return <span className={`badge badge-lg ${copy.tone}`}>{copy.label}</span>;
}
