# Deploying DeadlineStake to GenLayer Studionet

Everything lives on **Studionet** — the hosted network behind
`https://studio.genlayer.com`, chain id `61999`. A contract deployed here exists
only here; the public testnet faucet funds a different chain entirely.

## 0. Before you start

- A wallet with a **GEN balance on Studionet**. Fund it from the Studio
  **Accounts** panel by transferring from a pre-funded Studio account. Do not
  use the public testnet faucet, and do not generate a burner in the browser.
- The deployer key available as `GENLAYER_PRIVATE_KEY` (`source ~/.genlayer/env.sh`).
- `python3` with `genlayer-py` installed.

## 1. Deploy the contract

```bash
source ~/.genlayer/env.sh
python3 scripts/deploy.py --chain studionet
```

The script loads the schema first, deploys, waits for the receipt, and prints
the address + an Explorer link. `FINALIZED` alone is not success — confirm the
address resolves on the Explorer with a `SUCCESS` row.

## 2. Point the frontend at the deployment

The current address is the hard-coded default in `frontend/src/lib/config.ts`.
To target a different deployment, edit that default or set an override:

```bash
cd frontend
cp .env.example .env.local
# set VITE_CONTRACT_ADDRESS=0x…
```

No private key belongs in that file — `VITE_` is compiled into the public
bundle. MetaMask signs every write.

## 3. Deploy the frontend

```bash
cd frontend
npm ci
npx vercel --prod
```

If you use the override, set the same `VITE_CONTRACT_ADDRESS` in the Vercel
project env and redeploy.

## 4. Seed demonstration data

```bash
source ~/.genlayer/env.sh      # GENLAYER_PRIVATE_KEY (proposer) + _2 (opposing staker)
node scripts/seed.mjs all
```

Each market is opened with a ~75-second deadline, both sides are staked, and the
script waits for the deadline before settling.

## Troubleshooting

| Symptom | Cause and fix |
|---|---|
| `AttributeError: … 'get_timestamp'` | Older runner API. This contract uses plain Python `datetime` for time. |
| `[EXPECTED] TOO_EARLY` on settle | The deadline (`resolve_not_before`) has not passed yet. |
| `Timed out waiting for … FINALIZED` | Studionet is slow to finalize; the app and seeder wait for `ACCEPTED`. |
| Settlement returns `AMBIGUOUS` unexpectedly | The evidence page could not be rendered or did not clearly settle the claim. Point `evidence_url` at a page that states the fact plainly. |
