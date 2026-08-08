/* ============================================================
   views/topics.js — Topical landscape
   ============================================================ */

const FEATURED_TOPIC_IDS = ['2', '6', '7'];  // molten salt, fast reactors, education

window.View_Topics = async function (root) {
  root.innerHTML = `
    <div class="hero" style="padding: 1.5rem 0 1rem; border: none;">
      <div class="eyebrow">Topics</div>
      <h1>Topical landscape</h1>
      <p class="subtitle">
        Thirty BERTopic sub-fields decomposed from the in-scope corpus
        on MiniLM embeddings, with their year-on-year visibility
        v<sub>s</sub>(t) = N<sub>s</sub>(t) / N(t).
      </p>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">Visibility trajectories</h2>
        <span class="panel-meta">click sub-fields below to toggle them in the chart</span>
      </div>
      <div id="trajectories" class="plot-container" style="min-height: 440px;"></div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">All sub-fields</h2>
        <div class="chip-row" id="sort-chips" style="margin: 0;">
          <span class="chip active" data-sort="size">size</span>
          <span class="chip" data-sort="recent">recent visibility</span>
          <span class="chip" data-sort="trend">trend (last 10 y)</span>
          <span class="chip" data-sort="id">id</span>
        </div>
      </div>
      <div id="topic-grid" class="topic-grid"></div>
      <p class="muted" style="font-size: 0.85rem; margin-top: 1rem;">
        Sub-fields are derived by BERTopic with UMAP-HDBSCAN on
        all-MiniLM-L6-v2 embeddings of titles plus abstracts; hierarchical
        reduction to thirty sub-fields. Top terms are c-TF-IDF weighted.
      </p>
    </div>
  `;

  // Inject styles for the topic grid; isolated to this view
  if (!document.getElementById('topic-grid-style')) {
    const s = document.createElement('style');
    s.id = 'topic-grid-style';
    s.textContent = `
      .topic-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 0.8rem; }
      .topic-card {
        background: var(--bg-elev); border: 1px solid var(--border-soft);
        border-left: 3px solid var(--border); border-radius: var(--radius);
        padding: 0.8rem 0.9rem; cursor: pointer;
        transition: border-color 0.15s ease, background 0.15s ease;
        display: flex; flex-direction: column; gap: 0.4rem; min-height: 130px;
      }
      .topic-card:hover { background: var(--bg-surface); border-left-color: var(--accent-sage); }
      .topic-card.selected { border-left-color: var(--accent-amber); background: var(--bg-surface); }
      .topic-card .tc-head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
      .topic-card .tc-id { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); }
      .topic-card .tc-size { font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted); }
      .topic-card .tc-name {
        font-family: var(--font-serif); font-weight: 600; font-size: 0.98rem;
        color: var(--text-primary); line-height: 1.2;
      }
      .topic-card .tc-terms {
        color: var(--text-secondary); font-size: 0.78rem; line-height: 1.3;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .topic-card .tc-spark { margin-top: auto; }
      .topic-card .tc-spark svg { width: 100%; height: 28px; display: block; }
      .topic-card .tc-trend {
        font-family: var(--font-mono); font-size: 0.72rem;
        display: flex; justify-content: space-between; gap: 0.5rem;
      }
      .topic-card.selected .tc-name { color: var(--accent-amber); }
    `;
    document.head.appendChild(s);
  }

  let overview, visibility;
  try {
    [overview, visibility, window._topicMap] = await Promise.all([
      Data.topicsOverview(),
      Data.topicalVisibility(),
      TopicNames.map(),
    ]);
  } catch (err) {
    root.innerHTML += `<div class="data-banner">
      <strong>Data missing.</strong> Run <code>scripts/export_for_webapp.py</code>.
      Error: ${App.escapeHtml(err.message)}
    </div>`;
    return;
  }

  const topics = (overview.topics || []).map(t => {
    const id = String(t.id);
    const series = (visibility.series || {})[id] || { years: [], visibility: [] };
    const recent = recentMean(series, 3);
    const earlier = recentMean(series, 3, 10);  // 10 years ago, 3-year window
    const trend = (recent != null && earlier != null) ? (recent - earlier) : 0;
    return {
      id, size: t.size, top_terms: t.top_terms,
      name: TopicNames.label(id),
      series, recent, earlier, trend,
    };
  });

  const state = {
    sort: 'size',
    selected: new Set(FEATURED_TOPIC_IDS),
  };

  function rerenderGrid() {
    const sorted = topics.slice().sort((a, b) => {
      switch (state.sort) {
        case 'size':   return (b.size || 0) - (a.size || 0);
        case 'recent': return (b.recent || 0) - (a.recent || 0);
        case 'trend':  return (b.trend || 0) - (a.trend || 0);
        case 'id':     return Number(a.id) - Number(b.id);
        default: return 0;
      }
    });

    const html = sorted.map(t => {
      const selected = state.selected.has(t.id) ? 'selected' : '';
      const trendArrow = t.trend > 0.0005 ? '↗' : t.trend < -0.0005 ? '↘' : '→';
      const trendColor = t.trend > 0.0005 ? 'var(--accent-amber)' :
                         t.trend < -0.0005 ? 'var(--accent-coral)' : 'var(--text-muted)';
      return `
        <div class="topic-card ${selected}" data-id="${t.id}">
          <div class="tc-head">
            <span class="tc-id">topic ${t.id}</span>
            <span class="tc-size">${(t.size || 0).toLocaleString()} works</span>
          </div>
          <div class="tc-name">${App.escapeHtml(t.name)}</div>
          <div class="tc-terms">${App.escapeHtml(formatTopTerms(t.top_terms, t.name))}</div>
          <div class="tc-spark">${sparklineSVG(t.series)}</div>
          <div class="tc-trend">
            <span class="muted">v(2025) ${t.recent != null ? (t.recent * 100).toFixed(1) + '%' : '—'}</span>
            <span style="color: ${trendColor};">${trendArrow}
              ${t.trend != null ? Fmt.signed(t.trend * 100, 2) + ' pp/10y' : ''}</span>
          </div>
        </div>`;
    }).join('');

    document.getElementById('topic-grid').innerHTML = html;
    document.querySelectorAll('.topic-card').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        if (state.selected.has(id)) state.selected.delete(id);
        else state.selected.add(id);
        el.classList.toggle('selected', state.selected.has(id));
        rerenderTrajectories();
      });
    });
  }

  function rerenderTrajectories() {
    const selected = topics.filter(t => state.selected.has(t.id));
    if (!selected.length) {
      Plotly.purge('trajectories');
      document.getElementById('trajectories').innerHTML =
        '<div class="empty">Select sub-fields below to populate the chart.</div>';
      return;
    }
    const palette = paletteFor(selected.length);
    const traces = selected.map((t, i) => ({
      type: 'scatter', mode: 'lines',
      x: t.series.years, y: t.series.visibility,
      name: t.name,
      line: { width: 2, color: palette[i] },
      hovertemplate: `<b>${t.name}</b><br>%{x}: %{y:.2%}<extra></extra>`,
    }));
    const layout = PlotTheme.layout({
      height: 440,
      margin: { l: 60, r: 30, t: 30, b: 60 },
      xaxis: Object.assign(PlotTheme.layout().xaxis, { title: { text: 'Year' } }),
      yaxis: Object.assign(PlotTheme.layout().yaxis, {
        title: { text: 'Topical share v_s(t)' }, tickformat: '.1%',
      }),
      legend: { orientation: 'h', y: -0.18 },
      hovermode: 'x unified',
    });
    Plotly.react('trajectories', traces, layout, PlotTheme.config);
  }

  document.querySelectorAll('#sort-chips .chip').forEach(el => {
    el.addEventListener('click', () => {
      state.sort = el.dataset.sort;
      document.querySelectorAll('#sort-chips .chip').forEach(c =>
        c.classList.toggle('active', c.dataset.sort === state.sort));
      rerenderGrid();
    });
  });

  rerenderGrid();
  rerenderTrajectories();
};

/* ----- Helpers ------------------------------------------- */

function recentMean(series, window = 3, lookback = 0) {
  const yrs = series.years || [];
  const vis = series.visibility || [];
  if (!yrs.length) return null;
  const last = yrs[yrs.length - 1];
  const target = last - lookback;
  const out = [];
  for (let i = 0; i < yrs.length; i++) {
    if (yrs[i] > target - window && yrs[i] <= target) {
      if (vis[i] != null && isFinite(vis[i])) out.push(vis[i]);
    }
  }
  return out.length ? out.reduce((a, b) => a + b, 0) / out.length : null;
}

function formatTopTerms(raw, name) {
  if (!raw) return '';
  const terms = String(raw).split('|').map(s => s.trim()).filter(Boolean);
  // Avoid duplicating what's already in the name
  const nameLower = (name || '').toLowerCase();
  const kept = terms.filter(t => !nameLower.includes(t.toLowerCase()) || t.split(' ').length > 1);
  return kept.slice(0, 6).join(', ');
}

function sparklineSVG(series) {
  const yrs = series.years || [];
  const vis = series.visibility || [];
  if (yrs.length < 2) return '';
  const W = 240, H = 28, pad = 1;
  const xs = yrs;
  const ys = vis.map(v => (v == null || !isFinite(v)) ? 0 : v);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const sx = x => ((x - minX) / (maxX - minX || 1)) * (W - 2 * pad) + pad;
  const sy = y => H - pad - ((y - minY) / (maxY - minY || 1)) * (H - 2 * pad);
  const points = xs.map((x, i) => `${sx(x).toFixed(1)},${sy(ys[i]).toFixed(1)}`).join(' ');
  const last = ys[ys.length - 1];
  const first = ys[0];
  const colour = last > first ? 'var(--accent-amber)' :
                 last < first ? 'var(--accent-coral)' : 'var(--text-muted)';
  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <polyline points="${points}" fill="none" stroke="${colour}" stroke-width="1.5"
                stroke-linejoin="round" stroke-linecap="round" opacity="0.9"/>
    </svg>`;
}

function paletteFor(n) {
  // Restrained palette: amber → sage → coral cycle, with brightness variation
  const base = [
    '#d4a574', '#7fb3a8', '#d97757', '#b8956b', '#5f8a82', '#a85a40',
    '#e6c498', '#a3c9c1', '#e89b7a', '#8d6e4d', '#436a64', '#7f3f2c',
  ];
  if (n <= base.length) return base.slice(0, n);
  const out = [];
  for (let i = 0; i < n; i++) out.push(base[i % base.length]);
  return out;
}
