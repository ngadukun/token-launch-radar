// Farm plans: one concrete plan per board protocol, generated from a
// playbook for the protocol's kind of product, instantiated with the
// protocol's own name, chains and size tier.
//
// Every plan follows the same discipline: use the product the way a real
// user would, starting now and kept up for weeks; state what it costs in
// gas on the protocol's main chain and what position size fits its tier;
// track the official channels for a points or token announcement; and stay
// sybil-safe — one wallet, real funds, a human pattern. Steps are written
// to be followed this week, not to sound good.

/** The slice of a protocol a plan is written for. */
export interface PlanSubject {
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
}

/** Everything a playbook template can mention. */
interface Ctx {
  name: string;
  chain: string;
  chain2: string | null;
  chainCount: number;
  /** Position size that fits the protocol's TVL tier, e.g. "$2,000-$10,000". */
  size: string;
  /** Typical per-transaction network cost on the main chain. */
  gas: string;
}

/** Position size by TVL tier: bigger protocols absorb bigger positions. */
function sizeFor(tvl: number): string {
  if (tvl >= 500_000_000) return '$10,000-$50,000';
  if (tvl >= 100_000_000) return '$5,000-$20,000';
  if (tvl >= 25_000_000) return '$2,000-$10,000';
  if (tvl >= 10_000_000) return '$1,000-$5,000';
  return '$500-$2,000';
}

/** What one transaction typically costs on a chain, in plain words. */
const GAS_BY_CHAIN: Record<string, string> = {
  Ethereum: '$4-$20 in gas',
  Base: '$0.02-$0.25 in gas',
  Arbitrum: '$0.05-$0.40 in gas',
  Optimism: '$0.03-$0.30 in gas',
  Unichain: '$0.02-$0.25 in gas',
  Solana: 'under $0.05 in fees',
  Binance: '$0.10-$0.60 in gas',
  Polygon: '$0.01-$0.10 in gas',
  Avalanche: '$0.10-$1.00 in gas',
  'Hyperliquid L1': 'under $0.05 in fees',
  Monad: 'under $0.10 in gas',
  Berachain: '$0.05-$0.50 in gas',
  Plasma: 'under $0.10 in fees',
  'Robinhood Chain': 'under $0.10 in gas',
  Bitcoin: '$1-$8 in miner fees',
};

function gasFor(chain: string): string {
  return GAS_BY_CHAIN[chain] ?? '$0.10-$2.00 in gas';
}

/** The step every plan carries about watching for the announcement. */
function trackStep(c: Ctx): string {
  return (
    `Follow ${c.name}'s official X account and Discord from the links inside its app and turn on notifications: ` +
    `points programs and token announcements at this size are posted there first. Check in weekly (10 minutes) ` +
    `and join any points, waitlist or testnet program in the week it opens, not after it starts trending.`
  );
}

/** The step every plan carries about staying sybil-safe. */
function sybilStep(c: Ctx): string {
  return (
    `Keep it sybil-safe: farm ${c.name} from one wallet, with your own funds and a steady, human pattern of use. ` +
    `Do not spin up extra wallets, script the app or wash volume back and forth — launch snapshots routinely ` +
    `cut clusters of linked wallets, which would zero out months of honest farming in one filter.`
  );
}

/** The breadth step: a second chain when there is one, depth when not. */
function breadthStep(c: Ctx): string {
  if (c.chain2 !== null) {
    return (
      `Repeat the core routine on a second chain ${c.name} runs on — ${c.chain2} — with a smaller amount, so your ` +
      `history is not single-chain. One session a fortnight (about 20 minutes) is enough: multi-chain users are ` +
      `the audience a launch usually wants to reach, and breadth is far cheaper to build before an announcement.`
    );
  }
  return (
    `Deepen the routine instead of widening it: in this snapshot ${c.name} runs only on ${c.chain}, so add a ` +
    `second product surface or a longer hold rather than a second chain. Thirty minutes a week across two ` +
    `surfaces, kept up for a full quarter, is a stronger record than one large transaction.`
  );
}

/** A playbook: the two core steps of a plan, in the family's own terms. */
type Playbook = (c: Ctx) => [string, string];

/**
 * A third core step for the families where one more habit separates a
 * regular from a passer-by. Families without an entry keep five steps.
 */
const EXTRA_STEP: Partial<Record<string, (c: Ctx) => string>> = {
  dex: (c) =>
    `Use one advanced surface of ${c.name} too — limit orders, its earn page or a second pair family — about once a month, so your history is not swaps alone. Each extra session costs ${c.gas} on ${c.chain}; breadth inside one protocol is what separates a regular from a passer-by in its data.`,
  lending: (c) =>
    `Keep a clean risk record on ${c.name}: never let a position drift close to liquidation — top up collateral early in a volatile week, not after a warning. A wallet with months of supply, one repaid borrow and zero liquidations is the profile a lending launch can reward without a second look.`,
  derivatives: (c) =>
    `Keep a simple trading journal for ${c.name}: each position's size, dates and result in one file. If a launch ever asks users to evidence activity — or a snapshot is ever disputed — a dated record beats memory, and the habit keeps position sizes honest week to week as well.`,
  curator: (c) =>
    `Read ${c.name}'s vault reports or risk notes when they appear (about 15 minutes a month) and change allocations only for a reason you write down. Allocators who stayed through a vault's bad month are visible in the data; a curator's launch has every reason to favour them.`,
};

const PLAYBOOKS: Record<string, Playbook> = {
  dex: (c) => [
    `Make ${c.name} your default swap venue on ${c.chain} for 8-12 weeks: route the swaps you would make anyway through it, roughly ${c.size} of volume a month across 2-3 sessions a week (about 20 minutes each). Each swap costs ${c.gas}; varied sizes and pairs read as a real user in any snapshot.`,
    `Provide liquidity to one of ${c.name}'s main pairs on ${c.chain} with funds you can leave untouched for at least 8 weeks — a slice of the ${c.size} tier is plenty. Check the position weekly (10 minutes) and do not chase the highest-APR pool: a steady position that predates any announcement is what launch allocations reward.`,
  ],
  lending: (c) => [
    `Supply assets on ${c.name}'s ${c.chain} market: deposit a major asset — ETH, a liquid staking token or a stablecoin — sized in the ${c.size} range, and leave it supplied for 8-12 weeks. Supplying is one transaction at ${c.gas}; glance at the position weekly (5 minutes) instead of moving funds in and out.`,
    `Use the other side as well: borrow modestly against your collateral on ${c.name}, keeping loan-to-value under 40% so a bad week cannot liquidate you, hold the borrow a few weeks, then repay in full. The borrow and the repay cost ${c.gas} each on ${c.chain}; a completed borrow-repay history is the pattern lending launches have rewarded.`,
  ],
  derivatives: (c) => [
    `Trade small, real positions on ${c.name} (${c.chain}) every week for 8-12 weeks: open and close one or two positions sized so a total loss stings but does not hurt — a few hundred dollars of margin for most wallets, up to ${c.size} if that is your normal size. Budget ${c.gas} per open and close plus funding; consistency over weeks beats volume spikes.`,
    `Also stand on ${c.name}'s passive side if it offers one — a margin vault, an options vault or a liquidity pool: park funds there for at least 6 weeks so your address shows up as a liquidity backer as well as a trader. Review it weekly (10 minutes); vault balances held through quiet weeks are what snapshots tend to count.`,
  ],
  yield: (c) => [
    `Deposit into one of ${c.name}'s core vaults on ${c.chain} — a stablecoin or ETH vault whose strategy you understand — sized in the ${c.size} range, and leave it for 8-12 weeks. Entry costs ${c.gas}. Resist hopping between vaults for a few extra basis points: a deposit that predates any points announcement by months is what a launch snapshot is built to find.`,
    `Spread a second, smaller deposit into a different ${c.name} strategy — another asset, or the same vault family on another chain it runs on — so your history covers more than one product. Check both positions weekly (10 minutes) and note the deposit dates; long, boring holds are the signal, not the yield itself.`,
  ],
  cdp: (c) => [
    `Open a position on ${c.name} (${c.chain}): deposit collateral in the ${c.size} range and mint its stablecoin against it, keeping the collateral ratio comfortably above the liquidation line (150% or higher where the app lets you choose). Minting costs ${c.gas}; hold the position at least 8 weeks and check it weekly (5 minutes).`,
    `Put the minted stablecoin to work inside the same ecosystem — hold it, or supply it to a lending market or pool ${c.name} links to — rather than selling it the same day. A mint that stays outstanding for weeks, and stablecoin balances that stay put, are the usage a CDP launch has to reward if it rewards anyone.`,
  ],
  rwa: (c) => [
    `Complete ${c.name}'s onboarding early — account, identity checks where it asks, wallet linking — even before investing anything: verified accounts that predate a token announcement are a set a launch can reward, and onboarding queues grow once a token is rumoured. Allow 30-45 minutes once, at no gas cost.`,
    `Buy and hold one of ${c.name}'s tokenised real-world assets, sized in the ${c.size} range on ${c.chain}, and hold it for at least 8-12 weeks while it pays whatever it pays. Entry costs ${c.gas} plus any platform fee shown before you confirm. RWA launches reward duration of holdings, so do not trade in and out around headlines.`,
  ],
  bridge: (c) => [
    `Bridge real funds with ${c.name} on a route you actually need — for example moving funds in the ${c.size} range to ${c.chain2 ?? c.chain} — at least twice a month for 2-3 months. Each crossing costs ${c.gas} plus the bridge fee shown upfront. Varied routes and amounts look like a user; the same amount ping-ponging hourly looks like a script.`,
    `After crossing with ${c.name}, stay active on the far side: hold the bridged funds there for a few weeks and make ordinary transactions instead of bridging straight back. Bridges that launched tokens rewarded wallets whose crossings settled into real activity, not round trips finished in one sitting.`,
  ],
  staking: (c) => [
    `Stake through ${c.name} on ${c.chain} with funds in the ${c.size} range and hold the position — and the receipt token it issues — for at least 8-12 weeks. Staking costs ${c.gas} once. Long unbroken holds are what staking snapshots measure, so stake an amount you will not need to pull early for gas or expenses.`,
    `Put the receipt token to work in one place ${c.name}'s ecosystem points to — a lending market, a liquidity pool or a restaking layer — with a small part of the position, keeping the bulk simply staked. Check weekly (5 minutes) and never unstake and restake elsewhere just to chase a boosted rate.`,
  ],
  curator: (c) => [
    `Allocate into one of the vaults ${c.name} curates on ${c.chain} — pick a strategy you can explain in one sentence — sized in the ${c.size} range, and hold for 8-12 weeks. Entry costs ${c.gas}. If a curator launches a token, it will look at who supplied capital through its vaults and for how long, so duration beats size.`,
    `Add a second, smaller allocation to a different ${c.name} vault — another asset or risk profile — a few weeks after the first, rather than splitting on day one: a history that grows over time reads as a real allocator. Review both monthly (15 minutes) and keep a note of why you chose each vault.`,
  ],
  prediction: (c) => [
    `Trade on ${c.name} weekly for 8-12 weeks: take positions in markets you genuinely have a view on, in the low hundreds of dollars per market for most wallets (up to ${c.size} across open positions if that is normal for you). Fees are shown per market, and each trade on ${c.chain} costs ${c.gas}. A long history of settled positions is the record a launch would snapshot.`,
    `Rest limit orders on a few liquid markets on ${c.name} so your address also appears as a liquidity provider, and leave them working for days at a time rather than cancelling within the hour. Check the book twice a week (10 minutes); makers who were present in quiet weeks are scarcer, and more visible, than headline-week traders.`,
  ],
  chain: (c) => [
    `Be an early, ordinary user of ${c.name}'s chain: bridge a small amount in (the crossing costs ${c.gas} plus any bridge fee), then use its first apps weekly — a swap, a lend, a mint — with no more than ${c.size} in play. New chains distribute a token to wallets with a long, varied history, so start the clock now and keep the activity human-sized.`,
    `Keep a balance and a routine on ${c.name}: hold some of the chain's gas token, claim any ecosystem rewards it offers, and try each flagship app as it launches (about 30 minutes a week). Wallets that were active before the chain had a token are the exact set a genesis distribution is drawn from.`,
  ],
  generic: (c) => [
    `Use ${c.name}'s core product on ${c.chain} the way a real user would, at least weekly for 8-12 weeks, with no more than ${c.size} in play: whatever its main action is — deposit, trade, insure, pay — do that one, at ${c.gas} per transaction. Launches reward addresses whose usage predates the announcement, so the time to build the history is before anyone is watching.`,
    `Cover a second surface of ${c.name} as well — another of its product lines, its governance forum, or its community quests if it runs them — so your address is not a one-transaction wallet. Thirty minutes a week across both surfaces, kept up for a quarter, builds a stronger record than one large transaction.`,
  ],
};

/** Which playbook a DefiLlama category is farmed by. */
const FAMILY_BY_CATEGORY: Record<string, string> = {
  Dexs: 'dex',
  Lending: 'lending',
  'Uncollateralized Lending': 'lending',
  'Collateral Markets': 'lending',
  Derivatives: 'derivatives',
  Options: 'derivatives',
  'Options Vault': 'derivatives',
  'Interest Rate Derivatives': 'derivatives',
  Synthetics: 'derivatives',
  Yield: 'yield',
  'Yield Aggregator': 'yield',
  'Leveraged Farming': 'yield',
  Farm: 'yield',
  CDP: 'cdp',
  'CDP Manager': 'cdp',
  'Dual-Token Stablecoin': 'cdp',
  'Algo-Stables': 'cdp',
  'Stablecoin Issuer': 'cdp',
  'Stablecoin Wrapper': 'cdp',
  'Reserve Currency': 'cdp',
  RWA: 'rwa',
  Bridge: 'bridge',
  'Canonical Bridge': 'bridge',
  'Cross Chain Bridge': 'bridge',
  'Liquid Staking': 'staking',
  'Liquid Restaking': 'staking',
  Restaking: 'staking',
  'Restaked BTC': 'staking',
  'Staking Pool': 'staking',
  'Anchor BTC': 'staking',
  'Decentralized BTC': 'staking',
  'Risk Curators': 'curator',
  'Onchain Capital Allocator': 'curator',
  'Basis Trading': 'curator',
  'Liquidity Manager': 'curator',
  Indexes: 'curator',
  'Prediction Market': 'prediction',
  Chain: 'chain',
};

/** The playbook family a category farms under ('generic' when unmapped). */
export function playbookFamily(category: string | null): string {
  if (category === null) return 'generic';
  return FAMILY_BY_CATEGORY[category] ?? 'generic';
}

/** The full farm plan for one protocol: core steps, breadth, watch, safety. */
export function farmSteps(p: PlanSubject): string[] {
  const ctx: Ctx = {
    name: p.name,
    chain: p.chains[0] ?? 'Ethereum',
    chain2: p.chains.length > 1 ? p.chains[1]! : null,
    chainCount: p.chains.length,
    size: sizeFor(p.tvl_usd),
    gas: gasFor(p.chains[0] ?? 'Ethereum'),
  };
  const family = playbookFamily(p.category);
  const playbook = PLAYBOOKS[family] ?? PLAYBOOKS.generic!;
  const [first, second] = playbook(ctx);
  const extra = EXTRA_STEP[family];
  const steps = [first, second];
  if (extra !== undefined) steps.push(extra(ctx));
  steps.push(breadthStep(ctx), trackStep(ctx), sybilStep(ctx));
  return steps;
}
