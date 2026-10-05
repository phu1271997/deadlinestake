export type MarketStatus = 'OPEN' | 'RESOLVED_YES' | 'RESOLVED_NO' | 'REFUNDED';
export type Outcome = '' | 'YES' | 'NO' | 'AMBIGUOUS';
export type Side = 'YES' | 'NO';

/** The on-chain market record, as returned by get_market / list_markets. */
export interface Market {
  id: string;
  proposer: string;
  statement: string;
  evidence_url: string;
  corroborating_url: string;
  resolve_not_before: string; // epoch seconds (string)
  opened_at: string; // epoch seconds (string)
  status: MarketStatus;
  yes_total: string; // wei (string)
  no_total: string; // wei (string)
  yes_stakers: string[];
  no_stakers: string[];
  outcome: Outcome;
  confidence: number;
  reason: string;
  settled_at: string; // epoch seconds (string)
  paid_total: string; // wei (string)
}

export interface Page<T> {
  items: T[];
  total: number;
}
