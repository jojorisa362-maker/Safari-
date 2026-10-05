// Safari Rescue - entry point. Loads config + session, then starts the router.
import { $, S, api, hooks, applyTheme, loadAll, render, goR } from './core.js';
import './customer.js';
import './customer2.js';
import './provider.js';
import './portal.js';

async function boot() {
  S.cfg = await api('/config');
  try {
    const d = await api('/me');
    S.user = d.user;
    applyTheme(S.user.theme);
    await loadAll();
  } catch (e) {
    if (e.status && e.status !== 401) throw e;
    if (!e.status) throw e; // offline
  }
}

const offline = () => {
  $('#app').className = 'app';
  $('#app').innerHTML = '<div class="boot"><div class="empty" style="color:#fff"><h2>Can\u2019t reach Safari Rescue</h2><p>Check your internet connection and try again.</p><button class="btn" id="retry">Try again</button></div></div>';
  $('#retry').addEventListener('click', () => location.reload());
};

hooks.ready = boot().catch((e) => { console.error(e); S.bootFailed = true; });
const first = !location.hash || location.hash === '#/' || location.hash === '#/splash';
if (first) {
  if (location.hash !== '#/splash') location.replace('#/splash');
  render();
  hooks.ready.then(() => { if (S.bootFailed) offline(); });
} else {
  hooks.ready.then(() => { if (S.bootFailed) offline(); else render(); });
}
