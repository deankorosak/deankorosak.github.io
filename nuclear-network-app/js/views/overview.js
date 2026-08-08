/* ============================================================
   views/overview.js — landing page
   ============================================================ */

window.View_Overview = async function (root) {
  let manifest = null, annual = null;
  try { manifest = await Data.manifest(); } catch (_) {}
  try { annual = await Data.annualVolume(); } catch (_) {}

  const stats = (manifest && manifest.stats) || {};
  const works     = stats.in_scope_works ?? '87,401';
  const insts     = stats.institutions   ?? '2,667';
  const authors   = stats.authors        ?? '137,381';
  const countries = stats.countries      ?? '30';
  const subfields = stats.sub_fields     ?? '30';
  const years     = stats.year_span      ?? '1995–2025';

  root.innerHTML = `
    <section class="hero">
      <div class="eyebrow">Nuclear Multilayer Ecosystem · v1.0.0</div>
      <h1>European civilian nuclear research and education, as a connected system</h1>
      <p class="subtitle">
        A temporal multilayer reconstruction of the field 1995–2025
        from the OpenAlex publication record.
      </p>
    </section>

    <section>
      <p class="lede">
        This project reconstructs the European civilian nuclear research and education
        ecosystem over 1995 to 2025 as a temporal multilayer network derived from the
        OpenAlex publication record. Geographic scope covers EU-27 plus the United Kingdom,
        Switzerland, and Norway; topical scope covers reactor physics, neutronics, thermal
        hydraulics, fuel cycle, safety, waste management, decommissioning, small and
        advanced modular reactors, and nuclear engineering education. Fusion, nuclear
        medicine, particle physics, and analytical applications of nuclear methods are
        treated as adjacent constructs and excluded by an explicit topic blocklist.
        Control corpora for the United States, China, Japan, South Korea, and Russia
        are retained as side-by-side comparators.
      </p>
    </section>

    <section class="stats">
      <div class="stat"><div class="stat-value">${works}</div><div class="stat-label">in-scope works</div></div>
      <div class="stat"><div class="stat-value">${insts}</div><div class="stat-label">institutions</div></div>
      <div class="stat"><div class="stat-value">${authors}</div><div class="stat-label">authors</div></div>
      <div class="stat"><div class="stat-value">${countries}</div><div class="stat-label">EU + adjacent</div></div>
      <div class="stat"><div class="stat-value">${subfields}</div><div class="stat-label">sub-fields</div></div>
      <div class="stat"><div class="stat-value">${years}</div><div class="stat-label">year span</div></div>
    </section>

    <section>
      <h2>Three findings to start from</h2>
      <div class="story-grid">

        <a class="story" href="#/policy" style="text-decoration: none;">
          <div class="story-tag">Policy shocks</div>
          <h4>Education is crowded out by every industrial-policy event since 2003</h4>
          <p>
            ENEN 2003 is the only event producing a sustained rise in education-share;
            every subsequent European policy event reallocates corpus visibility toward
            operational, safety, and advanced-reactor topics.
          </p>
          <div class="story-stat">→ Explore policy responses</div>
        </a>

        <a class="story" href="#/cohorts" style="text-decoration: none;">
          <div class="story-tag">Cohorts</div>
          <h4>The active research community is visibly ageing</h4>
          <p>
            Mean career age in the European corpus has risen by roughly 2.3 years per
            decade since 2000; UK youngest (SMR-driven intake), Belgium oldest (SCK CEN
            anchored), Germany the only large country with a recent decline.
          </p>
          <div class="story-stat">→ Explore cohort trajectories</div>
        </a>

        <a class="story shock" href="#/network" style="text-decoration: none;">
          <div class="story-tag">Network structure</div>
          <h4>Densification with policy-event-aligned reorganisations</h4>
          <p>
            Multilayer modularity declines 0.43 → 0.28; spectral distance between
            consecutive supra-adjacency spectra peaks at Fukushima, the Paris-Green Deal
            sequence, and the Russia-Ukraine war.
          </p>
          <div class="story-stat">→ Explore the network</div>
        </a>

      </div>
    </section>

    <section>
      <h2>Annual publication volume, EU + adjacent</h2>
      <div id="overview-volume" class="plot-container" style="min-height: 380px;"></div>
      <p class="muted" style="font-size: 0.85rem;">
        Stacked annual count of in-scope publications by author affiliation country.
        Multi-country works contribute to each affiliated country before dedup; the
        global total is shown as an outline trace.
      </p>
    </section>

    <section>
      <h2>How to navigate</h2>
      <p class="muted">
        The six views above the fold each open onto one of the analytical pillars:
        topical decomposition (<a href="#/topics">Topics</a>), policy coupling
        (<a href="#/policy">Policy shocks</a>), demographic trajectories
        (<a href="#/cohorts">Cohorts</a>), the multilayer institutional graph
        (<a href="#/network">Network</a>), and country-level deep dives
        (<a href="#/countries">Countries</a>). The
        <a href="#/about">About</a> page documents the methodology, the filter, and
        the data provenance.
      </p>
    </section>
  `;

  if (annual && annual.years && annual.years.length) {
    renderVolume(annual);
  } else {
    document.getElementById('overview-volume').innerHTML =
      '<div class="empty">Annual volume data not available yet. ' +
      'Run <code>scripts/export_for_webapp.py</code> after the works corpus is exported.</div>';
  }
};

function renderVolume(annual) {
  const years = annual.years || [];
  const countries = annual.countries || {};
  const countryIds = Object.keys(countries).sort();

  const totals = countryIds.map(c => ({
    c, total: (countries[c] || []).reduce((s, x) => s + (x || 0), 0)
  })).sort((a, b) => b.total - a.total);

  const top = totals.slice(0, 8).map(t => t.c);
  const rest = totals.slice(8).map(t => t.c);

  const traces = top.map((c, i) => ({
    type: 'scatter',
    mode: 'lines',
    stackgroup: 'one',
    x: years,
    y: countries[c],
    name: c,
    line: { width: 0.5 },
    hovertemplate: `<b>${c}</b><br>%{x}: %{y} works<extra></extra>`,
  }));

  if (rest.length) {
    const restTotals = years.map((_, i) =>
      rest.reduce((s, c) => s + ((countries[c] || [])[i] || 0), 0));
    traces.push({
      type: 'scatter', mode: 'lines',
      stackgroup: 'one',
      x: years, y: restTotals,
      name: `Other (${rest.length})`,
      line: { width: 0.5 },
      hovertemplate: `<b>Other</b><br>%{x}: %{y} works<extra></extra>`,
    });
  }

  const layout = PlotTheme.layout({
    height: 420,
    showlegend: true,
    xaxis: Object.assign(PlotTheme.layout().xaxis, { title: { text: 'Year' } }),
    yaxis: Object.assign(PlotTheme.layout().yaxis, { title: { text: 'In-scope works' } }),
    legend: { orientation: 'h', y: -0.18, font: { color: PlotTheme.colors.muted } },
  });

  Plotly.newPlot('overview-volume', traces, layout, PlotTheme.config);
}
