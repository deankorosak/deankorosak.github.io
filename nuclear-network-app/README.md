# Nuclear Multilayer Ecosystem — explorer

Static companion site to the *Nuclear Multilayer Ecosystem* project.
Lets a visitor click through the same evidence base used to write the paper
without needing R, Python, or a database. Pure HTML, CSS, and JavaScript;
no backend, no build step; hostable on GitHub Pages.

## Live site

After enabling Pages on this repository, the app is served at
`https://<username>.github.io/nuclear-multilayer-app/`.

## Architecture

```
.
├── index.html              # SPA shell, hash router
├── 404.html                # Hash-route fallback for deep links
├── css/style.css           # Dark mode scholarly stylesheet
├── js/
│   ├── app.js              # Router, view dispatch
│   ├── data.js             # JSON loader, topic-name resolver, Plotly dark theme
│   └── views/              # One module per view
│       ├── overview.js
│       ├── topics.js
│       ├── policy.js
│       ├── cohorts.js
│       ├── network.js
│       ├── countries.js     (iteration 4)
│       └── about.js
├── data/                   # JSON exported from the data repository
│   ├── manifest.json
│   ├── policy_events.json
│   ├── its_coefficients.json
│   ├── topics_overview.json
│   ├── topical_visibility.json
│   ├── cohort_age_stats.json          (granular)
│   ├── cohort_age_by_country.json     (slim per-country trajectories)
│   ├── ews_fukushima_series.json
│   ├── network_country_edges.json     (country × country × year × layer)
│   ├── network_measures.json          (per-year structural measures)
│   └── annual_volume_by_country.json
└── assets/                 # Favicon and static graphics
```

No bundler, no package manager. Plotly.js is loaded from CDN. Open
`index.html` in a browser or serve the directory with any static server
(`python3 -m http.server 8000` is enough).

## Views

1. **Overview** — project pitch, headline statistics, annual publication volume by country, three featured findings.
2. **Topics** — the 30 BERTopic sub-fields as a sortable grid (size, recent visibility, trend, id) with inline SVG sparklines; multi-select trajectory chart with featured topics pre-selected.
3. **Policy shocks** — interactive event timeline, per-event ITS coefficients with HAC standard errors, full event × sub-field heatmap, three featured findings.
4. **Cohorts** — per-country mean career-age trajectories with togglable country chips, 2024 cross-section ranking, Fukushima 2011 EWS validation panel (raw σ²(t), rolling-residual variance, lag-1 autocorrelation).
5. **Network** — country-aggregated multilayer view: 30 × 30 country matrix heatmap driven by a year slider and layer toggle (C / T / M), top-partners side panel, multilayer measures over time. Institutional drill-down is iteration 4.
6. **Countries** *(iteration 4)* — country selector, per-country profile, peer comparators, latent ties (including the Slovenia case study).
7. **About** — methodology, provenance, citation.

## Data pipeline

The site reads pre-computed JSON files in `data/`. These are exported from
the parquet derived tables in the sibling data repository
`deankorosak/nuclear-multilayer` by running:

```bash
cd ../nuclear-multilayer
uv run python scripts/export_for_webapp.py --out-dir ../nuclear-multilayer-app/data
```

The export script reads:

- `data/derived/topics_overview.parquet` for BERTopic structure (curated +
  auto-derived names from `top_terms`).
- `data/derived/measures/its_coefficients.parquet` for per-sub-field policy
  responses; intercept rows with `event_id = None` are dropped, featured
  stories matched on integer-string sub-field IDs.
- `data/derived/measures/topical_visibility.parquet` for the visibility
  trajectories.
- `data/derived/cohort_age_stats.parquet` for cohort statistics, aggregated
  to a slim per-country trajectory file.
- `data/derived/measures/ews_fukushima_series.parquet` for the early-warning
  validation series.
- `data/derived/networks/year=YYYY/layer={C,T,M}.graphml` for the multilayer
  graph, aggregated to country pairs via NetworkX (requires `networkx`).
- `data/derived/measures/multilayer/global_summary.parquet`,
  `data/derived/networks/summary.parquet`, and
  `data/derived/measures/global/summary.parquet` for per-year structural
  measures.

The aggregation of the institutional graph to country pairs is the slowest
step (~1–3 minutes for 93 graphml files); the rest is sub-second.

The app ships with empty placeholders for files that need a re-export; the
data banner in the footer and the `data_source` field in `manifest.json`
flag the state.

## Deploying to GitHub Pages

1. Push this repository to GitHub.
2. *Settings → Pages → Build and deployment → Source: Deploy from a branch*; pick the `main` branch and `/ (root)`.
3. Wait for the green check. The site is live at the URL shown on that page.

The `.nojekyll` file ensures underscore-prefixed paths are served and Jekyll
processing is skipped. The `404.html` page forwards deep-linked SPA routes
back to `index.html`.

## Licence

Code: MIT. See `LICENSE`.
Data, models, and figures (carried in `data/`): CC-BY-4.0, inherited from
the upstream data repository.

## Citation

> Korošak, D. (2026). *Nuclear Multilayer Ecosystem (1995–2025): a temporal
> multilayer reconstruction of European civilian nuclear research and
> education from the OpenAlex publication record.* v1.0.0. Software and
> data. DOI: 10.5281/zenodo.XXXXXXX
