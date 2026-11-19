// The token launch radar's value model.
//
// Everything on the board is derived from the sealed snapshot's own figures.
// No protocol is named in this file: a protocol's implied value is its TVL,
// priced at the multiple the snapshot's already-tokenised protocols trade at,
// then adjusted by four factors that also come from the snapshot alone.
//
// How a value is built, in order:
//   1. Comparables. Every protocol that records a token (mcap_usd present)
//      and holds TVL gives one observation of mcap / TVL. Per category the
//      model takes the median of those ratios; a category with fewer than
//      MIN_CATEGORY_COMPS observations is too thin to trust, so it falls
//      back to the global median over all comparables. The median, not the
//      mean: a handful of tokens trade at hundreds of times TVL and would
//      drag a mean far away from what a typical launch is priced at.
//   2. Base. base = TVL x the protocol's category multiple.
//   3. Momentum. A protocol whose TVL grew over the last 7 days is arriving
//      at its launch with a larger, hotter market than one that shrank:
//      factor = 1 + 0.6 * tanh(change_7d / 20), a smooth curve that moves
//      the value by up to about +/-46% and saturates instead of exploding.
//   4. Tokenless age. The longer a substantial protocol has run with no
//      token, the more a launch is owed to its users: +9% per year since
//      DefiLlama first tracked it, capped at five years (+45%).
//   5. Scale. Above $100M of TVL the multiple is compressed by
//      (TVL / $100M)^-0.05, so a billion-dollar protocol is not extrapolated
//      linearly forever; at $2.75B the compression is about 0.85.
//   6. Chain breadth. Each chain beyond the first adds 2%, capped at +20%:
//      a protocol live on eleven chains has eleven communities to launch to.
//
// The displayed multiple and factors are rounded to 4 decimals before the
// final value is computed, so the arithmetic a reader sees on the dashboard
// is the arithmetic the program did.

/** One protocol of the snapshot, exactly the ten fields the file carries. */
export interface Protocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The sealed snapshot: metadata, every protocol, and the house watchlist. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: Protocol[];
  watchlist: string[];
}

/** How one row's implied value was built: every ingredient, as displayed. */
export interface ModelBreakdown {
  /** The mcap/TVL multiple applied, rounded to 4 decimals. */
  multiple: number;
  /** Whether the multiple is the category median or the global fallback. */
  multiple_source: 'category' | 'global';
  /** How many tokenised comparables stand behind the multiple's category. */
  category_comps: number;
  /** TVL x multiple, in whole dollars, before adjustments. */
  base_usd: number;
  /** The 7-day momentum multiplier (1 when the snapshot reports no change). */
  momentum_factor: number;
  /** Years the protocol has been tracked with no token (null: unreported). */
  age_years: number | null;
  /** The tokenless-age multiplier (1 when no listing date is reported). */
  age_factor: number;
  /** The scale-compression multiplier (1 at or below $100M TVL). */
  scale_factor: number;
  /** The chain-breadth multiplier. */
  chain_factor: number;
}

/** One ranked board row: the gate's fields plus everything the page shows. */
export interface BoardRow {
  slug: string;
  name: string;
  rank: number;
  implied_value_usd: number;
  farm_steps: string[];
  category: string | null;
  chains: string[];
  chain_count: number;
  tvl_usd: number;
  change_7d: number | null;
  listed_at: string | null;
  /** True when the house watchlist names this protocol; false for a find. */
  watchlist: boolean;
  /** The implied-value band the dashboard groups signals by. */
  band: string;
  model: ModelBreakdown;
}

/** One category's comparable set: how many tokenised protocols, their median. */
export interface CategoryStat {
  category: string;
  comps: number;
  median_multiple: number;
  /** True when the category is thick enough to price from its own median. */
  used: boolean;
}

/** Run-wide figures the dashboard's header and methodology strip read. */
export interface RadarMeta {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols_scanned: number;
  tokenised_set_aside: number;
  comparables: number;
  global_multiple: number;
  board_rows: number;
  watchlist_rows: number;
  find_rows: number;
  board_floor_usd: number;
  total_implied_usd: number;
  median_implied_usd: number;
  categories: CategoryStat[];
  model_notes: string[];
}

/** The snapshot's own inclusion floor: every protocol in it holds >= $5M. */
export const BOARD_FLOOR_USD = 5_000_000;
/** A category needs at least this many tokenised comparables to price itself. */
export const MIN_CATEGORY_COMPS = 4;
/** TVL above which the scale compression starts to bite. */
const SCALE_PIVOT_USD = 100_000_000;

/** Round to 4 decimals: the precision the dashboard shows and the model uses. */
const r4 = (x: number): number => Math.round(x * 10_000) / 10_000;

/** The median of an already-sorted array (the mean of the middle pair if even). */
function medianOf(sorted: number[]): number {
  const n = sorted.length;
  if (n === 0) return 0;
  const mid = Math.floor(n / 2);
  return n % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Parse and lightly validate the snapshot's JSON text. */
export function parseSnapshot(text: string): Snapshot {
  const raw = JSON.parse(text) as Snapshot;
  if (typeof raw.as_of !== 'string' || !Array.isArray(raw.protocols) || !Array.isArray(raw.watchlist)) {
    throw new Error('snapshot: not the sealed token-radar snapshot (missing as_of, protocols or watchlist)');
  }
  return raw;
}

/** True when the snapshot records no token for the protocol. */
export function recordsNoToken(p: Protocol): boolean {
  return p.gecko_id === null && p.symbol === null;
}

const DERIVATIVE_WORD = /\b(wrapped|staked|staking)\b/i;
const VERSION_SUFFIX = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const EXCHANGE_PREFIX = /^(Binance|Coinbase|Bybit|Kraken|Bitget|OKX|Bitfinex|Gemini)\b/;

/**
 * True when a name marks the protocol as a wrapped, staked or versioned
 * product of something else — the same name tests the house watchlist uses.
 * Such a product is a claim on a token that already trades, not a launch
 * still to come, so the radar leaves it off the board.
 */
export function isDerivativeProduct(p: Protocol): boolean {
  return DERIVATIVE_WORD.test(p.name) || VERSION_SUFFIX.test(p.name) || EXCHANGE_PREFIX.test(p.name);
}

/** The comparable set: every tokenised protocol's mcap/TVL, grouped by kind. */
interface Comparables {
  globalMultiple: number;
  observations: number;
  byCategory: Map<string, { count: number; median: number }>;
}

function buildComparables(snapshot: Snapshot): Comparables {
  const all: number[] = [];
  const groups = new Map<string, number[]>();
  for (const p of snapshot.protocols) {
    if (p.mcap_usd === null || p.tvl_usd <= 0) continue;
    const ratio = p.mcap_usd / p.tvl_usd;
    all.push(ratio);
    if (p.category !== null) {
      const list = groups.get(p.category) ?? [];
      list.push(ratio);
      groups.set(p.category, list);
    }
  }
  all.sort((a, b) => a - b);
  const byCategory = new Map<string, { count: number; median: number }>();
  for (const [category, ratios] of groups) {
    ratios.sort((a, b) => a - b);
    byCategory.set(category, { count: ratios.length, median: medianOf(ratios) });
  }
  return { globalMultiple: medianOf(all), observations: all.length, byCategory };
}

/** The multiple a category prices at, and where it came from. */
function multipleFor(
  category: string | null,
  comps: Comparables,
): { multiple: number; source: 'category' | 'global'; categoryComps: number } {
  const stat = category === null ? undefined : comps.byCategory.get(category);
  if (stat !== undefined && stat.count >= MIN_CATEGORY_COMPS) {
    return { multiple: r4(stat.median), source: 'category', categoryComps: stat.count };
  }
  return { multiple: r4(comps.globalMultiple), source: 'global', categoryComps: stat?.count ?? 0 };
}

/** The band an implied value falls in, for the dashboard's signal column. */
function bandOf(value: number): string {
  if (value >= 250_000_000) return '>$250M';
  if (value >= 50_000_000) return '$50M-$250M';
  if (value >= 10_000_000) return '$10M-$50M';
  return '<$10M';
}

/** Whole days between two YYYY-MM-DD dates, both read as UTC. */
function daysBetween(from: string, to: string): number {
  const ms = Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Score one pre-token protocol: its breakdown and its implied value. */
function scoreProtocol(
  p: Protocol,
  comps: Comparables,
  asOf: string,
): { value: number; model: ModelBreakdown } {
  const { multiple, source, categoryComps } = multipleFor(p.category, comps);
  const base = Math.round(p.tvl_usd * multiple);

  const momentum = p.change_7d === null ? 1 : r4(1 + 0.6 * Math.tanh(p.change_7d / 20));

  let ageYears: number | null = null;
  let age = 1;
  if (p.listed_at !== null) {
    const years = Math.max(0, daysBetween(p.listed_at, asOf)) / 365.25;
    ageYears = Math.round(years * 10) / 10;
    age = r4(1 + 0.09 * Math.min(ageYears, 5));
  }

  const scale = p.tvl_usd <= SCALE_PIVOT_USD ? 1 : r4(Math.pow(p.tvl_usd / SCALE_PIVOT_USD, -0.05));
  const breadth = r4(1 + 0.02 * Math.min(Math.max(p.chains.length - 1, 0), 10));

  const value = Math.max(1, Math.round(base * momentum * age * scale * breadth));
  return {
    value,
    model: {
      multiple,
      multiple_source: source,
      category_comps: categoryComps,
      base_usd: base,
      momentum_factor: momentum,
      age_years: ageYears,
      age_factor: age,
      scale_factor: scale,
      chain_factor: breadth,
    },
  };
}

/**
 * Categories whose TVL is not a launch candidate's own market: a bridge's
 * TVL is other networks' assets in transit (the snapshot's biggest
 * "pre-token" rows are wrapped Bitcoin and bridged Tether, which are claims
 * on tokens that already trade, not launches still to come), and a
 * centralised exchange's TVL is customer custody, not an on-chain protocol
 * a reader can farm. The radar leaves both off the board.
 */
const NON_CANDIDATE_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'CEX']);

/** True when a protocol belongs on the board (farm steps are added later). */
function isBoardCandidate(p: Protocol): boolean {
  if (!recordsNoToken(p)) return false;
  if (p.tvl_usd < BOARD_FLOOR_USD) return false;
  if (isDerivativeProduct(p)) return false;
  if (p.category !== null && NON_CANDIDATE_CATEGORIES.has(p.category)) return false;
  return true;
}

/** The plain-words model statement the dashboard's methodology strip echoes. */
const MODEL_NOTES: string[] = [
  'Implied value = TVL x the mcap/TVL multiple that already-tokenised protocols of the same category trade at (the category median; the global median when a category has fewer than 4 tokenised comparables).',
  'Momentum: the multiple moves by 1 + 0.6 x tanh(7-day TVL change / 20) — growth helps, shrinkage hurts, and the curve saturates instead of exploding.',
  'Tokenless age: +9% for every year the protocol has been tracked with no token, capped at five years — the longer the wait, the more a launch is owed.',
  'Scale: above $100M TVL the value is compressed by (TVL / $100M)^-0.05, so the largest protocols are not extrapolated linearly forever.',
  'Chain breadth: +2% for each chain beyond the first, capped at +20% — more chains means more communities to launch to.',
];

/**
 * Build the ranked board (rows carry empty farm_steps; main.ts fills them
 * from lib/plans.ts so this file stays the model and nothing else).
 */
export function buildBoard(snapshot: Snapshot): { rows: BoardRow[]; meta: RadarMeta } {
  const comps = buildComparables(snapshot);
  const watchlist = new Set(snapshot.watchlist);

  const scored: { p: Protocol; value: number; model: ModelBreakdown }[] = [];
  for (const p of snapshot.protocols) {
    if (!isBoardCandidate(p)) continue;
    const { value, model } = scoreProtocol(p, comps, snapshot.as_of);
    scored.push({ p, value, model });
  }
  // Rank by implied value; ties fall to the larger TVL, then the slug, so
  // two runs of the same snapshot rank identically every time.
  scored.sort((a, b) => b.value - a.value || b.p.tvl_usd - a.p.tvl_usd || (a.p.slug < b.p.slug ? -1 : 1));

  const rows: BoardRow[] = scored.map((s, i) => ({
    slug: s.p.slug,
    name: s.p.name,
    rank: i + 1,
    implied_value_usd: s.value,
    farm_steps: [],
    category: s.p.category,
    chains: [...s.p.chains],
    chain_count: s.p.chains.length,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    listed_at: s.p.listed_at,
    watchlist: watchlist.has(s.p.slug),
    band: bandOf(s.value),
    model: s.model,
  }));

  const categories: CategoryStat[] = [...comps.byCategory.entries()]
    .map(([category, stat]) => ({
      category,
      comps: stat.count,
      median_multiple: r4(stat.median),
      used: stat.count >= MIN_CATEGORY_COMPS,
    }))
    .sort((a, b) => (a.category < b.category ? -1 : 1));

  const values = rows.map((r) => r.implied_value_usd).sort((a, b) => a - b);
  const meta: RadarMeta = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    protocols_scanned: snapshot.protocols.length,
    tokenised_set_aside: snapshot.protocols.length - snapshot.protocols.filter(recordsNoToken).length,
    comparables: comps.observations,
    global_multiple: r4(comps.globalMultiple),
    board_rows: rows.length,
    watchlist_rows: rows.filter((r) => r.watchlist).length,
    find_rows: rows.filter((r) => !r.watchlist).length,
    board_floor_usd: BOARD_FLOOR_USD,
    total_implied_usd: rows.reduce((n, r) => n + r.implied_value_usd, 0),
    median_implied_usd: Math.round(medianOf(values)),
    categories,
    model_notes: MODEL_NOTES,
  };
  return { rows, meta };
}

/**
 * The gate's shape, checked before anything is written: a string naming the
 * first problem, or null when the board is one the scorer accepts.
 */
export function boardIssue(rows: BoardRow[], snapshot: Snapshot): string | null {
  if (rows.length < 100 || rows.length > 4000) return `board holds ${rows.length} rows, outside 100..4000`;
  const slugs = new Set(snapshot.protocols.map((p) => p.slug));
  const seen = new Set<string>();
  for (const row of rows) {
    if (!slugs.has(row.slug)) return `row ${row.slug} is not one of the snapshot's protocols`;
    if (seen.has(row.slug)) return `slug ${row.slug} appears twice`;
    seen.add(row.slug);
  }
  for (const slug of snapshot.watchlist) {
    if (!seen.has(slug)) return `watchlist protocol ${slug} is missing from the board`;
  }
  let previous = Number.POSITIVE_INFINITY;
  let allEqual = rows.length > 1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]!;
    if (row.rank !== i + 1) return `ranks are not exactly 1..${rows.length}`;
    if (!Number.isInteger(row.implied_value_usd) || row.implied_value_usd <= 0) {
      return `row ${row.slug}: implied value ${row.implied_value_usd} is not a positive whole number`;
    }
    if (row.implied_value_usd > previous) return `row ${row.slug}: implied value rises as rank ascends`;
    if (row.implied_value_usd !== rows[0]!.implied_value_usd) allEqual = false;
    previous = row.implied_value_usd;
    if (row.farm_steps.length < 3 || row.farm_steps.length > 12) {
      return `row ${row.slug}: ${row.farm_steps.length} farm steps, outside 3..12`;
    }
    for (const step of row.farm_steps) {
      const len = step.trim().length;
      if (len < 20 || len > 600) return `row ${row.slug}: a farm step is ${len} characters, outside 20..600`;
    }
  }
  if (allEqual) return 'every implied value is the same: the board ranks nothing';
  return null;
}

/** The dashboard's data file: the same rows the board carries, plus the meta. */
export function dataScript(meta: RadarMeta, rows: BoardRow[]): string {
  return `window.RADAR_DATA = ${JSON.stringify({ meta, rows })};\n`;
}
