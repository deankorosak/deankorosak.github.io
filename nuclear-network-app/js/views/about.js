/* About view */
window.View_About = async function (root) {
  let manifest = null;
  try { manifest = await Data.manifest(); } catch (_) {}

  root.innerHTML = `
    <div class="hero" style="padding: 1.5rem 0 1rem; border: none;">
      <div class="eyebrow">About</div>
      <h1>Methodology and provenance</h1>
    </div>

    <section>
      <h2>Construct and scope</h2>
      <p>
        The construct is the European civilian nuclear research and education ecosystem
        in the sense relevant to EURATOM workforce planning, national programmes, and
        the European education networks. Geographic scope: EU-27 plus the United
        Kingdom, Switzerland, and Norway. Topical scope: reactor physics, neutronics,
        thermal hydraulics, fuel cycle, safety and safety culture, radioactive waste
        management, decommissioning, small and advanced modular reactors, and nuclear
        engineering education. Fusion, nuclear medicine, particle physics, and
        analytical applications of nuclear methods are excluded as adjacent constructs.
      </p>
    </section>

    <section>
      <h2>Corpus construction</h2>
      <p>
        Records are retrieved from OpenAlex via a two-layer topic filter: strict topics
        kept unconditionally; candidate topics gated by a 97-term keyword screen on
        title and abstract. A sentence-transformer relevance classifier (MiniLM
        embeddings into logistic regression) trained on 780 hand-coded records was
        selected over a TF-IDF baseline by 12.4 percentage points held-out F1 and
        applied to 222,065 retrieved records. The in-scope corpus comprises 87,401
        unique works after deduplication.
      </p>
    </section>

    <section>
      <h2>Multilayer network</h2>
      <p>
        Three node-aligned layers on 2,667 institutions at yearly resolution: a
        collaboration layer (co-authorship in a three-year rolling window); a topical
        similarity layer (cosine similarity between institutional thirty-topic
        distributions); a directed mobility layer (author primary-affiliation
        transitions). Inter-layer coupling is calibrated at ω = 0.4472 (median
        intra-layer edge weight) in the weak-coupling regime that preserves
        layer-legible structure. The mobility layer carries a documented schema
        limitation arising from the flattened OpenAlex acquisition; absolute counts
        are upper bounds, relative corridor structure is trustworthy.
      </p>
    </section>

    <section>
      <h2>Analytical pipeline</h2>
      <p>
        Per-layer single-network measures (degree, weighted degree, clustering,
        eigenvector centrality, betweenness, closeness, PageRank, community detection
        by Leiden and Louvain) and multilayer measures (versatility, multilayer
        PageRank, generalised multilayer modularity, supra-adjacency spectrum).
        Percolation under random, centrality-targeted, and age-targeted attrition.
        Cohort extraction with a three-year activity tolerance and per-cohort survival
        curves with bootstrap bands. Spectral and early-warning analysis on the
        cohort transition operator, validated against the 2011 Fukushima reorganisation
        of reactor physics. Topical visibility coupled to an eight-event policy-shock
        catalogue via interrupted time-series regression with HAC standard errors and
        Pelt changepoint detection.
      </p>
    </section>

    <section>
      <h2>Reproducibility and licensing</h2>
      <p>
        The pipeline is implemented in Python 3.12 and orchestrated by Snakemake;
        every figure regenerates end-to-end from the corpus. Code is released under
        the MIT license; data, models, and figures under CC-BY-4.0.
      </p>
      ${manifest ? `
      <h3>Data manifest</h3>
      <table style="max-width: 580px;">
        <tr><td>Data source</td><td class="mono">${App.escapeHtml(manifest.data_source || '—')}</td></tr>
        <tr><td>Exported at</td><td class="mono">${App.escapeHtml(manifest.exported_at || '—')}</td></tr>
        <tr><td>Git SHA</td><td class="mono">${App.escapeHtml((manifest.git_sha || '—').slice(0, 12))}</td></tr>
        <tr><td>Pipeline version</td><td class="mono">${App.escapeHtml(manifest.pipeline_version || '—')}</td></tr>
        <tr><td>Files</td><td class="mono">${(manifest.files || []).length}</td></tr>
      </table>` : ''}
    </section>

    <section>
      <h2>Citation</h2>
      <div class="panel inset">
        <p class="mono" style="font-size: 0.85rem; margin: 0;">
        Korošak, D. (2026). <em>Nuclear Multilayer Ecosystem (1995–2025): a temporal
        multilayer reconstruction of European civilian nuclear research and education
        from the OpenAlex publication record</em>. v1.0.0. Software and data.
        DOI: 10.5281/zenodo.XXXXXXX
        </p>
      </div>
    </section>
  `;
};
