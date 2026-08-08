/* ============================================================
   views/network.js — Country-aggregated multilayer network
   Two views over the same data: matrix and circular arc diagram.
   ============================================================ */

const LAYER_LABELS = {
  C: 'Collaboration',
  T: 'Topical similarity',
  M: 'Mobility (directed)',
};

window.View_Network = async function (root) {
  root.innerHTML = `
    <div class="hero" style="padding: 1.5rem 0 1rem; border: none;">
      <div class="eyebrow">Network</div>
      <h1>Multilayer ecosystem, country-aggregated view</h1>
      <p class="subtitle">
        Institution-level collaboration, topical similarity, and mobility
        edges aggregated to country pairs; per-year structural measures
        across the supra-adjacency.
      </p>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">Snapshot controls</h2>
        <span class="panel-meta" id="snapshot-info"></span>
      </div>
      <div class="controls" id="controls"></div>
    </div>

    <div class="grid split">
      <div class="panel">
        <div class="panel-header">
          <h3 style="margin: 0;" id="vis-title">Country × country edge weights</h3>
          <div class="view-toggle" id="vis-toggle">
            <span class="chip active" data-mode="matrix">Matrix</span>
            <span class="chip" data-mode="arc">Diagram</span>
          </div>
        </div>
        <div id="vis-matrix" class="plot-container" style="min-height: 540px;"></div>
        <div id="vis-arc"    class="plot-container" style="min-height: 540px; display: none;"></div>
        <p class="muted" id="vis-caption" style="font-size: 0.85rem; margin-top: 0.5rem;"></p>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3 style="margin: 0;" id="side-title">Top connections</h3>
        </div>
        <div id="side-panel"></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">Multilayer measures over time</h2>
        <span class="panel-meta">click chips to toggle</span>
      </div>
      <div class="chip-row" id="measure-chips"></div>
      <div id="measures-plot" class="plot-container" style="min-height: 360px;"></div>
      <p class="muted" style="font-size: 0.85rem; margin-top: 0.5rem;">
        Per-year global summary across all three layers and the multilayer
        construction with inter-layer coupling ω = 0.4472. Modularity is
        the generalised multilayer modularity Q<sub>ml</sub>.
      </p>
    </div>

    <p class="muted" style="font-size: 0.85rem; margin-top: 1rem;">
      Institutional drill-down (year-sliced, top-N by multilayer strength)
      remains on the iteration-list; the country-level view above captures
      the structural-evolution story the paper rests on.
    </p>
  `;

  if (!document.getElementById('network-styles')) {
    const s = document.createElement('style');
    s.id = 'network-styles';
    s.textContent = `
      .controls { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: center; }
      .controls .field { display: flex; flex-direction: column; gap: 0.3rem; min-width: 260px; }
      .controls .field-label {
        color: var(--text-muted); font-family: var(--font-mono);
        font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em;
      }
      .controls input[type=range] {
        -webkit-appearance: none; appearance: none;
        background: transparent; width: 100%; height: 22px; cursor: pointer;
      }
      .controls input[type=range]::-webkit-slider-runnable-track {
        height: 4px; background: var(--border); border-radius: 2px;
      }
      .controls input[type=range]::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 16px; height: 16px; background: var(--accent-amber);
        border-radius: 50%; margin-top: -6px;
        border: 2px solid var(--bg-base);
      }
      .controls input[type=range]::-moz-range-track {
        height: 4px; background: var(--border); border-radius: 2px;
      }
      .controls input[type=range]::-moz-range-thumb {
        width: 16px; height: 16px; background: var(--accent-amber);
        border-radius: 50%; border: 2px solid var(--bg-base);
      }
      .year-readout {
        font-family: var(--font-mono); font-size: 1.2rem;
        color: var(--accent-amber); font-weight: 600;
      }
      .layer-chips, .view-toggle { display: flex; gap: 0.4rem; }
      .partner-list { display: flex; flex-direction: column; gap: 0.4rem; }
      .partner-row {
        display: grid; grid-template-columns: auto 1fr auto; gap: 0.6rem;
        padding: 0.4rem 0; border-bottom: 1px solid var(--border-soft);
        align-items: center;
      }
      .partner-row:last-child { border-bottom: none; }
      .partner-row .pcode {
        font-family: var(--font-mono); font-weight: 500;
        color: var(--text-primary); width: 2.5em;
      }
      .partner-row .pbar {
        height: 4px; background: var(--bg-elev); border-radius: 2px; position: relative;
      }
      .partner-row .pbar > span {
        position: absolute; left: 0; top: 0; height: 100%;
        background: var(--accent-amber); border-radius: 2px;
      }
      .partner-row .pw {
        font-family: var(--font-mono); font-size: 0.83rem;
        color: var(--text-secondary); justify-self: end;
      }
      .partner-row.dir-out .pbar > span { background: var(--accent-amber); }
      .partner-row.dir-in  .pbar > span { background: var(--accent-sage); }
      .dir-tag {
        font-family: var(--font-mono); font-size: 0.65rem; color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.06em;
      }
      .arc-svg { width: 100%; height: auto; display: block; background: var(--bg-inset); }
      .arc-svg .arc-edge { transition: opacity 0.15s ease, stroke-width 0.15s ease; }
      .arc-svg .arc-edge.dim { opacity: 0.06 !important; }
      .arc-svg .arc-edge.hot { opacity: 0.95 !important; }
      .arc-svg .arc-node circle { transition: r 0.15s ease; }
      .arc-svg .arc-node.selected circle { fill: var(--accent-amber); }
      .arc-svg .arc-node.selected text { fill: var(--accent-amber); font-weight: 600; }
    `;
    document.head.appendChild(s);
  }

  let edges, measures;
  try {
    [edges, measures] = await Promise.all([
      Data.networkCountryEdges().catch(() => null),
      Data.networkMeasures().catch(() => null),
    ]);
  } catch (err) {
    edges = null; measures = null;
  }

  if (!edges || !edges.years || !edges.years.length) {
    document.getElementById('controls').innerHTML = '';
    document.getElementById('vis-matrix').innerHTML =
      `<div class="data-banner" style="margin: 1rem;">
        <strong>Network data not exported yet.</strong>
        Run <code>uv run python scripts/export_for_webapp.py --out-dir webapp/data</code>
        in the data repository.
      </div>`;
    document.getElementById('side-panel').innerHTML =
      '<div class="empty">Awaiting network export.</div>';
  } else {
    setupNetwork(edges);
  }

  if (measures && Object.keys(measures.by_year || {}).length) {
    setupMeasures(measures);
  } else {
    document.getElementById('measures-plot').innerHTML =
      '<div class="empty">Measures will appear after the network export runs.</div>';
    document.getElementById('measure-chips').innerHTML = '';
  }
};

/* ============================================================
   Matrix + arc diagram of country edges (same data, two views)
   ============================================================ */
function setupNetwork(edges) {
  const years = edges.years;
  const layers = edges.layers || ['C', 'T', 'M'];
  const countries = (edges.countries || []).slice().sort();

  const state = {
    year: years[years.length - 1],
    layer: 'C',
    country: null,
    mode: 'matrix',
  };

  // Controls UI
  const controls = document.getElementById('controls');
  controls.innerHTML = `
    <div class="field" style="flex: 1; min-width: 320px;">
      <span class="field-label">
        Year &nbsp; <span class="year-readout" id="year-readout">${state.year}</span>
      </span>
      <input type="range" id="year-slider"
             min="${years[0]}" max="${years[years.length - 1]}"
             step="1" value="${state.year}"/>
    </div>
    <div class="field" style="min-width: 280px;">
      <span class="field-label">Layer</span>
      <div class="layer-chips" id="layer-chips">
        ${layers.map(l => `
          <span class="chip ${l === state.layer ? 'active' : ''}" data-layer="${l}"
                title="${App.escapeHtml(LAYER_LABELS[l] || l)}">
            ${l} &nbsp; ${App.escapeHtml(LAYER_LABELS[l] || l)}
          </span>`).join('')}
      </div>
    </div>
  `;

  document.getElementById('year-slider').addEventListener('input', (e) => {
    state.year = Number(e.target.value);
    document.getElementById('year-readout').textContent = state.year;
    redraw();
  });
  document.querySelectorAll('#layer-chips .chip').forEach(el => {
    el.addEventListener('click', () => {
      state.layer = el.dataset.layer;
      document.querySelectorAll('#layer-chips .chip').forEach(c =>
        c.classList.toggle('active', c.dataset.layer === state.layer));
      redraw();
    });
  });
  document.querySelectorAll('#vis-toggle .chip').forEach(el => {
    el.addEventListener('click', () => {
      state.mode = el.dataset.mode;
      document.querySelectorAll('#vis-toggle .chip').forEach(c =>
        c.classList.toggle('active', c.dataset.mode === state.mode));
      document.getElementById('vis-matrix').style.display =
        state.mode === 'matrix' ? '' : 'none';
      document.getElementById('vis-arc').style.display =
        state.mode === 'arc' ? '' : 'none';
      redraw();
    });
  });

  function currentEdges() {
    return (edges.edges_by_year_layer[String(state.year)] || {})[state.layer] || [];
  }

  function redraw() {
    const edgeList = currentEdges();
    const directed = state.layer === 'M';

    document.getElementById('snapshot-info').textContent =
      `${state.year} · ${LAYER_LABELS[state.layer] || state.layer}` +
      ` · ${edgeList.length} country-pair edges`;
    document.getElementById('vis-caption').innerHTML = state.mode === 'matrix'
      ? `Click a row to focus on a country. Heat scaled to the snapshot maximum;
         ${directed ? 'directed (row → column)' : 'symmetric'}.`
      : `Curves connect countries; thicker and brighter = higher edge weight.
         ${directed ? 'Arrows show direction of mobility.' : ''}
         Click a country to highlight its ties.`;

    if (state.mode === 'matrix') {
      drawMatrix(edgeList, directed);
    } else {
      drawArc(edgeList, directed);
    }
    renderSidePanel();
  }

  // --- Matrix view -----------------------------------------
  function drawMatrix(edgeList, directed) {
    const idx = new Map(countries.map((c, i) => [c, i]));
    const z = countries.map(() => countries.map(() => null));
    let maxW = 0;
    for (const [a, b, w] of edgeList) {
      if (w > maxW) maxW = w;
      const i = idx.get(a), j = idx.get(b);
      if (i == null || j == null) continue;
      z[i][j] = w;
      if (!directed) z[j][i] = w;
    }
    const text = countries.map((a, i) => countries.map((b, j) => {
      const w = z[i][j];
      if (w == null) return '';
      return directed ? `${a} → ${b}<br>w = ${Fmt.num(w, 2)}`
                      : `${a} ↔ ${b}<br>w = ${Fmt.num(w, 2)}`;
    }));
    const colorscale = [
      [0.0, '#0a0d12'], [0.05, '#1c2128'], [0.30, '#5f4831'],
      [0.60, '#a8825a'], [1.0, '#f0d5a8'],
    ];
    const trace = {
      type: 'heatmap', z, text,
      x: countries, y: countries,
      colorscale,
      zmin: 0, zmax: maxW || 1,
      hoverongaps: false,
      hovertemplate: '%{text}<extra></extra>',
      colorbar: {
        title: { text: 'w', font: { color: PlotTheme.colors.muted } },
        tickfont: { color: PlotTheme.colors.muted },
        outlinewidth: 0, thickness: 10, len: 0.7,
      },
    };
    const layout = PlotTheme.layout({
      height: Math.max(540, 18 * countries.length + 80),
      margin: { l: 60, r: 30, t: 30, b: 60 },
      xaxis: Object.assign(PlotTheme.layout().xaxis, {
        side: 'top', tickangle: -45, automargin: true,
        scaleanchor: 'y', constrain: 'domain',
      }),
      yaxis: Object.assign(PlotTheme.layout().yaxis, {
        autorange: 'reversed', automargin: true,
      }),
    });
    Plotly.react('vis-matrix', [trace], layout, PlotTheme.config);
    document.getElementById('vis-matrix').on('plotly_click', (data) => {
      if (!data.points || !data.points.length) return;
      state.country = data.points[0].y;
      renderSidePanel();
      if (state.mode === 'arc') drawArc(currentEdges(), state.layer === 'M');
    });
  }

  // --- Arc diagram view ------------------------------------
  function drawArc(edgeList, directed) {
    const W = 720, H = 720;
    const cx = W / 2, cy = H / 2;
    const r  = 270;
    const labelR = r + 22;
    const N = countries.length;
    const ang = (i) => (i / N) * Math.PI * 2 - Math.PI / 2;
    const pos = countries.map((c, i) => {
      const a = ang(i);
      return {
        c, a,
        x: cx + r * Math.cos(a),
        y: cy + r * Math.sin(a),
        lx: cx + labelR * Math.cos(a),
        ly: cy + labelR * Math.sin(a),
      };
    });
    const posMap = new Map(pos.map(p => [p.c, p]));
    const maxW = edgeList.length ? edgeList[0][2] : 1;
    const selected = state.country;

    const edgesSvg = edgeList.map(([a, b, w]) => {
      const pa = posMap.get(a), pb = posMap.get(b);
      if (!pa || !pb) return '';
      const t = w / maxW;
      const width   = (0.4 + t * 3.6).toFixed(2);
      const opacity = (0.18 + t * 0.6).toFixed(2);
      const color = directed ? '#d97757' : '#7fb3a8';
      const involves = selected && (a === selected || b === selected);
      const cls = selected ? (involves ? 'arc-edge hot' : 'arc-edge dim') : 'arc-edge';
      const marker = directed ? 'url(#arc-arrow)' : '';
      const title = directed ? `${a} → ${b}: ${w.toFixed(2)}`
                             : `${a} ↔ ${b}: ${w.toFixed(2)}`;
      return `<path class="${cls}"
                    d="M ${pa.x.toFixed(1)} ${pa.y.toFixed(1)} Q ${cx} ${cy} ${pb.x.toFixed(1)} ${pb.y.toFixed(1)}"
                    stroke="${color}" stroke-width="${width}" fill="none"
                    opacity="${opacity}"
                    ${marker ? `marker-end="${marker}"` : ''}>
                <title>${title}</title>
              </path>`;
    }).join('');

    const nodesSvg = pos.map(p => {
      const onRight = Math.cos(p.a) > 0;
      const rotDeg  = (p.a * 180 / Math.PI) + (onRight ? 0 : 180);
      const anchor  = onRight ? 'start' : 'end';
      const isSel   = selected === p.c;
      return `<g class="arc-node ${isSel ? 'selected' : ''}" data-country="${p.c}">
        <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${isSel ? 5 : 3}"
                fill="${isSel ? '#d4a574' : '#7fb3a8'}" opacity="0.9"/>
        <g transform="translate(${p.lx.toFixed(1)} ${p.ly.toFixed(1)}) rotate(${rotDeg.toFixed(1)})">
          <text x="0" y="3" text-anchor="${anchor}"
                font-family="JetBrains Mono, ui-monospace, monospace"
                font-size="11"
                fill="${isSel ? '#d4a574' : '#b1bac4'}">
            ${p.c}
          </text>
        </g>
      </g>`;
    }).join('');

    const svg = `
      <svg class="arc-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arc-arrow" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#d97757" opacity="0.8"/>
          </marker>
        </defs>
        <g>${edgesSvg}</g>
        <g>${nodesSvg}</g>
      </svg>`;
    const host = document.getElementById('vis-arc');
    host.innerHTML = svg;
    host.querySelectorAll('.arc-node').forEach(el => {
      el.style.cursor = 'pointer';
      el.addEventListener('click', () => {
        const c = el.dataset.country;
        state.country = (state.country === c) ? null : c;
        drawArc(currentEdges(), directed);
        renderSidePanel();
      });
    });
  }

  // --- Side panel ------------------------------------------
  function renderSidePanel() {
    const edgeList = currentEdges();
    const host = document.getElementById('side-panel');
    const title = document.getElementById('side-title');
    const directed = state.layer === 'M';

    if (!state.country) {
      title.textContent = 'Top country-pair edges';
      const top = edgeList.slice(0, 15);
      const max = top[0] ? top[0][2] : 1;
      host.innerHTML = `
        <div class="muted" style="font-size: 0.83rem; margin-bottom: 0.6rem;">
          Click a row (matrix) or a node (diagram) to focus on a single country.
        </div>
        <div class="partner-list">${top.map(([a, b, w]) => `
          <div class="partner-row">
            <span class="pcode">${a} ${directed ? '→' : '↔'} ${b}</span>
            <span class="pbar"><span style="width: ${(100 * w / max).toFixed(1)}%;"></span></span>
            <span class="pw">${Fmt.num(w, 2)}</span>
          </div>`).join('')}
        </div>`;
      return;
    }

    const c = state.country;
    title.innerHTML = `<span class="amber mono">${c}</span> &nbsp; partners
      <span class="muted" style="font-size: 0.7em; margin-left: 0.4em;">
        ${state.year} · ${LAYER_LABELS[state.layer] || state.layer}
      </span>`;

    let out = [], inc = [], strength = 0;
    for (const [a, b, w] of edgeList) {
      if (directed) {
        if (a === c) { out.push([b, w]); strength += w; }
        if (b === c) { inc.push([a, w]); }
      } else {
        if (a === c) out.push([b, w]);
        else if (b === c) out.push([a, w]);
        if (a === c || b === c) strength += w;
      }
    }
    out.sort((x, y) => y[1] - x[1]);
    inc.sort((x, y) => y[1] - x[1]);
    const maxW = Math.max(...out.map(x => x[1]), ...inc.map(x => x[1]), 1e-9);

    let html = `
      <div class="muted" style="font-size: 0.83rem; margin-bottom: 0.8rem;">
        Layer strength: <span class="mono" style="color: var(--text-primary);">${Fmt.num(strength, 2)}</span>
        &nbsp;·&nbsp; <a href="#" onclick="event.preventDefault(); window._clearNetCountry();">clear</a>
      </div>`;
    if (directed) {
      html += `<div class="dir-tag">Outgoing</div>
        <div class="partner-list">${out.slice(0, 10).map(([p, w]) => `
          <div class="partner-row dir-out">
            <span class="pcode">${c} → ${p}</span>
            <span class="pbar"><span style="width: ${(100 * w / maxW).toFixed(1)}%;"></span></span>
            <span class="pw">${Fmt.num(w, 2)}</span>
          </div>`).join('') || '<div class="empty" style="padding: 0.5rem;">none</div>'}</div>
        <div class="dir-tag" style="margin-top: 1rem;">Incoming</div>
        <div class="partner-list">${inc.slice(0, 10).map(([p, w]) => `
          <div class="partner-row dir-in">
            <span class="pcode">${p} → ${c}</span>
            <span class="pbar"><span style="width: ${(100 * w / maxW).toFixed(1)}%;"></span></span>
            <span class="pw">${Fmt.num(w, 2)}</span>
          </div>`).join('') || '<div class="empty" style="padding: 0.5rem;">none</div>'}</div>`;
    } else {
      html += `<div class="partner-list">${out.slice(0, 15).map(([p, w]) => `
        <div class="partner-row">
          <span class="pcode">${c} ↔ ${p}</span>
          <span class="pbar"><span style="width: ${(100 * w / maxW).toFixed(1)}%;"></span></span>
          <span class="pw">${Fmt.num(w, 2)}</span>
        </div>`).join('') || '<div class="empty" style="padding: 0.5rem;">none</div>'}</div>`;
    }
    host.innerHTML = html;
  }

  window._clearNetCountry = () => {
    state.country = null;
    if (state.mode === 'arc') drawArc(currentEdges(), state.layer === 'M');
    renderSidePanel();
  };

  redraw();
}

/* ============================================================
   Multilayer measures over time
   ============================================================ */
function setupMeasures(measures) {
  const byYear = measures.by_year || {};
  const allKeys = Object.keys(byYear);
  if (!allKeys.length) {
    document.getElementById('measures-plot').innerHTML =
      '<div class="empty">No measure series found.</div>';
    return;
  }

  const priority = [
    'ml_modularity', 'ml_modularity_multilayer', 'ml_Q_multilayer', 'ml_Q_ml',
    'ml_nmi_C_T', 'ml_nmi_C_M', 'ml_nmi_T_M',
    'net_density_C', 'net_density_T', 'net_density_M',
    'glob_density_C', 'glob_density_T', 'glob_density_M',
  ];
  const initialSelection = new Set(priority.filter(k => k in byYear).slice(0, 4));
  if (!initialSelection.size) {
    for (const k of allKeys.slice(0, 4)) initialSelection.add(k);
  }

  const chipsHost = document.getElementById('measure-chips');
  const sorted = allKeys.slice().sort();
  chipsHost.innerHTML = sorted.map(k => `
    <span class="chip ${initialSelection.has(k) ? 'active' : ''}" data-key="${k}"
          title="${App.escapeHtml(k)}">${App.escapeHtml(prettyKey(k))}</span>`).join('');

  function redraw() {
    const active = sorted.filter(k =>
      chipsHost.querySelector(`[data-key="${CSS.escape(k)}"]`).classList.contains('active'));
    if (!active.length) {
      Plotly.purge('measures-plot');
      document.getElementById('measures-plot').innerHTML =
        '<div class="empty">Select one or more measures.</div>';
      return;
    }
    const palette = ['#d4a574', '#7fb3a8', '#d97757', '#b8956b', '#5f8a82',
                     '#a85a40', '#e6c498', '#a3c9c1', '#e89b7a'];
    const traces = active.map((k, i) => {
      const s = byYear[k];
      return {
        type: 'scatter', mode: 'lines+markers',
        x: s.years, y: s.values,
        name: prettyKey(k),
        line: { width: 1.8, color: palette[i % palette.length] },
        marker: { size: 4, color: palette[i % palette.length] },
        hovertemplate: `<b>${prettyKey(k)}</b><br>%{x}: %{y:.3f}<extra></extra>`,
      };
    });
    const layout = PlotTheme.layout({
      height: 380,
      margin: { l: 60, r: 30, t: 20, b: 60 },
      xaxis: Object.assign(PlotTheme.layout().xaxis, {
        title: { text: 'Year' }, tickformat: 'd',
      }),
      yaxis: Object.assign(PlotTheme.layout().yaxis, {
        title: { text: 'Value' },
      }),
      legend: { orientation: 'h', y: -0.18 },
      hovermode: 'x unified',
    });
    Plotly.react('measures-plot', traces, layout, PlotTheme.config);
  }

  chipsHost.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('active');
      redraw();
    });
  });

  redraw();
}

function prettyKey(k) {
  return k
    .replace(/^(ml|net|glob)_/, m => m[0].toUpperCase() + m.slice(1, -1) + ' ')
    .replace(/_/g, ' ');
}
