/* ============================================================
   views/policy.js — Policy shocks view
   ============================================================ */

/* Curated featured findings; identifiers match the canonical
   short event IDs and the integer-string BERTopic sub-field IDs
   produced by the export pipeline. */
const FEATURED = [
  {
    event_id: 'eu_green_deal',
    sub_field: '2',
    kind: 'structural',
    headline: 'Molten-salt visibility surges with the EU Green Deal',
    description:
      'Largest clean positive policy-driven topical response in the catalogue; ' +
      'visibility jumps within the same year the deal launches.',
  },
  {
    event_id: 'fukushima',
    sub_field: '6',
    kind: 'shock',
    headline: 'The Gen IV pullback, empirically reproduced',
    description:
      'Fast-reactor visibility falls cleanly two years after Fukushima; ' +
      'the documented Generation-IV pullback recovered from the data.',
  },
  {
    event_id: 'enen',
    sub_field: '7',
    kind: 'structural',
    headline: 'ENEN is the only event that lifts education-share',
    description:
      'ENEN at lag 9 is the only significant positive event coefficient on the ' +
      'education sub-field; subsequent European policy events carry a negative ' +
      'coefficient on education-share.',
  },
];

window.View_Policy = async function (root) {
  root.innerHTML = `
    <div class="hero" style="padding: 1.5rem 0 1rem; border: none;">
      <div class="eyebrow">Policy shocks</div>
      <h1>How European policy events reshape the nuclear research corpus</h1>
      <p class="subtitle">
        Per-sub-field interrupted time-series regression on topical visibility,
        with HAC standard errors and lag structure recovered from cross-correlation.
      </p>
    </div>

    <div id="featured-stories"></div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">Event timeline</h2>
        <span class="panel-meta">click an event to inspect its per-sub-field response</span>
      </div>
      <div class="timeline" id="timeline"></div>
    </div>

    <div class="panel" id="event-panel">
      <div class="loading">Loading event data…</div>
    </div>

    <div class="panel">
      <div class="panel-header">
        <h2 style="margin: 0;">All events × all sub-fields</h2>
        <span class="panel-meta">ITS coefficient β at the selected lag; warm = positive, cool = negative</span>
      </div>
      <div id="heatmap" class="plot-container" style="min-height: 600px;"></div>
      <p class="muted" style="font-size: 0.85rem; margin-top: 0.5rem;">
        Cells with |β| below the visibility-share noise floor (~1×10⁻⁴) are rendered as null.
        Significance is encoded by colour intensity through the symmetric scale.
      </p>
    </div>
  `;

  let policyEvents, itsData;
  try {
    [policyEvents, itsData, window._topicMap] = await Promise.all([
      Data.policyEvents(),
      Data.itsCoefficients(),
      TopicNames.map(),
    ]);
  } catch (err) {
    root.innerHTML += `<div class="data-banner">
      <strong>Data missing.</strong> Run <code>scripts/export_for_webapp.py</code>
      in the data repository to populate <code>data/</code>.
      Error: ${App.escapeHtml(err.message)}
    </div>`;
    return;
  }

  // Filter out intercept/trend rows where event_id is "None" and clean labels
  itsData = {
    ...itsData,
    rows: (itsData.rows || [])
      .filter(r => r.event_id && r.event_id !== 'None')
      .map(r => ({
        ...r,
        sub_field_name: TopicNames.label(r.sub_field, r.sub_field_name),
      })),
  };

  const validEventIds = new Set(policyEvents.events.map(e => e.id));
  itsData.rows = itsData.rows.filter(r => validEventIds.has(r.event_id));

  renderFeaturedStories(itsData, policyEvents);
  renderTimeline(policyEvents);
  renderHeatmap(itsData, policyEvents);

  const initial = policyEvents.events.find(e => e.id === 'eu_green_deal')
               || policyEvents.events.find(e => e.kind === 'shock')
               || policyEvents.events[0];
  selectEvent(initial.id, policyEvents, itsData);
};

/* ----- Featured stories: resolve numbers from rows[] ----- */
function renderFeaturedStories(itsData, policyEvents) {
  const eventMeta = new Map(policyEvents.events.map(e => [e.id, e]));
  const byKey = new Map();
  for (const r of itsData.rows) byKey.set(`${r.event_id}::${r.sub_field}`, r);

  const html = FEATURED.map(f => {
    const ev = eventMeta.get(f.event_id);
    const row = byKey.get(`${f.event_id}::${f.sub_field}`);
    const name = TopicNames.label(f.sub_field);
    const evShort = ev ? ev.short : f.event_id;
    const stats = row
      ? `β = ${Fmt.signed(row.beta, 4)} at lag ${row.lag} &nbsp;·&nbsp; p = ${Fmt.p(row.p_value)}` +
        (row.r_squared != null ? ` &nbsp;·&nbsp; R² = ${Fmt.num(row.r_squared, 2)}` : '')
      : '<span class="faint">(no matching row)</span>';
    return `
      <div class="story ${f.kind === 'shock' ? 'shock' : ''}">
        <div class="story-tag">${App.escapeHtml(evShort)} &nbsp;·&nbsp; ${App.escapeHtml(name)}</div>
        <h4>${App.escapeHtml(f.headline)}</h4>
        <p>${App.escapeHtml(f.description)}</p>
        <div class="story-stat">${stats}</div>
      </div>`;
  }).join('');

  document.getElementById('featured-stories').innerHTML = `
    <h2 style="margin-bottom: 0.8rem;">Featured findings</h2>
    <div class="story-grid">${html}</div>
  `;
}

/* ----- Event timeline ------------------------------------ */
function renderTimeline(policyEvents) {
  const events = policyEvents.events.slice().sort((a, b) => a.year - b.year);
  const minY = Math.min(...events.map(e => e.year)) - 1;
  const maxY = Math.max(...events.map(e => e.year)) + 1;
  const range = maxY - minY;

  const eventsHtml = events.map(e => {
    const pct = ((e.year - minY) / range) * 100;
    const isShock = e.kind === 'shock';
    return `
      <div class="timeline-event ${isShock ? 'shock' : ''}"
           data-event-id="${App.escapeHtml(e.id)}"
           style="left: ${pct.toFixed(2)}%;">
        <div class="dot"></div>
        <div class="label">
          <span class="year">${e.year}</span>
          ${App.escapeHtml(e.short || e.name)}
        </div>
      </div>`;
  }).join('');

  document.getElementById('timeline').innerHTML = `
    <div class="timeline-axis"></div>
    <div class="timeline-events">${eventsHtml}</div>
  `;

  document.querySelectorAll('.timeline-event').forEach(el => {
    el.addEventListener('click', () => {
      selectEvent(el.dataset.eventId, window._policyEventsCache, window._itsCache);
    });
  });

  window._policyEventsCache = policyEvents;
}

/* ----- Event selection ----------------------------------- */
function selectEvent(eventId, policyEvents, itsData) {
  window._itsCache = itsData;

  document.querySelectorAll('.timeline-event').forEach(el => {
    el.classList.toggle('active', el.dataset.eventId === eventId);
  });

  const event = policyEvents.events.find(e => e.id === eventId);
  if (!event) return;

  const rows = itsData.rows.filter(r => r.event_id === eventId);
  const panel = document.getElementById('event-panel');

  if (!rows.length) {
    panel.innerHTML = `
      <h3>${App.escapeHtml(event.name)} <span class="muted mono">${event.year}</span></h3>
      <p class="muted">No ITS data available for this event.</p>`;
    return;
  }

  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 style="margin: 0;">
          ${App.escapeHtml(event.name)}
          <span class="muted mono" style="font-size: 0.7em; margin-left: 0.5em;">${event.year}</span>
          ${event.kind === 'shock'
            ? '<span class="chip" style="background: rgba(217,119,87,0.15); color: var(--accent-coral); border-color: var(--accent-coral-d); margin-left: 0.5em;">shock event</span>'
            : '<span class="chip" style="background: rgba(127,179,168,0.10); color: var(--accent-sage); border-color: var(--accent-sage-d); margin-left: 0.5em;">structural</span>'}
        </h2>
        <p class="muted" style="margin: 0.4em 0 0; max-width: 60ch;">
          ${App.escapeHtml(event.description || '')}
        </p>
      </div>
    </div>

    <div class="grid split" style="margin-top: 1.5rem;">
      <div>
        <h3>Per-sub-field response coefficients</h3>
        <div id="bar-chart" class="plot-container" style="min-height: 480px;"></div>
      </div>
      <div>
        <h3>Top responders</h3>
        <div id="responders-table"></div>
      </div>
    </div>
  `;

  renderBarChart(rows);
  renderRespondersTable(rows);
}

/* ----- Bar chart of per-sub-field β coefficients --------- */
function renderBarChart(rows) {
  const sorted = rows.slice().sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta));
  const display = sorted.slice(0, 30);

  const labels = display.map(r => r.sub_field_name);
  const betas  = display.map(r => r.beta);
  const errs   = display.map(r => (r.se != null ? 1.96 * r.se : null));
  const hasErr = errs.some(e => e != null);
  const errArr = errs.map(e => (e != null ? e : 0));

  const colors = display.map(r => {
    const sig = r.p_value != null && r.p_value < 0.05;
    if (!sig) return PlotTheme.colors.muted;
    return r.beta >= 0 ? PlotTheme.colors.amber : PlotTheme.colors.coral;
  });

  const hover = display.map(r =>
    `<b>${r.sub_field_name}</b><br>` +
    `β = ${Fmt.signed(r.beta, 4)}` +
    (r.se != null ? ` ± ${Fmt.num(r.se, 4)}` : '') + `<br>` +
    `lag = ${r.lag} yr<br>` +
    `p = ${Fmt.p(r.p_value)}` +
    (r.r_squared != null ? `<br>R² = ${Fmt.num(r.r_squared, 2)}` : '')
  );

  const trace = {
    type: 'bar',
    orientation: 'h',
    x: betas,
    y: labels,
    error_x: hasErr
      ? { type: 'data', array: errArr, color: PlotTheme.colors.muted, thickness: 1, width: 3 }
      : undefined,
    marker: { color: colors, line: { width: 0 } },
    hovertemplate: '%{customdata}<extra></extra>',
    customdata: hover,
  };

  const layout = PlotTheme.layout({
    height: Math.max(360, 18 * display.length + 80),
    margin: { l: 240, r: 30, t: 10, b: 40 },
    xaxis: Object.assign(PlotTheme.layout().xaxis, {
      title: { text: 'ITS coefficient β (Δ in topical share per step)' },
      zeroline: true,
      zerolinewidth: 1,
    }),
    yaxis: Object.assign(PlotTheme.layout().yaxis, {
      autorange: 'reversed',
      automargin: true,
    }),
    bargap: 0.25,
  });

  Plotly.newPlot('bar-chart', [trace], layout, PlotTheme.config);
}

/* ----- Top responders table ----------------------------- */
function renderRespondersTable(rows) {
  const sig = rows.filter(r => r.p_value != null && r.p_value < 0.05);
  const sorted = sig.length
    ? sig.slice().sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta))
    : rows.slice().sort((a, b) => Math.abs(b.beta) - Math.abs(a.beta));
  const top = sorted.slice(0, 10);

  const rowsHtml = top.map(r => `
    <tr>
      <td>${App.escapeHtml(r.sub_field_name)}</td>
      <td class="num" style="color: ${r.beta >= 0 ? 'var(--accent-amber)' : 'var(--accent-coral)'};">
        ${Fmt.signed(r.beta, 4)}
      </td>
      <td class="num">${r.lag}</td>
      <td class="num">
        <span style="color: var(--${Fmt.sig(r.p_value)});">${Fmt.p(r.p_value)}</span>
      </td>
    </tr>`).join('');

  document.getElementById('responders-table').innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Sub-field</th>
          <th class="num">β</th>
          <th class="num">lag</th>
          <th class="num">p</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    <p class="muted" style="font-size: 0.8rem; margin-top: 0.8rem;">
      Top ${top.length} ${sig.length ? 'significant ' : ''}responders by |β|.
      ${sig.length} of ${rows.length} sub-fields significant at p&lt;0.05.
    </p>
  `;
}

/* ----- Full heatmap (events × sub-fields) --------------- */
function renderHeatmap(itsData, policyEvents) {
  const rows = itsData.rows;
  const eventMeta = new Map(policyEvents.events.map(e => [e.id, e]));

  // Events in chronological order (only those that have ITS data)
  const presentEventIds = new Set(rows.map(r => r.event_id));
  const eventList = policyEvents.events
    .filter(e => presentEventIds.has(e.id))
    .sort((a, b) => a.year - b.year)
    .map(e => ({ id: e.id, label: e.short, year: e.year, kind: e.kind }));

  // All sub-fields seen in rows, sorted by id numerically
  const sfIds = [...new Set(rows.map(r => r.sub_field))]
    .sort((a, b) => Number(a) - Number(b));
  const subList = sfIds.map(id => ({ id, name: TopicNames.label(id) }));

  // Build matrix indexed [sub_field row][event col]
  const z = subList.map(sf => eventList.map(ev => {
    const r = rows.find(x => x.event_id === ev.id && x.sub_field === sf.id);
    if (!r || r.beta == null || Math.abs(r.beta) < 1e-4) return null;
    return r.beta;
  }));

  const text = subList.map(sf => eventList.map(ev => {
    const r = rows.find(x => x.event_id === ev.id && x.sub_field === sf.id);
    if (!r) return '';
    return `${sf.name}<br>${ev.label} (${ev.year})<br>` +
           `β = ${Fmt.signed(r.beta, 4)}<br>` +
           `lag = ${r.lag} · p = ${Fmt.p(r.p_value)}`;
  }));

  const colorscale = [
    [0.0,  '#a85a40'],
    [0.25, '#d97757'],
    [0.5,  '#1c2128'],
    [0.75, '#d4a574'],
    [1.0,  '#f0d5a8'],
  ];

  const allBetas = z.flat().filter(x => x != null);
  const absMax = Math.max(...allBetas.map(Math.abs), 0.001);

  const trace = {
    type: 'heatmap',
    z, text,
    x: eventList.map(ev => `${ev.label} ${ev.year}`),
    y: subList.map(sf => sf.name),
    colorscale,
    zmin: -absMax,
    zmax:  absMax,
    zmid: 0,
    hoverongaps: false,
    hovertemplate: '%{text}<extra></extra>',
    colorbar: {
      title: { text: 'β', font: { color: PlotTheme.colors.muted } },
      tickfont: { color: PlotTheme.colors.muted },
      outlinewidth: 0,
      thickness: 12,
      len: 0.7,
    },
  };

  const layout = PlotTheme.layout({
    height: Math.max(600, 22 * subList.length + 120),
    margin: { l: 240, r: 80, t: 60, b: 40 },
    xaxis: Object.assign(PlotTheme.layout().xaxis, {
      side: 'top',
      tickangle: -25,
      automargin: true,
    }),
    yaxis: Object.assign(PlotTheme.layout().yaxis, {
      autorange: 'reversed',
      automargin: true,
    }),
  });

  Plotly.newPlot('heatmap', [trace], layout, PlotTheme.config);

  document.getElementById('heatmap').on('plotly_click', (data) => {
    if (!data.points || !data.points.length) return;
    const xIdx = data.points[0].pointIndex[1];
    const ev = eventList[xIdx];
    if (ev) selectEvent(ev.id, window._policyEventsCache, itsData);
  });
}
