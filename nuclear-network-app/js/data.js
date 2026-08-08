/* ============================================================
   data.js — JSON loaders + Plotly dark theme defaults
   ============================================================ */

const _cache = new Map();
const _BASE = 'data/';

async function _load(path) {
  if (_cache.has(path)) return _cache.get(path);
  const url = _BASE + path;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  const json = await res.json();
  _cache.set(path, json);
  return json;
}

window.Data = {
  manifest:           () => _load('manifest.json'),
  policyEvents:       () => _load('policy_events.json'),
  itsCoefficients:    () => _load('its_coefficients.json'),
  topicsOverview:     () => _load('topics_overview.json'),
  topicalVisibility:  () => _load('topical_visibility.json'),
  cohortAgeStats:     () => _load('cohort_age_stats.json'),
  cohortCountrySlim:  () => _load('cohort_age_by_country.json'),
  ewsFukushimaSeries: () => _load('ews_fukushima_series.json'),
  annualVolume:       () => _load('annual_volume_by_country.json'),
  networkCountryEdges:() => _load('network_country_edges.json'),
  networkMeasures:    () => _load('network_measures.json'),
  topicalVisByCountry:() => _load('topical_visibility_by_country.json'),
  load: _load,
};

/* ----------- Topic name resolution ------------------------ */
/*
   topics_overview.json carries: { topics: [{id, size, top_terms}] }
   where top_terms is "salt | heat | molten salt | reactor | ...".
   Derive a short display label from the first few substantive terms.

   A short curated map handles the headline sub-fields where the project
   has named conventions; everything else falls through to derive_label().
*/

const TOPIC_CURATED = {
  // BERTopic indices observed in this corpus; only the headline ones.
  2:  'Molten salt reactors',
  3:  'Reactor physics & neutronics',
  6:  'Sodium-cooled fast reactors',
  7:  'Nuclear education & workforce',
  8:  'Safeguards, MOX & security',
  9:  'Public perception & imaging',
  11: 'Lead-cooled & spallation',
  13: 'Nuclear data & UQ',
  15: 'Geological disposal',
  20: 'ITER & fusion-adjacent',
  26: 'Criticality safety',
  28: 'Hydrogen & PAR',
};

const STOPWORDS = new Set([
  'la','des','les','et','le','en','du','dans','pour','de',
  'the','and','a','of','to','in','on','for','with','by','an','at',
  'is','it','as','that','this','be','are','was','were',
]);

function deriveLabel(topTerms) {
  if (!topTerms) return null;
  const terms = String(topTerms)
    .split('|').map(s => s.trim())
    .filter(t => t && !STOPWORDS.has(t.toLowerCase()));
  // Prefer multi-word terms; pick the two most informative
  terms.sort((a, b) => b.split(' ').length - a.split(' ').length);
  const picked = [];
  for (const t of terms) {
    if (picked.length >= 2) break;
    if (picked.some(p => p.toLowerCase() === t.toLowerCase())) continue;
    if (picked.some(p => p.toLowerCase().includes(t.toLowerCase()))) continue;
    picked.push(t);
  }
  return picked.length ? picked.join(' / ') : null;
}

let _topicMapPromise = null;
window.TopicNames = {
  /**
   * Returns a Promise<Map<id_string, label>> covering every topic in topics_overview.
   * Curated names take precedence over derived ones.
   */
  map() {
    if (_topicMapPromise) return _topicMapPromise;
    _topicMapPromise = (async () => {
      const m = new Map();
      try {
        const ov = await Data.topicsOverview();
        for (const t of (ov.topics || [])) {
          const id = String(t.id);
          const curated = TOPIC_CURATED[t.id] || TOPIC_CURATED[Number(t.id)];
          const derived = deriveLabel(t.top_terms);
          m.set(id, t.name || curated || derived || `Topic ${id}`);
        }
      } catch (_) { /* topics_overview optional */ }
      return m;
    })();
    return _topicMapPromise;
  },
  /**
   * Synchronous label lookup; call after map() has resolved.
   */
  label(id, fallback) {
    return (window._topicMap && window._topicMap.get(String(id))) || fallback || `Topic ${id}`;
  },
  topTerms(id, overviewData) {
    if (!overviewData) return null;
    const t = (overviewData.topics || []).find(x => String(x.id) === String(id));
    return t ? t.top_terms : null;
  },
};

/* ----------- Plotly dark theme defaults ------------------- */
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

window.PlotTheme = {
  layout(extras = {}) {
    const base = {
      paper_bgcolor: cssVar('--bg-inset') || '#0a0d12',
      plot_bgcolor:  cssVar('--bg-inset') || '#0a0d12',
      font: {
        family: cssVar('--font-sans') || 'Inter, sans-serif',
        color:  cssVar('--text-primary') || '#e6edf3',
        size: 12,
      },
      margin: { l: 60, r: 30, t: 40, b: 50 },
      xaxis: {
        gridcolor: cssVar('--border-soft') || '#21262d',
        linecolor: cssVar('--border') || '#30363d',
        zerolinecolor: cssVar('--border') || '#30363d',
        tickcolor: cssVar('--border') || '#30363d',
        tickfont: { color: cssVar('--text-secondary') || '#b1bac4' },
        title: { font: { color: cssVar('--text-secondary') || '#b1bac4' } },
      },
      yaxis: {
        gridcolor: cssVar('--border-soft') || '#21262d',
        linecolor: cssVar('--border') || '#30363d',
        zerolinecolor: cssVar('--border') || '#30363d',
        tickcolor: cssVar('--border') || '#30363d',
        tickfont: { color: cssVar('--text-secondary') || '#b1bac4' },
        title: { font: { color: cssVar('--text-secondary') || '#b1bac4' } },
      },
      legend: {
        font: { color: cssVar('--text-secondary') || '#b1bac4' },
        bgcolor: 'rgba(0,0,0,0)',
      },
      hoverlabel: {
        bgcolor: cssVar('--bg-elev') || '#1c2128',
        bordercolor: cssVar('--border') || '#30363d',
        font: { family: cssVar('--font-mono'), color: cssVar('--text-primary') },
      },
    };
    return Object.assign(base, extras);
  },
  config: {
    displaylogo: false,
    responsive: true,
    modeBarButtonsToRemove: ['lasso2d', 'select2d', 'autoScale2d'],
  },
  colors: {
    amber: cssVar('--accent-amber') || '#d4a574',
    sage:  cssVar('--accent-sage')  || '#7fb3a8',
    coral: cssVar('--accent-coral') || '#d97757',
    muted: cssVar('--text-muted')   || '#768390',
  },
};

window.Fmt = {
  num(x, d = 3) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    return Number(x).toFixed(d);
  },
  pct(x, d = 1) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    return (100 * x).toFixed(d) + '%';
  },
  p(x) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    if (x === 0) return '< 10⁻⁶';
    if (x < 1e-6) return '< 10⁻⁶';
    if (x < 1e-4) return x.toExponential(1);
    if (x < 0.001) return '< 0.001';
    return x.toFixed(3);
  },
  sig(p) {
    if (p === null || p === undefined || !isFinite(p)) return 'sig-null';
    if (p < 0.001) return 'sig-strong';
    if (p < 0.01)  return 'sig-medium';
    if (p < 0.05)  return 'sig-weak';
    return 'sig-null';
  },
  signed(x, d = 3) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    const s = Number(x).toFixed(d);
    return (x > 0 ? '+' : '') + s;
  },
};
