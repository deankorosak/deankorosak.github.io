/* ============================================================
   views/countries.js — Per-country deep dive
   ============================================================ */

window.View_Countries = async function (root) {
  root.innerHTML = `
    <div class="hero" style="padding: 1.5rem 0 1rem; border: none;">
      <div class="eyebrow">Countries</div>
      <h1>Per-country deep dive</h1>
      <p class="subtitle">
        Annual volume, cohort age trajectory, topical specialisation against
        the European mean, and partner structure in each layer.
      </p>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">Country</h2>
        <span class="panel-meta">click a chip to switch the view</span>
      </div>
      <div class="chip-row" id="country-chips"></div>
    </div>

    <div id="country-detail"></div>
  `;

  if (!document.getElementById('countries-styles')) {
    const s = document.createElement('style');
    s.id = 'countries-styles';
    s.textContent = `
      .country-profile {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 1rem; margin: 1rem 0 1.5rem;
      }
      .partners-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
      @media (max-width: 1000px) { .partners-grid { grid-template-columns: 1fr; } }
      .partner-col h4 {
        font-family: var(--font-serif); margin: 0 0 0.4rem 0; font-size: 1.0rem;
      }
      .partner-col .sub {
        font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-muted);
        text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem;
      }
    `;
    document.head.appendChild(s);
  }

  let edges, cohortSlim, topByCountry, annual, topicsOv;
  try {
    [edges, cohortSlim, topByCountry, annual, topicsOv, window._topicMap] = await Promise.all([
      Data.networkCountryEdges().catch(() => null),
      Data.cohortCountrySlim().catch(() => null),
      Data.topicalVisByCountry().catch(() => null),
      Data.annualVolume().catch(() => null),
      Data.topicsOverview().catch(() => null),
      TopicNames.map(),
    ]);
  } catch (err) {
    edges = cohortSlim = topByCountry = annual = topicsOv = null;
  }

  // Union of countries across data sources
  const set = new Set();
  if (edges)         (edges.countries || []).forEach(c => set.add(c));
  if (cohortSlim)    (cohortSlim.rows || []).forEach(r => r.country && set.add(r.country));
  if (topByCountry)  Object.keys(topByCountry.countries || {}).forEach(c => set.add(c));
  if (annual)        Object.keys(annual.countries || {}).forEach(c => set.add(c));
  const countries = [...set].sort();

  if (!countries.length) {
    document.getElementById('country-detail').innerHTML = `
      <div class="data-banner">
        <strong>No country data available.</strong> Re-run
        <code>scripts/export_for_webapp.py</code>.
      </div>`;
    return;
  }

  const state = { country: countries.includes('SI') ? 'SI' : countries[0] };

  // Country chips
  const chipsHost = document.getElementById('country-chips');
  chipsHost.innerHTML = countries.map(c =>
    `<span class="chip ${c === state.country ? 'active' : ''}" data-country="${c}">${c}</span>`
  ).join('');
  chipsHost.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', () => {
      state.country = el.dataset.country;
      chipsHost.querySelectorAll('.chip').forEach(c =>
        c.classList.toggle('active', c.dataset.country === state.country));
      renderDetail();
    });
  });

  function renderDetail() {
    const c = state.country;

    const totalWorks = (annual && annual.countries && annual.countries[c])
      ? annual.countries[c].reduce((s, x) => s + (x || 0), 0)
      : null;
    const firstYear = (annual && annual.years && annual.countries && annual.countries[c])
      ? findFirstYear(annual.years, annual.countries[c])
      : null;

    // Latest cohort stats
    let latestMean = null, latestVar = null;
    if (cohortSlim) {
      const crows = (cohortSlim.rows || []).filter(r => r.country === c);
      crows.sort((a, b) => b.year - a.year);
      if (crows.length && crows[0].mean_age != null) {
        latestMean = crows[0].mean_age;
        latestVar = crows[0].var_age;
      }
    }

    // Strength rank across layers
    const strengthRanks = {};
    if (edges) {
      for (const layer of (edges.layers || ['C', 'T', 'M'])) {
        const list = (edges.edges_by_year_layer[String(latestYear(edges))] || {})[layer] || [];
        const directed = layer === 'M';
        const strengthByCountry = new Map();
        for (const [a, b, w] of list) {
          if (directed) {
            strengthByCountry.set(a, (strengthByCountry.get(a) || 0) + w);
          } else {
            strengthByCountry.set(a, (strengthByCountry.get(a) || 0) + w);
            strengthByCountry.set(b, (strengthByCountry.get(b) || 0) + w);
          }
        }
        const ranked = [...strengthByCountry.entries()].sort((x, y) => y[1] - x[1]);
        const rank = ranked.findIndex(([cc]) => cc === c) + 1;
        strengthRanks[layer] = { rank, total: ranked.length, value: strengthByCountry.get(c) || 0 };
      }
    }

    const host = document.getElementById('country-detail');
    host.innerHTML = `
      <div class="panel">
        <div class="panel-header">
          <h2 style="margin: 0; font-size: 1.6rem;">
            <span class="amber mono" style="margin-right: 0.4em;">${c}</span>
            <span style="color: var(--text-secondary); font-weight: 500;">profile</span>
          </h2>
        </div>
        <div class="country-profile">
          <div class="stat"><div class="stat-value">${totalWorks != null ? totalWorks.toLocaleString() : '—'}</div>
            <div class="stat-label">In-scope works</div></div>
          <div class="stat"><div class="stat-value">${firstYear ?? '—'}</div>
            <div class="stat-label">First active year</div></div>
          <div class="stat"><div class="stat-value">${Fmt.num(latestMean, 2)}</div>
            <div class="stat-label">Mean career age (latest)</div></div>
          <div class="stat"><div class="stat-value">${strengthRanks.C ? `#${strengthRanks.C.rank}` : '—'}</div>
            <div class="stat-label">Collab. rank (EU+)</div></div>
          <div class="stat"><div class="stat-value">${strengthRanks.T ? `#${strengthRanks.T.rank}` : '—'}</div>
            <div class="stat-label">Topical rank</div></div>
          <div class="stat"><div class="stat-value">${strengthRanks.M ? `#${strengthRanks.M.rank}` : '—'}</div>
            <div class="stat-label">Mobility rank</div></div>
        </div>
      </div>

      <div class="grid two">
        <div class="panel">
          <div class="panel-header">
            <h3 style="margin: 0;">Annual volume</h3>
          </div>
          <div id="c-volume" class="plot-container" style="min-height: 320px;"></div>
        </div>
        <div class="panel">
          <div class="panel-header">
            <h3 style="margin: 0;">Mean career age</h3>
          </div>
          <div id="c-cohort" class="plot-container" style="min-height: 320px;"></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h3 style="margin: 0;">Topical specialisation vs. European mean</h3>
          <span class="panel-meta">2024 visibility share; positive bars = over-represented</span>
        </div>
        <div id="c-topics" class="plot-container" style="min-height: 420px;"></div>
        <p class="muted" style="font-size: 0.85rem; margin-top: 0.5rem;">
          Per-sub-field deviation of country share from the European cross-country
          mean at the latest year. The country is over- or under-represented in
          each sub-field by the magnitude shown.
        </p>
      </div>

      <div class="panel">
        <div class="panel-header">
          <h2 style="margin: 0;">Partners in each layer</h2>
          <span class="panel-meta">latest year, top weighted partners</span>
        </div>
        <div class="partners-grid">
          <div class="partner-col">
            <h4>Collaboration</h4>
            <div class="sub">co-authorship</div>
            <div id="partners-C"></div>
          </div>
          <div class="partner-col">
            <h4>Topical similarity</h4>
            <div class="sub">institutional topic mix</div>
            <div id="partners-T"></div>
          </div>
          <div class="partner-col">
            <h4>Mobility</h4>
            <div class="sub">directed author transitions</div>
            <div id="partners-M"></div>
          </div>
        </div>
      </div>
    `;

    drawVolume(c);
    drawCohort(c);
    drawTopics(c);
    drawPartners(c);
  }

  function drawVolume(c) {
    if (!annual || !annual.years || !(annual.countries || {})[c]) {
      document.getElementById('c-volume').innerHTML =
        '<div class="empty">No annual volume available.</div>';
      return;
    }
    const trace = {
      type: 'scatter', mode: 'lines',
      x: annual.years, y: annual.countries[c],
      fill: 'tozeroy', line: { color: '#d4a574', width: 2 },
      fillcolor: 'rgba(212,165,116,0.20)',
      hovertemplate: `<b>${c}</b><br>%{x}: %{y} works<extra></extra>`,
    };
    const layout = PlotTheme.layout({
      height: 320, margin: { l: 50, r: 20, t: 20, b: 50 },
      xaxis: Object.assign(PlotTheme.layout().xaxis, { title: { text: 'Year' } }),
      yaxis: Object.assign(PlotTheme.layout().yaxis, { title: { text: 'In-scope works' } }),
    });
    Plotly.react('c-volume', [trace], layout, PlotTheme.config);
  }

  function drawCohort(c) {
    if (!cohortSlim) {
      document.getElementById('c-cohort').innerHTML =
        '<div class="empty">No cohort data.</div>';
      return;
    }
    const rows = (cohortSlim.rows || []).filter(r => r.country === c)
                                        .sort((a, b) => a.year - b.year);
    if (!rows.length) {
      document.getElementById('c-cohort').innerHTML =
        '<div class="empty">No cohort series for this country.</div>';
      return;
    }
    const xs = rows.map(r => r.year);
    const mean = rows.map(r => r.mean_age);
    const upper = rows.map(r => (r.mean_age != null && r.var_age != null)
                                ? r.mean_age + Math.sqrt(Math.max(r.var_age, 0)) : null);
    const lower = rows.map(r => (r.mean_age != null && r.var_age != null)
                                ? r.mean_age - Math.sqrt(Math.max(r.var_age, 0)) : null);
    const traces = [
      // Band: upper, then lower with fill
      {
        type: 'scatter', mode: 'lines',
        x: xs, y: upper, line: { width: 0 }, showlegend: false,
        hoverinfo: 'skip',
      },
      {
        type: 'scatter', mode: 'lines',
        x: xs, y: lower, line: { width: 0 },
        fill: 'tonexty', fillcolor: 'rgba(127,179,168,0.15)',
        showlegend: false, hoverinfo: 'skip',
      },
      {
        type: 'scatter', mode: 'lines',
        x: xs, y: mean,
        line: { color: '#7fb3a8', width: 2 },
        name: 'mean',
        hovertemplate: `<b>${c}</b><br>%{x}: %{y:.2f} yr<extra></extra>`,
      },
    ];
    const layout = PlotTheme.layout({
      height: 320, margin: { l: 50, r: 20, t: 20, b: 50 },
      showlegend: false,
      xaxis: Object.assign(PlotTheme.layout().xaxis, { title: { text: 'Year' } }),
      yaxis: Object.assign(PlotTheme.layout().yaxis, { title: { text: 'Mean career age (yr)' } }),
    });
    Plotly.react('c-cohort', traces, layout, PlotTheme.config);
  }

  function drawTopics(c) {
    const host = document.getElementById('c-topics');
    if (!topByCountry) {
      host.innerHTML = `
        <div class="data-banner" style="margin: 0;">
          <strong>topical_visibility_by_country.json missing.</strong>
          Re-run the export script.
        </div>`;
      return;
    }
    const allCountries = Object.keys(topByCountry.countries || {});
    if (!allCountries.length) {
      host.innerHTML = '<div class="empty">No per-country topical data.</div>';
      return;
    }

    // Pick the latest year present for this country
    const cd = topByCountry.countries[c];
    if (!cd) {
      host.innerHTML = `<div class="empty">No topical data for ${c}.</div>`;
      return;
    }
    const yearIdx = cd.years.length - 1;
    const year = cd.years[yearIdx];

    // For each sub_field, compute the country share at the latest year and
    // the European cross-country mean at the same year.
    const subIds = Object.keys(cd.by_subfield);
    const sortedSubs = subIds.slice().sort((a, b) => {
      const na = Number(a), nb = Number(b);
      return isFinite(na) && isFinite(nb) ? na - nb : 0;
    });

    const data = sortedSubs.map(sf => {
      const cVal = cd.by_subfield[sf][yearIdx];
      // European mean: average over all countries that have this sub_field at this year
      let acc = 0, n = 0;
      for (const cc of allCountries) {
        const od = topByCountry.countries[cc];
        const yi = (od.years || []).indexOf(year);
        if (yi < 0) continue;
        const v = (od.by_subfield[sf] || [])[yi];
        if (v != null && isFinite(v)) { acc += v; n++; }
      }
      const euMean = n ? acc / n : null;
      return {
        sf,
        name: TopicNames.label(sf, `Topic ${sf}`),
        c_val: cVal,
        eu_mean: euMean,
        delta: (cVal != null && euMean != null) ? cVal - euMean : null,
      };
    });

    const withDelta = data.filter(d => d.delta != null);
    withDelta.sort((a, b) => b.delta - a.delta);
    // Show top-15 over- and under-represented
    const top  = withDelta.slice(0, 10);
    const bot  = withDelta.slice(-10).reverse();
    const show = [...top, ...bot.filter(b => !top.includes(b))];

    // Sort the display by signed delta for the bar chart
    show.sort((a, b) => a.delta - b.delta);
    const labels = show.map(d => d.name);
    const deltas = show.map(d => d.delta);
    const colors = deltas.map(v => v >= 0 ? '#d4a574' : '#d97757');
    const hover  = show.map(d =>
      `<b>${d.name}</b><br>${c}: ${Fmt.pct(d.c_val, 1)}<br>` +
      `EU+ mean: ${Fmt.pct(d.eu_mean, 1)}<br>` +
      `Δ = ${Fmt.signed(d.delta * 100, 2)} pp`
    );

    const trace = {
      type: 'bar', orientation: 'h',
      x: deltas, y: labels,
      marker: { color: colors, line: { width: 0 } },
      hovertemplate: '%{customdata}<extra></extra>',
      customdata: hover,
    };
    const layout = PlotTheme.layout({
      height: Math.max(380, 22 * show.length + 60),
      margin: { l: 260, r: 30, t: 10, b: 50 },
      xaxis: Object.assign(PlotTheme.layout().xaxis, {
        title: { text: `Visibility share deviation (${c} − EU+ mean), ${year}` },
        tickformat: '.1%', zeroline: true, zerolinewidth: 1,
      }),
      yaxis: Object.assign(PlotTheme.layout().yaxis, { automargin: true }),
      bargap: 0.2,
    });
    Plotly.react('c-topics', [trace], layout, PlotTheme.config);
  }

  function drawPartners(c) {
    if (!edges) {
      for (const layer of ['C', 'T', 'M']) {
        const host = document.getElementById(`partners-${layer}`);
        if (host) host.innerHTML = '<div class="empty">No network data.</div>';
      }
      return;
    }
    const year = String(latestYear(edges));
    for (const layer of (edges.layers || ['C', 'T', 'M'])) {
      const host = document.getElementById(`partners-${layer}`);
      if (!host) continue;
      const list = (edges.edges_by_year_layer[year] || {})[layer] || [];
      const directed = layer === 'M';
      const out = [], inc = [];
      for (const [a, b, w] of list) {
        if (directed) {
          if (a === c) out.push([b, w]);
          if (b === c) inc.push([a, w]);
        } else {
          if (a === c) out.push([b, w]);
          else if (b === c) out.push([a, w]);
        }
      }
      out.sort((x, y) => y[1] - x[1]);
      inc.sort((x, y) => y[1] - x[1]);
      const maxW = Math.max(...out.map(x => x[1]), ...inc.map(x => x[1]), 1e-9);
      let html = '';
      if (directed) {
        html += `<div class="dir-tag">Outgoing</div>
          <div class="partner-list">${out.slice(0, 7).map(([p, w]) => `
            <div class="partner-row dir-out">
              <span class="pcode">${c} → ${p}</span>
              <span class="pbar"><span style="width: ${(100 * w / maxW).toFixed(1)}%;"></span></span>
              <span class="pw">${Fmt.num(w, 2)}</span>
            </div>`).join('') || '<div class="empty" style="padding: 0.5rem;">none</div>'}</div>
          <div class="dir-tag" style="margin-top: 0.8rem;">Incoming</div>
          <div class="partner-list">${inc.slice(0, 7).map(([p, w]) => `
            <div class="partner-row dir-in">
              <span class="pcode">${p} → ${c}</span>
              <span class="pbar"><span style="width: ${(100 * w / maxW).toFixed(1)}%;"></span></span>
              <span class="pw">${Fmt.num(w, 2)}</span>
            </div>`).join('') || '<div class="empty" style="padding: 0.5rem;">none</div>'}</div>`;
      } else {
        html += `<div class="partner-list">${out.slice(0, 10).map(([p, w]) => `
          <div class="partner-row">
            <span class="pcode">${c} ↔ ${p}</span>
            <span class="pbar"><span style="width: ${(100 * w / maxW).toFixed(1)}%;"></span></span>
            <span class="pw">${Fmt.num(w, 2)}</span>
          </div>`).join('') || '<div class="empty" style="padding: 0.5rem;">none</div>'}</div>`;
      }
      host.innerHTML = html;
    }
  }

  renderDetail();
};

function findFirstYear(years, counts) {
  for (let i = 0; i < years.length; i++) {
    if ((counts[i] || 0) > 0) return years[i];
  }
  return null;
}

function latestYear(edges) {
  const ys = edges.years || [];
  return ys.length ? ys[ys.length - 1] : null;
}
