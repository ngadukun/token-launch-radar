// Token Launch Radar — the board page. Renders entirely from the data file
// main.ts generated beside it (window.RADAR_DATA): no network, no framework.
// Board view: sortable, filterable table. Detail view: one protocol's
// snapshot facts, its full model breakdown, and its farm plan.
// Initial state can be staged by URL: ?view=detail&slug=<slug> opens a
// protocol, ?filter=<category> starts with that category filter applied.

'use strict';

const DATA = window.RADAR_DATA;
const rows = DATA.rows;
const meta = DATA.meta;
const bySlug = new Map(rows.map((r) => [r.slug, r]));

const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

/** $1,234,567 — the full figure, for detail views. */
const money = (n) => '$' + n.toLocaleString('en-US');
/** $1.23B / $456M / $12K — the compact figure, for table cells. */
function compact(n) {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + n;
}
const mult = (x) => '×' + x.toFixed(4).replace(/0+$/, '').replace(/\.$/, '.0');
const factor = (x) => '×' + x.toFixed(2);
function pct(x) {
  if (x === null) return '<span class="flat">—</span>';
  const cls = x > 0 ? 'up' : x < 0 ? 'down' : 'flat';
  const sign = x > 0 ? '+' : '';
  return `<span class="${cls}">${sign}${x.toFixed(1)}%</span>`;
}

/* ---------------- header and methodology ---------------- */

function fillHeader() {
  $('meta-line').textContent =
    `Snapshot of ${meta.as_of} · ${meta.protocols_scanned} protocols scanned · ` +
    `${meta.tokenised_set_aside} already record a token and stand aside as comparables`;
  const stats = [
    ['On the board', meta.board_rows],
    ['Watchlist', meta.watchlist_rows],
    ['Comparables', meta.comparables],
    ['Global multiple', mult(meta.global_multiple)],
  ];
  $('mast-stats').innerHTML = stats
    .map(([k, v]) => `<div class="stat"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`)
    .join('');
  $('method-list').innerHTML = meta.model_notes
    .map((note) => {
      const cut = note.indexOf(': ');
      if (cut > 0 && cut < 24) return `<li><b>${esc(note.slice(0, cut + 1))}</b>${esc(note.slice(cut + 1))}</li>`;
      return `<li>${esc(note)}</li>`;
    })
    .join('');
  const lead = rows[0];
  const lm = lead.model;
  $('method-example').innerHTML =
    `<b>Worked example — ${esc(lead.name)} (rank #1):</b> ${money(lead.tvl_usd)} TVL × ${mult(lm.multiple)} ` +
    `(${lm.multiple_source === 'category' ? `the ${esc(lead.category ?? '')} category median` : `the global median — only ${lm.category_comps} tokenised ${esc(lead.category ?? 'uncategorised')} comparable${lm.category_comps === 1 ? '' : 's'}`}) ` +
    `= ${money(lm.base_usd)} base, then momentum ${factor(lm.momentum_factor)}, tokenless age ${factor(lm.age_factor)}, ` +
    `scale ${factor(lm.scale_factor)} and chain breadth ${factor(lm.chain_factor)} → <b>${money(lead.implied_value_usd)}</b>.`;
  $('method-note').textContent =
    `The board holds every protocol in the snapshot at or above $5M TVL that records no token — the ${meta.watchlist_rows} ` +
    `watchlist protocols plus ${meta.find_rows} further finds below the house's $50M floor — leaving out wrapped, staked and ` +
    `versioned products of tokens that already trade, bridge systems (whose TVL is other networks' assets in transit) ` +
    `and centralised exchanges.`;
  $('foot-line').textContent = `Data: ${meta.source}. Board built ${meta.as_of}; the snapshot does not move.`;
}

/* ---------------- filters and sorting ---------------- */

const state = { q: '', category: '', chain: '', minTvl: 0, watchOnly: false, sortKey: 'rank', sortDir: 1 };

function fillFilters() {
  const cats = new Map();
  const chains = new Map();
  for (const r of rows) {
    const c = r.category ?? 'Uncategorised';
    cats.set(c, (cats.get(c) ?? 0) + 1);
    for (const ch of r.chains) chains.set(ch, (chains.get(ch) ?? 0) + 1);
  }
  $('f-category').innerHTML =
    '<option value="">All categories</option>' +
    [...cats.entries()]
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([c, n]) => `<option value="${esc(c)}">${esc(c)} (${n})</option>`)
      .join('');
  $('f-chain').innerHTML =
    '<option value="">All chains</option>' +
    [...chains.entries()]
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .map(([c, n]) => `<option value="${esc(c)}">${esc(c)} (${n})</option>`)
      .join('');
}

function visibleRows() {
  const q = state.q.trim().toLowerCase();
  const out = rows.filter((r) => {
    if (state.watchOnly && !r.watchlist) return false;
    if (state.category && (r.category ?? 'Uncategorised') !== state.category) return false;
    if (state.chain && !r.chains.includes(state.chain)) return false;
    if (r.tvl_usd < state.minTvl) return false;
    if (q && !r.name.toLowerCase().includes(q) && !r.slug.includes(q)) return false;
    return true;
  });
  const key = state.sortKey;
  const dir = state.sortDir;
  const val = (r) => (key === 'category' ? (r.category ?? 'Uncategorised') : r[key]);
  out.sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    if (va === null && vb === null) return a.rank - b.rank;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === 'string') return dir * (va < vb ? -1 : va > vb ? 1 : a.rank - b.rank);
    return dir * (va - vb) || a.rank - b.rank;
  });
  return out;
}

function renderBoard() {
  const list = visibleRows();
  $('board-body').innerHTML = list
    .map(
      (r) => `<tr data-slug="${esc(r.slug)}">
        <td class="rank num">${r.rank}</td>
        <td class="proto"><span class="pname">${esc(r.name)}</span><span class="pslug">${esc(r.slug)}</span></td>
        <td class="cat">${esc(r.category ?? 'Uncategorised')}</td>
        <td class="chains num" title="${esc(r.chains.join(', '))}">${r.chain_count}</td>
        <td class="money num">${compact(r.tvl_usd)}</td>
        <td class="num">${pct(r.change_7d)}</td>
        <td class="value num">${compact(r.implied_value_usd)}</td>
        <td>${r.watchlist ? '<span class="chip">WATCHLIST</span>' : '<span class="chip find">FIND</span>'}</td>
      </tr>`,
    )
    .join('');
  $('empty').hidden = list.length > 0;
  $('count').innerHTML = `Showing <b>${list.length}</b> of ${rows.length} protocols`;
  document.querySelectorAll('thead th[data-key]').forEach((th) => {
    const active = th.dataset.key === state.sortKey;
    th.classList.toggle('sorted', active);
    th.setAttribute('aria-sort', active ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none');
    const label = th.textContent.replace(/ [▲▼]$/, '');
    th.textContent = label;
    if (active) {
      const dir = document.createElement('span');
      dir.className = 'dir';
      dir.textContent = state.sortDir === 1 ? ' ▲' : ' ▼';
      th.appendChild(dir);
    }
  });
}

/* ---------------- detail view ---------------- */

function modelRows(r) {
  const m = r.model;
  const catName = r.category ?? 'uncategorised';
  const multipleWhy =
    m.multiple_source === 'category'
      ? `median mcap/TVL of the ${m.category_comps} tokenised ${catName} protocols in the snapshot`
      : `global median of all ${meta.comparables} tokenised protocols — only ${m.category_comps} tokenised ${catName} ` +
        `protocol${m.category_comps === 1 ? '' : 's'}, too few to price the category on its own`;
  const lines = [
    ['TVL', money(r.tvl_usd), `value locked in the snapshot of ${meta.as_of}`],
    ['Category multiple', mult(m.multiple), multipleWhy],
    ['Base value', money(m.base_usd), 'TVL × multiple, before adjustments'],
    [
      'Momentum',
      factor(m.momentum_factor),
      r.change_7d === null ? 'no 7-day change reported, so no adjustment' : `7-day TVL change of ${r.change_7d.toFixed(1)}%`,
    ],
    [
      'Tokenless age',
      factor(m.age_factor),
      m.age_years === null
        ? 'no listing date reported, so no adjustment'
        : `tracked since ${r.listed_at} — ${m.age_years} years with no token`,
    ],
    [
      'Scale',
      factor(m.scale_factor),
      r.tvl_usd > 100_000_000 ? 'TVL above $100M is compressed, not extrapolated linearly' : 'at or below $100M, so no compression',
    ],
    ['Chain breadth', factor(m.chain_factor), `live on ${r.chain_count} chain${r.chain_count === 1 ? '' : 's'}`],
  ];
  return (
    lines
      .map(([k, v, why]) => `<tr><td>${esc(k)}</td><td class="amt">${esc(v)}</td><td class="why">${esc(why)}</td></tr>`)
      .join('') +
    `<tr class="total"><td>Implied value</td><td class="amt">${money(r.implied_value_usd)}</td><td></td></tr>`
  );
}

function openDetail(slug) {
  const r = bySlug.get(slug);
  if (!r) return;
  $('detail').innerHTML = `
    <div class="detail-head">
      <h2>${esc(r.name)}</h2>
      <span class="slug">${esc(r.slug)} · rank #${r.rank} of ${rows.length}</span>
      ${r.watchlist ? '<span class="chip">WATCHLIST</span>' : '<span class="chip find">BELOW-FLOOR FIND</span>'}
      <div class="big-value"><span class="k">Implied value</span><span class="v">${money(r.implied_value_usd)}</span></div>
    </div>
    <div class="detail-grid">
      <div class="card">
        <h3>Snapshot facts</h3>
        <dl class="facts">
          <dt>Category</dt><dd>${esc(r.category ?? 'Uncategorised')}</dd>
          <dt>TVL</dt><dd>${money(r.tvl_usd)}</dd>
          <dt>7-day change</dt><dd>${pct(r.change_7d)}</dd>
          <dt>Chains</dt><dd>${esc(r.chains.join(', '))}</dd>
          <dt>Tracked since</dt><dd>${esc(r.listed_at ?? 'not reported')}</dd>
          <dt>Token</dt><dd>none recorded in the snapshot</dd>
          <dt>Implied band</dt><dd>${esc(r.band)}</dd>
        </dl>
      </div>
      <div class="card">
        <h3>How the value is built</h3>
        <table class="model-table"><tbody>${modelRows(r)}</tbody></table>
      </div>
      <div class="card plan" style="grid-column: 1 / -1">
        <h3>Farm plan — what to do before a launch</h3>
        <ol>${r.farm_steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </div>
    </div>`;
  $('board-view').hidden = true;
  $('detail-view').hidden = false;
  window.scrollTo(0, 0);
  history.replaceState(null, '', `?view=detail&slug=${encodeURIComponent(slug)}`);
}

function closeDetail() {
  $('detail-view').hidden = true;
  $('board-view').hidden = false;
  history.replaceState(null, '', window.location.pathname);
}

/* ---------------- wiring ---------------- */

function init() {
  fillHeader();
  fillFilters();

  $('q').addEventListener('input', (e) => { state.q = e.target.value; renderBoard(); });
  $('f-category').addEventListener('change', (e) => { state.category = e.target.value; renderBoard(); });
  $('f-chain').addEventListener('change', (e) => { state.chain = e.target.value; renderBoard(); });
  $('f-tvl').addEventListener('change', (e) => { state.minTvl = Number(e.target.value); renderBoard(); });
  $('f-watch').addEventListener('change', (e) => { state.watchOnly = e.target.checked; renderBoard(); });
  $('controls').addEventListener('submit', (e) => e.preventDefault());

  document.querySelectorAll('thead th[data-key]').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.key;
      if (state.sortKey === key) {
        state.sortDir = -state.sortDir;
      } else {
        state.sortKey = key;
        state.sortDir = key === 'name' || key === 'category' || key === 'rank' ? 1 : -1;
      }
      renderBoard();
    });
  });

  $('board-body').addEventListener('click', (e) => {
    const tr = e.target.closest('tr[data-slug]');
    if (tr) openDetail(tr.dataset.slug);
  });
  $('back').addEventListener('click', closeDetail);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('detail-view').hidden) closeDetail();
  });

  // Stage the initial state from the URL, for screenshots and shared links.
  const params = new URLSearchParams(window.location.search);
  if (params.get('watchlist') === '1') {
    state.watchOnly = true;
    $('f-watch').checked = true;
  }
  const filter = params.get('filter');
  if (filter) {
    const match = [...$('f-category').options].find((o) => o.value === filter);
    if (match) {
      state.category = filter;
      $('f-category').value = filter;
    }
  }
  renderBoard();
  if (params.get('view') === 'detail' && params.get('slug')) openDetail(params.get('slug'));
}

init();
