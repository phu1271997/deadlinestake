const DECIMALS = 18n;
const ONE = 10n ** DECIMALS;

/**
 * Parse a human GEN amount into wei without ever touching a float.
 *
 * `parseFloat('0.1') * 1e18` is off by hundreds of wei, which is invisible in
 * a demo and wrong in a market. Everything here is string and bigint.
 */
export function parseGen(input: string): bigint {
  const clean = input.trim();
  if (!/^\d+(\.\d+)?$/.test(clean)) {
    throw new Error(`"${input}" is not a valid GEN amount.`);
  }
  const [whole, fraction = ''] = clean.split('.');
  if (fraction.length > Number(DECIMALS)) {
    throw new Error(`GEN amounts support at most ${DECIMALS} decimal places.`);
  }
  const padded = fraction.padEnd(Number(DECIMALS), '0');
  return BigInt(whole) * ONE + BigInt(padded || '0');
}

/** Format wei as GEN, trimming trailing zeros but never rounding. */
export function formatGen(wei: bigint | string, maxFractionDigits = 4): string {
  const value = typeof wei === 'string' ? BigInt(wei || '0') : wei;
  const negative = value < 0n;
  const abs = negative ? -value : value;

  const whole = abs / ONE;
  const fraction = (abs % ONE).toString().padStart(Number(DECIMALS), '0');
  const shown = fraction.slice(0, maxFractionDigits).replace(/0+$/, '');

  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${grouped}${shown ? `.${shown}` : ''}`;
}

export function shortAddress(address: string): string {
  if (!address || address.length < 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Epoch seconds (string or number) to a human date-time. */
export function formatEpoch(epoch: string | number): string {
  const secs = typeof epoch === 'string' ? Number(epoch) : epoch;
  if (!secs || Number.isNaN(secs)) return '—';
  return new Date(secs * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Human countdown to (or since) a deadline in epoch seconds.
 * Returns the phrase plus whether the deadline has already passed.
 */
export function countdown(deadlineEpoch: string | number): {
  passed: boolean;
  label: string;
} {
  const secs = typeof deadlineEpoch === 'string' ? Number(deadlineEpoch) : deadlineEpoch;
  const now = Math.floor(Date.now() / 1000);
  const diff = secs - now;
  if (diff <= 0) return { passed: true, label: 'deadline passed' };

  const d = Math.floor(diff / 86400);
  const h = Math.floor((diff % 86400) / 3600);
  const m = Math.floor((diff % 3600) / 60);
  let label: string;
  if (d > 0) label = `${d}d ${h}h`;
  else if (h > 0) label = `${h}h ${m}m`;
  else if (m > 0) label = `${m}m`;
  else label = 'under a minute';
  return { passed: false, label: `resolves in ${label}` };
}

/**
 * Pool split and implied odds from the two side totals (wei strings).
 * yesPct is the YES share of the whole pool, 0–100.
 */
export function poolSplit(yesWei: string, noWei: string): {
  yes: bigint;
  no: bigint;
  pool: bigint;
  yesPct: number;
  noPct: number;
} {
  const yes = BigInt(yesWei || '0');
  const no = BigInt(noWei || '0');
  const pool = yes + no;
  if (pool === 0n) return { yes, no, pool, yesPct: 50, noPct: 50 };
  // Percent from bigint with one decimal of internal resolution.
  const yesPct = Number((yes * 1000n) / pool) / 10;
  return { yes, no, pool, yesPct, noPct: 100 - yesPct };
}

/**
 * Implied payout multiple for a side: pool / sideTotal. A YES staker who wins
 * gets this many times their stake back (their own stake plus a share of the
 * losers' pool). Returns null when the side is empty.
 */
export function impliedOdds(sideWei: string, poolWei: bigint): string | null {
  const side = BigInt(sideWei || '0');
  if (side === 0n || poolWei === 0n) return null;
  // Two decimals of resolution.
  const x = Number((poolWei * 100n) / side) / 100;
  return `${x.toFixed(2)}×`;
}
