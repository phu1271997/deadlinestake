import { studionet } from 'genlayer-js/chains';

/**
 * Contract address.
 *
 * The deployed Studionet address is hard-coded as the default so a fresh
 * checkout talks to the live contract with no configuration. A `VITE_`
 * override still wins when set, pointing the app at a different deployment
 * without a code change. A malformed override is ignored in favour of the
 * default rather than being allowed to reach the SDK as an opaque RPC error.
 */
const DEFAULT_CONTRACT = '0x77AB5BeEd7B77Df019D0BC5c33A303D126A7221d';
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

function firstNonEmpty(...v: (string | undefined)[]): string | undefined {
  for (const x of v) if (typeof x === 'string' && x.trim() !== '') return x;
  return undefined;
}

const raw = firstNonEmpty(import.meta.env.VITE_CONTRACT_ADDRESS, DEFAULT_CONTRACT)!;
export const contractAddress = (
  ADDRESS_PATTERN.test(raw.trim()) ? raw.trim() : DEFAULT_CONTRACT
) as `0x${string}`;

/**
 * Chain metadata is read from the SDK rather than hardcoded, so a change on
 * GenLayer's side is picked up by rebuilding instead of by editing constants.
 */
export const chain = studionet;
export const chainIdHex = `0x${studionet.id.toString(16)}` as const;

/**
 * Explorer base URL. `studionet.blockExplorers` currently points at a host
 * that is unreliable, so the working Studionet explorer is pinned here.
 */
const EXPLORER_BASE = 'https://explorer-studio.genlayer.com';

export const explorerTx = (h?: string): string | null =>
  h ? `${EXPLORER_BASE}/tx/${h}` : null;
export const explorerAddress = (a?: string): string | null =>
  a ? `${EXPLORER_BASE}/address/${a}` : null;
