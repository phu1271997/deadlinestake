# DeadlineStake

**Self-resolving commitment markets on GenLayer studionet.**

Anyone opens a market around a concrete, publicly verifiable claim with a
deadline — *"Project X ships v1.0 with a public demo by DATE, evidenced at
`<url>`"*. Backers stake GEN on **YES** (it will be true by the deadline) or
**NO**. After the deadline, **anyone** can trigger settlement: a set of GenLayer
validators each **render the evidence page (and an optional corroborating page)
directly on-chain** (`gl.nondet.web.render`), read them with an LLM, and
independently decide **YES / NO / AMBIGUOUS**. The winning side splits the whole
pool pro-rata; an `AMBIGUOUS` outcome refunds every stake. No human oracle, no
trusted reporter, no admin key.

| | |
|---|---|
| **Live app** | https://deadlinestake.vercel.app _(set after first Vercel deploy)_ |
| **Contract** | [`0x77AB5BeEd7B77Df019D0BC5c33A303D126A7221d`](https://explorer-studio.genlayer.com/address/0x77AB5BeEd7B77Df019D0BC5c33A303D126A7221d) |
| **Network** | GenLayer **studionet**, chain id `61999` (Studio-hosted → Explorer status *Preview*) |
| **Repo** | https://github.com/phu1271997/deadlinestake |

> **Why this dies without GenLayer:** the market resolves itself from the live
> web with no human oracle. Settlement is a *subjective reading of an arbitrary
> web page at a specific time* — exactly what a Solidity contract cannot do, and
> what an off-chain oracle would only re-centralise behind a single reporter.

---

## The flow

```
OPEN a claim + deadline  →  STAKE YES / NO  →  (deadline passes)  →  SETTLE on-chain  →  WITHDRAW
```

1. **Open** — `open_market(statement, evidence_url, corroborating_url,
   resolve_not_before)`. The proposer may refine the evidence URLs with
   `set_evidence` until the deadline, after which they are frozen.
2. **Stake** — `stake(market_id, "YES"|"NO")` is payable; stakes accrue to each
   side's pool until the deadline.
3. **Settle** — after `resolve_not_before`, anyone calls `settle(market_id)`.
   The non-deterministic block renders the evidence, and an LLM returns
   `YES` / `NO` / `AMBIGUOUS` with a confidence and a free-text reason.
4. **Pay** — `YES` pays the YES side, `NO` pays the NO side: each winner
   recovers their stake plus a pro-rata share of the losing pool. `AMBIGUOUS`
   (or an evidence page that cannot be read) refunds every stake.
5. **Withdraw** — winnings and refunds accrue to a claimable balance pulled with
   `withdraw()`.

## Why the consensus is real (not a format check)

Settlement uses `gl.vm.run_nondet(leader_fn, validator_fn)`. The `validator_fn`
compares the **resolved outcome enum** (`YES` / `NO` / `AMBIGUOUS`) and
deliberately **ignores the free-text reason and the exact confidence number**.
Two validators that read the same page and phrase their reasoning differently
still agree; a genuine YES-vs-NO disagreement fails to settle and no money
moves. Validators check the *meaning* of the resolution, not the shape of the
JSON — the distinction the GenLayer rubric rewards.

### Fail-safe resolution

If the primary evidence cannot be rendered at all, the leader returns
`AMBIGUOUS` rather than guessing — so an unreachable page refunds both sides
instead of arbitrarily handing the pool to one of them. An optional
corroborating URL is rendered alongside the primary so the model can
cross-check two independent pages before committing to a decisive outcome.

## Repository layout

```
contracts/deadline_stake.py   # the Intelligent Contract (single contract)
frontend/                     # React + Vite + genlayer-js app (MetaMask signs)
scripts/deploy.py             # deploy to studionet from the central keystore
scripts/seed.mjs              # seed demo markets (resolve YES + resolve NO)
tests/                        # offline logic tests (pytest)
docs/DEPLOY-STUDIONET.md      # step-by-step deployment runbook
```

## Run it locally

```bash
cd frontend
npm ci
npm run dev          # http://localhost:5173
```

The current studionet address is baked in as a default; a `VITE_CONTRACT_ADDRESS`
override (in `frontend/.env.local` or the Vercel dashboard) points a build at a
redeploy. You need a MetaMask account **funded with GEN on studionet** (Studio
**Accounts** panel, not the public faucet). The app switches/adds the network on
connect and never holds a private key.

## Deploy your own

See [`docs/DEPLOY-STUDIONET.md`](docs/DEPLOY-STUDIONET.md):

```bash
source ~/.genlayer/env.sh
python3 scripts/deploy.py --chain studionet
# put the printed address in frontend/.env.local and src/lib/config.ts
```

## Seed demonstration data

```bash
source ~/.genlayer/env.sh      # GENLAYER_PRIVATE_KEY (proposer) + _2 (opposing staker)
cd frontend && npm ci && cd ..
node scripts/seed.mjs all
```

This opens two markets with short deadlines, stakes both sides, waits for the
deadline, and settles them by real consensus: a true claim → `RESOLVED_YES`, and
a false claim → `RESOLVED_NO`.

## Tests

```bash
pytest -q
```

## Tag

- **Primary:** Prediction Markets · **Tag 1:** Outcome Resolution · **Tag 2:** Event Forecasting
