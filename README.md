# Token Launch Radar

[![Token radar bounty](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![Rank](https://make.fun/badge/token-radar-01/ngadukun/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![Reward](https://make.fun/badge/token-radar-01/ngadukun/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

An entry for make.fun's [token-radar-01](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) bounty: a radar for token launches that have not happened yet.

The radar reads a sealed DefiLlama snapshot (758 protocols, as of 2026-11-14), finds every protocol that records no token of its own, ranks it by an **implied value** — what its token would be worth if it priced like the already-tokenised protocols beside it — and writes a concrete **farm plan** for each: what to do, where, what it costs and how long it takes, starting this week.

## The board

- All **40 watchlist** protocols (the house's floor: no token recorded, at least $50M TVL), plus **187 further finds** below that floor — every protocol in the snapshot at or above its $5M inclusion floor that records no token.
- Left off, on purpose: wrapped, staked or versioned products of tokens that already trade (the snapshot's largest such rows are wrapped Bitcoin and bridged Tether — claims on existing tokens, not launches), bridge systems whose TVL is other networks' assets in transit, and centralised exchanges, whose TVL is customer custody.
- 416 protocols already record a token. They are never ranked; they are the **comparables** the values are priced from.

## The value model

No protocol is named in the model. Every figure comes from the snapshot itself:

1. **Comparables.** Each tokenised protocol with a market cap gives one observation of mcap / TVL (144 in this snapshot). Per category the model takes the **median** ratio — a category needs at least 4 comparables to price itself, otherwise it falls back to the **global median, 0.1689**. (Dexs price at 0.342, Lending at 0.132, Yield Aggregators at 0.050.)
2. **Base.** implied base = TVL × the category multiple.
3. **Momentum.** × (1 + 0.6 · tanh(7-day TVL change / 20)) — growth helps, shrinkage hurts, and the curve saturates instead of exploding.
4. **Tokenless age.** +9% per year the protocol has been tracked with no token, capped at five years: the longer the wait, the more a launch is owed.
5. **Scale.** Above $100M TVL, × (TVL / $100M)^-0.05, so the largest protocols are not extrapolated linearly forever.
6. **Chain breadth.** +2% per chain beyond the first, capped at +20%.

The dashboard's detail view shows this arithmetic for every protocol, factor by factor, with the same rounded numbers the program computed with.

## Reading a farm plan

Each plan is generated from a playbook for the protocol's kind of product — Dexs, Lending, Derivatives, Yield, CDP and stablecoins, RWA, Bridges, Staking, Curators and allocators, Prediction Markets, Chains — instantiated with the protocol's own name, main chain and TVL tier. Every plan ends with the same two disciplines: track the official channels so a points or token announcement is caught in its first week, and stay sybil-safe (one wallet, real funds, a human pattern), because launch snapshots routinely cut clusters of linked wallets. Position sizes scale with the protocol's tier, from $500–$2,000 at the board's floor to $10,000–$50,000 at its top, and gas is quoted for the protocol's main chain.

## The dashboard

A hand-rolled dark "scope" page — deep navy, one phosphor accent, no framework, no network. A sortable, filterable board (search, category, chain, minimum TVL, watchlist-only), a detail view per protocol with its snapshot facts, full model breakdown and numbered farm plan, and a methodology strip that states the model in plain words. It stages from the URL for screenshots and shared links: `?view=detail&slug=<slug>`, `?filter=<category>`, `?watchlist=1`.

## Run it

Node 22.18+, standard library only, no network, deterministic — two runs write identical bytes.

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input <path-to-snapshot.json>
```

This writes `board.json` (the ranked board), `data.js` (the dashboard's data), a copy of `dashboard/` and `screenshots/`, and `dossier.json` (built with the vendored `vendor/makefun-board.ts`, byte-identical to the kit's library) into the output directory. Serve the output directory with any static file server and open `dashboard/index.html`.

## Layout

- `main.ts` — the program: snapshot in, board + dashboard + dossier out.
- `lib/model.ts` — the value model and the board's self-check.
- `lib/plans.ts` — the farm playbooks, one per kind of protocol, instantiated with each protocol's name, chains and size tier.
- `dashboard/` — `index.html`, `app.css`, `app.js`: the page, under 28 KB of source in all.
- `screenshots/` — the board, a detail view and a filtered view of the page.
- `vendor/makefun-board.ts` — make.fun's dossier library, copied byte-identical from the bounty kit and never edited.

## Licence

MIT — see `LICENSE`.
