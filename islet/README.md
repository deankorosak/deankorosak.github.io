# Islet recruitment simulator

A single self-contained web page (`index.html`, no dependencies, no build step, no network access) that runs the
microscopic stochastic realization of the majority-rule cusp model from
*A mean-field cusp catastrophe for the first-order synchronization transition in pancreatic islets*
and regenerates every panel of the simulation figure (Fig. 9) live in the browser.

## What it does

* **Recruitment layer** – N cells with binary states on a quenched random k-out graph, each with its own
  glucose midpoint G_c + ξ_i, redrawn each sweep with probability p_u from
  Bernoulli[α m_i + (1 − α) f_i(G)] (majority rule blended with the single-cell logistic sensor).
* **Emission layer** – each cell belongs to one of m regions and emits
  y_i = σ_i (w₀ z₀ + w_r z_r(i)) + s η_i with AR(1) latent fluctuations.
* **Pipeline** – sliding-window Pearson correlations, two-component Gaussian-mixture order parameter Δ = |2w − 1|,
  eigenvalues against the Marčenko–Pastur law at Q = W/N, the contribution-matrix functional cluster S(t) and its
  overlap U(t, τ) with the plateau, consecutive-window ARI of average-linkage clusterings; plus the quasi-static
  up/down glucose sweep compared with the deterministic mean-field branches.
* **Panels** – (a)–(h) of the manuscript figure, a live replay of the realization (cells, polling graph, raster),
  λ_max(t) against λ₊, correlation matrices (basal / plateau / plateau sorted by region), the tilting potential V(φ),
  the bifurcation diagram with the protocol path, and a table of measured quantities against the closed-form
  predictions (α_c, μ, folds, hysteresis width, λ₊, ρ_in, ρ_out, Δ plateau).
* **Responsive** – desktop (sidebar + two-column figure), tablet and phone (parameters in a slide-in drawer,
  sticky Run bar, single-column panels, touch read-outs on every plot).
* **Controls** – every parameter of Table 1 (recruitment, emission, protocol, analysis, quasi-static sweep, seed),
  presets (`paper`, `quick`, `near cusp`, `uncoupled`, `strong disorder`, `one region`), light/dark theme,
  PNG export of the figure and JSON export of all series. Runs are reproducible from the seed.

The numerics are a direct port of `simulate_majority_islet.py`; at the paper parameters the page reproduces
λ₊ = 3.66, the deterministic folds 6.83 / 6.69 mM (loop 0.148 mM, leading order 0.088 mM), the quasi-static
finite-N loop ≈ 0.10–0.12 mM, the Δ plateau ≈ 0.6, five eigenvalues beyond λ₊, and ARI ≈ 0.8 / 0.2.

## Hosting on GitHub Pages

Put `index.html` at the root of the repository (or in any folder) and enable Pages for that branch;
the page appears at `https://<user>.github.io/<repo>/`. Nothing else is needed. It also opens directly from disk.
