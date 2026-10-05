# GENLAYER PROJECT EXPLORER — SUBMISSION DRAFT
**Project:** DeadlineStake · **Prepared:** 2026-10-05 · **Status: READY TO SUBMIT**

All character-capped fields counted with `wc -m`. Copy the field bodies verbatim
into the Portal Explorer form.

---

## Project name
DeadlineStake

## Primary category
**Prediction Markets**
The product is a two-sided market that pays out on a future, verifiable outcome.
Not chosen **AI & Agents** — the AI is the resolver, but the thing being built is
a self-settling prediction market, which is the more distinctive and accurate
primary.

## Category tags
- **Tag 1 — Outcome Resolution** — `settle` reads the evidence on-chain and
  finalizes the market state (the oracle / reality-assertion step).
- **Tag 2 — Event Forecasting** — participants stake GEN on YES/NO pools over a
  real-world event via `stake`, forming a probabilistic market.

Rejected: *Sports Outcomes* (not sports-specific), *Liquidity Provision* (no AMM
— it is a simple two-sided pool).

## Logo
`frontend/public/logo-1024.png` + `logo-512.png` (source `logo.svg`) — a
stopwatch dial with a resolving fork, indigo on dark. PNG, 1024/512 px, < 2 MB.

## One-liner (177 chars / cap 180)
Open a market on a publicly verifiable claim with a deadline; when it passes, GenLayer validators read the evidence on-chain and resolve YES, NO, or AMBIGUOUS — no human oracle.

## Description (857 chars / cap 1000)
A proposer opens a market around a concrete, checkable claim with a deadline and an evidence URL (e.g. a project ships a public demo by a date). Backers stake GEN on YES or NO. After the deadline, anyone can settle it: GenLayer validators each render the evidence page (and an optional corroborating page) directly on-chain, read it with an LLM, and independently decide YES, NO, or AMBIGUOUS. Consensus is on the outcome itself, not the wording of the reasoning, so honest disagreement fails safe instead of paying out wrongly. The winning side splits the whole pool pro-rata; AMBIGUOUS or unreadable evidence refunds every stake. For communities running commitment bets, grant milestones, or P2P wagers that need to settle themselves. Solidity cannot read the live web, and an oracle would recentralise the one judgement the market exists to decentralise.

## How to try it
Prerequisites: browsing markets and settled outcomes needs **no wallet**. Opening
or staking a market needs MetaMask with a little GEN on GenLayer **studionet**
(fund from the Studio Accounts panel — not the public faucet).

Step 1 — Browse resolved markets.
Open the app. Market #1 resolved YES (Bitcoin supply capped at 21M); market #2
resolved NO (Earth is flat). Open each and read the AI's on-chain `reason`.

Step 2 — (Optional) Open a market.
Click "Open a market", write a concrete claim, paste a public evidence URL, and
pick a deadline. Sign in MetaMask (approve the studionet switch if prompted).

Step 3 — Stake a side.
On an open market before its deadline, choose YES or NO, enter a GEN amount, and
stake. The split bar updates with the new pool.

Step 4 — Settle after the deadline.
Once the deadline passes, anyone clicks "Settle market". Validators render the
evidence and resolve it; the consensus panel names each phase while you wait.

Step 5 — Withdraw.
If your side won, your stake plus a pro-rata share of the losing pool accrues to
your claimable balance. Withdraw it.

Expected end state: a market moves OPEN → RESOLVED_YES / RESOLVED_NO (winners
paid) or REFUNDED (everyone refunded on AMBIGUOUS).

If something goes wrong:
- "reverted … TOO_EARLY" — the deadline has not passed yet (step 4).
- Settlement returns AMBIGUOUS — the evidence page did not clearly settle the
  claim; use a page that states the fact plainly.

## Expected verification outcome (405 chars / cap 500)
Market #1 (Bitcoin supply capped at 21M): status RESOLVED_YES, confidence 98%; the YES side's 0.03 GEN beats the NO side's 0.02 and the 0.05 pool pays YES. Market #2 (Earth is flat): status RESOLVED_NO, confidence 100%; the NO side wins the 0.05 pool. Each shows the on-chain reason the validators produced. Browsing needs no wallet; opening or staking a market needs a studionet wallet with a little GEN.

## Contract link
https://explorer-studio.genlayer.com/address/0x77AB5BeEd7B77Df019D0BC5c33A303D126A7221d

Address: `0x77AB5BeEd7B77Df019D0BC5c33A303D126A7221d`
Network: GenLayer studionet (chain id 61999)
Status: **Preview** (Studio-hosted deployment)
Verified in a browser: market #1 (RESOLVED_YES) and market #2 (RESOLVED_NO) are
settled on chain with a `SUCCESS` settlement transaction.

## Website
https://deadlinestake.vercel.app

## GitHub
https://github.com/phu1271997/deadlinestake

## Community links (optional)
— none —
