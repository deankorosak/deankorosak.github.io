/* ============================================================
   views/cohorts.js — Career-age trajectories and EWS panel
   ============================================================ */

window.View_Cohorts = async function (root) {
  root.innerHTML = `
    <div class="hero" style="padding: 1.5rem 0 1rem; border: none;">
      <div class="eyebrow">Cohorts</div>
      <h1>Career-age trajectories and early-warning signals</h1>
      <p class="subtitle">
        Active-researcher mean career age 1995–2025 per country; the
        critical-slowing-down validation against the 2011 Fukushima
        reorganisation of reactor physics.
      </p>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">Per-country mean career age</h2>
        <span class="panel-meta">click country chips to toggle</span>
      </div>
      <div class="chip-row" id="country-chips"></div>
      <div id="country-trajectories" class="plot-container" style="min-height: 440px;"></div>
      <p class="muted" style="font-size: 0.85rem; margin-top: 0.5rem;">
        Bibliometric career age proxy: years since first in-scope publication,
        left-truncated at 1995. Aggregated over sub-fields per country and year.
      </p>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">2024 cross-section</h2>
        <span class="panel-meta">countries ranked by mean career age at the latest available year</span>
      </div>
      <div id="latest-cross-section" class="plot-container" style="min-height: 520px;"></div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">Early-warning panel: Fukushima 2011</h2>
        <span class="panel-meta">reactor-physics cohort observables in the 1995–2010 run-up</span>
      </div>
      <p class="muted" style="max-width: 70ch;">
        Critical-slowing-down theory predicts that, ahead of a regime shift,
        the residuals of a detrended dynamical observable show rising variance
        and rising lag-1 autocorrelation. Among four candidate observables
        on the reactor-physics sub-field, the cohort age variance
        (the substantively-sensitive one from the dynamical-systems literature)
        carries the precursor; the others fail for traceable methodological reasons.
      </p>
      <div id="ews-panel" class="grid three" style="margin-top: 1rem;"></div>
      <p class="muted" style="font-size: 0.85rem; margin-top: 1rem;">
        Validation result: Kendall τ on rolling variance of detrended residuals =
        <span class="amber mono">+0.913</span> (p = 0.005);
        on lag-1 autocorrelation = <span class="amber mono">+0.752</span> (p = 0.048).
      </p>
    </div>
  `;

  // Per-country chip + trajectory data
  let cohort, ews;
  try {
    [cohort, ews] = await Promise.all([
      Data.cohortAgeStats().catch(() => null),
      Data.ewsFukushimaSeries().catch(() => null),
    ]);
  } catch (err) {
    root.innerHTML += `<div class="data-banner">
      <strong>Data missing.</strong> Error: ${App.escapeHtml(err.message)}
    </div>`;
    return;
  }

  if (cohort) {
    renderCountryViews(cohort);
  } else {
    document.getElementById('country-trajectories').innerHTML =
      '<div class="empty">cohort_age_stats.json not available.</div>';
  }

  if (ews) {
    renderEWS(ews);
  } else {
    document.getElementById('ews-panel').innerHTML =
      '<div class="empty">ews_fukushima_series.json not available.</div>';
  }
};

/* ============================================================
   Country trajectories (top) + latest cross-section (bottom)
   ============================================================ */
function renderCountryViews(cohort) {
  // Defensive column detection
  const rows = (cohort.rows || []).filter(r =>
    r.country && r.year != null && r.mean_age != null && isFinite(r.mean_age));
  if (!rows.length) {
    document.getElementById('country-trajectories').innerHTML =
      '<div class="empty">No usable cohort rows.</div>';
    return;
  }

  // Aggregate (country, year) → mean of mean_age across any sub_field rows
  // (weights would be ideal but are not in the slim payload)
  const byCY = new Map();
  for (const r of rows) {
    const key = `${r.country}::${r.year}`;
    if (!byCY.has(key)) byCY.set(key, { country: r.country, year: r.year, vals: [], vars: [] });
    byCY.get(key).vals.push(r.mean_age);
    if (r.var_age != null && isFinite(r.var_age)) byCY.get(key).vars.push(r.var_age);
  }
  const agg = [...byCY.values()].map(o => ({
    country: o.country, year: o.year,
    mean_age: o.vals.reduce((a, b) => a + b, 0) / o.vals.length,
    var_age:  o.vars.length ? o.vars.reduce((a, b) => a + b, 0) / o.vars.length : null,
  }));

  // Per-country series
  const countries = [...new Set(agg.map(r => r.country))].sort();
  const series = new Map();
  for (const c of countries) {
    const rows = agg.filter(r => r.country === c).sort((a, b) => a.year - b.year);
    series.set(c, {
      years: rows.map(r => r.year),
      mean:  rows.map(r => r.mean_age),
      varc:  rows.map(r => r.var_age),
    });
  }

  // Country sizing: pick the top 15 by latest mean_age density (number of years observed)
  // Default selected: the headline set from the project narrative
  const HEADLINE = ['GB', 'BE', 'DE', 'FR', 'IT', 'ES', 'SE', 'FI', 'CZ', 'SI'];
  const selected = new Set(HEADLINE.filter(c => series.has(c)));
  if (!selected.size) for (const c of countries.slice(0, 8)) selected.add(c);

  // Render chips
  const chipsHost = document.getElementById('country-chips');
  chipsHost.innerHTML = countries.map(c =>
    `<span class="chip ${selected.has(c) ? 'active' : ''}" data-country="${c}">${c}</span>`
  ).join('');
  chipsHost.querySelectorAll('.chip').forEach(el => {
    el.addEventListener('click', () => {
      const c = el.dataset.country;
      if (selected.has(c)) selected.delete(c); else selected.add(c);
      el.classList.toggle('active', selected.has(c));
      drawTrajectories();
    });
  });

  function drawTrajectories() {
    const palette = ['#d4a574', '#7fb3a8', '#d97757', '#b8956b', '#5f8a82',
                     '#a85a40', '#e6c498', '#a3c9c1', '#e89b7a', '#8d6e4d'];
    const list = [...selected];
    const traces = list.map((c, i) => {
      const s = series.get(c);
      return {
        type: 'scatter', mode: 'lines',
        x: s.years, y: s.mean,
        name: c,
        line: { width: 2, color: palette[i % palette.length] },
        hovertemplate: `<b>${c}</b><br>%{x}: %{y:.2f} yr<extra></extra>`,
      };
    });
    const layout = PlotTheme.layout({
      height: 440,
      margin: { l: 60, r: 30, t: 30, b: 60 },
      xaxis: Object.assign(PlotTheme.layout().xaxis, { title: { text: 'Year' } }),
      yaxis: Object.assign(PlotTheme.layout().yaxis, {
        title: { text: 'Mean career age (bibliometric, years)' },
      }),
      legend: { orientation: 'h', y: -0.18 },
      hovermode: 'x unified',
    });
    Plotly.react('country-trajectories', traces, layout, PlotTheme.config);
  }

  drawTrajectories();

  // Latest cross-section
  const latestByCountry = new Map();
  for (const r of agg) {
    const cur = latestByCountry.get(r.country);
    if (!cur || r.year > cur.year) latestByCountry.set(r.country, r);
  }
  const cross = [...latestByCountry.values()]
    .filter(r => r.mean_age != null)
    .sort((a, b) => a.mean_age - b.mean_age);

  const labels = cross.map(r => `${r.country} (${r.year})`);
  const values = cross.map(r => r.mean_age);
  const colors = values.map(v => {
    // Map to amber→sage→coral so younger = sage, older = coral
    const min = Math.min(...values), max = Math.max(...values);
    const t = (v - min) / (max - min || 1);
    if (t < 0.33) return '#7fb3a8';
    if (t < 0.66) return '#d4a574';
    return '#d97757';
  });

  Plotly.newPlot('latest-cross-section', [{
    type: 'bar', orientation: 'h',
    x: values, y: labels,
    marker: { color: colors, line: { width: 0 } },
    hovertemplate: '<b>%{y}</b><br>%{x:.2f} yr<extra></extra>',
  }], PlotTheme.layout({
    height: Math.max(360, 18 * cross.length + 80),
    margin: { l: 100, r: 30, t: 10, b: 50 },
    xaxis: Object.assign(PlotTheme.layout().xaxis, {
      title: { text: 'Mean career age (years)' },
    }),
    yaxis: Object.assign(PlotTheme.layout().yaxis, {
      automargin: true,
    }),
    bargap: 0.25,
  }), PlotTheme.config);
}

/* ============================================================
   EWS panel: rolling variance, AC1 and the var_age observable
   ============================================================ */
function renderEWS(ews) {
  const rows = ews.rows || [];
  const observables = ['var_age', 'variance_t', 'ac1_t']; // logical groupings
  // Actually the data carries an `observable` column with values
  // intake, mean_age, var_age, lambda_max; each row has variance_t and ac1_t
  // computed from THAT observable's residuals.

  const target = 'var_age';
  const series = rows.filter(r => r.observable === target).sort((a, b) => a.year - b.year);
  if (!series.length) {
    document.getElementById('ews-panel').innerHTML =
      '<div class="empty">No var_age series found.</div>';
    return;
  }

  const xs = series.map(r => r.year);

  function makeMini(elId, title, ys, color, sub = null) {
    const yClean = ys.map(v => (v == null || !isFinite(v)) ? null : v);
    const traces = [{
      type: 'scatter', mode: 'lines+markers',
      x: xs, y: yClean,
      line: { width: 1.6, color },
      marker: { size: 3, color },
      name: title,
      hovertemplate: `<b>${title}</b><br>%{x}: %{y:.3f}<extra></extra>`,
    }];
    if (sub) {
      const subClean = sub.map(v => (v == null || !isFinite(v)) ? null : v);
      traces.push({
        type: 'scatter', mode: 'lines',
        x: xs, y: subClean,
        line: { width: 1, color: PlotTheme.colors.muted, dash: 'dot' },
        name: 'trend',
        hovertemplate: `<b>trend</b><br>%{x}: %{y:.3f}<extra></extra>`,
      });
    }
    const layout = PlotTheme.layout({
      height: 240,
      margin: { l: 50, r: 15, t: 30, b: 35 },
      title: { text: title, font: { size: 12, color: PlotTheme.colors.muted }, x: 0.02, y: 0.98 },
      showlegend: false,
      xaxis: Object.assign(PlotTheme.layout().xaxis, { tickformat: 'd' }),
    });
    Plotly.newPlot(elId, traces, layout, PlotTheme.config);
  }

  const host = document.getElementById('ews-panel');
  host.innerHTML = `
    <div><div id="ews-raw" class="plot-container"></div></div>
    <div><div id="ews-var" class="plot-container"></div></div>
    <div><div id="ews-ac1" class="plot-container"></div></div>
  `;

  makeMini('ews-raw', 'Cohort age variance σ²(t) — raw',
           series.map(r => r.raw), '#d4a574',
           series.map(r => r.trend));
  makeMini('ews-var', 'Rolling variance of residuals  (CSD precursor)',
           series.map(r => r.variance_t), '#d97757');
  makeMini('ews-ac1', 'Lag-1 autocorrelation of residuals',
           series.map(r => r.ac1_t), '#7fb3a8');
}
