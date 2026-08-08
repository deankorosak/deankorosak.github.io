/* ============================================================
   app.js — hash router and view dispatch
   ============================================================ */

const Views = {
  overview:  window.View_Overview,
  topics:    window.View_Topics,
  policy:    window.View_Policy,
  cohorts:   window.View_Cohorts,
  network:   window.View_Network,
  countries: window.View_Countries,
  about:     window.View_About,
};

const DEFAULT_ROUTE = 'overview';

function parseHash() {
  const raw = (window.location.hash || '').replace(/^#\/?/, '');
  if (!raw) return { route: DEFAULT_ROUTE, args: [] };
  const parts = raw.split('/').filter(Boolean);
  return { route: parts[0] || DEFAULT_ROUTE, args: parts.slice(1) };
}

function highlightNav(route) {
  document.querySelectorAll('#nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.route === route);
  });
}

async function renderRoute() {
  const { route, args } = parseHash();
  const viewFn = Views[route] || Views.overview;
  const container = document.getElementById('view');
  container.innerHTML = '<div class="loading">Loading view…</div>';
  highlightNav(viewFn === Views[route] ? route : DEFAULT_ROUTE);
  try {
    await viewFn(container, args);
  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div class="panel">
        <h2>View failed to render</h2>
        <p class="muted">${escapeHtml(err.message || String(err))}</p>
        <pre class="mono muted">${escapeHtml((err.stack || '').slice(0, 1200))}</pre>
      </div>`;
  }
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

window.addEventListener('hashchange', renderRoute);
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const manifest = await Data.manifest();
    const info = document.getElementById('footer-data-info');
    if (manifest) {
      const stamp = manifest.exported_at
        ? new Date(manifest.exported_at).toISOString().slice(0, 10)
        : 'unknown';
      const src = manifest.data_source || 'placeholder';
      const git = manifest.git_sha ? ` · git ${manifest.git_sha.slice(0, 7)}` : '';
      info.textContent = `Data: ${src} · exported ${stamp}${git}`;
    }
  } catch (_) { /* manifest is optional */ }
  renderRoute();
});

window.App = { renderRoute, escapeHtml };
