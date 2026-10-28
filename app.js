/* KV Advisory sample — router, layout, event wiring. */
(function () {
  'use strict';
  const t = k => KV.t(k), esc = s => KV.esc(s);
  const R = [
    ['/', 'home'], ['/services', 'services'], ['/services/:id', 'service'], ['/cases', 'cases'], ['/cases/:id', 'case'],
    ['/insights', 'insights'], ['/insights/:id', 'insight'], ['/team', 'team'], ['/careers', 'careers'], ['/careers/:id', 'job'],
    ['/proposal', 'proposal'], ['/proposal/done/:id', 'proposalDone'], ['/search', 'search'], ['/login', 'login'], ['/register', 'register'],
    ['/portal', 'pDash', 'client'], ['/portal/projects', 'pProjects', 'client'], ['/portal/projects/:id', 'pProject', 'client'],
    ['/portal/invoices', 'pInvoices', 'client'], ['/portal/invoices/:id', 'pInvoice', 'client'], ['/portal/messages', 'pMessages', 'client'],
    ['/portal/requests', 'pRequests', 'client'], ['/portal/profile', 'pProfile', 'client'],
    ['/staff', 'sDash', 'staff'], ['/staff/projects', 'sProjects', 'staff'], ['/staff/projects/:id', 'sProject', 'staff'],
    ['/admin', 'aDash', 'admin'], ['/admin/leads', 'aLeads', 'admin'], ['/admin/projects', 'aProjects', 'admin'], ['/admin/projects/:id', 'aProject', 'admin'],
    ['/admin/invoices', 'aInvoices', 'admin'], ['/admin/invoices/:id', 'aInvoice', 'admin'], ['/admin/cms', 'aCms', 'admin'],
    ['/admin/users', 'aUsers', 'admin'], ['/admin/outbox', 'aOutbox', 'admin'], ['/admin/log', 'aLog', 'admin']
  ].map(([p, v, g]) => { const keys = []; const re = new RegExp('^' + p.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$'); return { re, keys, v, g }; });

  const state = { menu: false };
  const parse = () => { const h = location.hash.slice(1) || '/'; const i = h.indexOf('?'); const path = (i < 0 ? h : h.slice(0, i)).replace(/\/+$/, '') || '/'; return { path, q: Object.fromEntries(new URLSearchParams(i < 0 ? '' : h.slice(i + 1))) }; };

  function view() {
    const { path, q } = parse(); let hit = null, params = {};
    for (const r of R) { const m = path.match(r.re); if (m) { hit = r; r.keys.forEach((k, i) => params[k] = decodeURIComponent(m[i + 1])); break; } }
    const me = KV.me();
    if (!hit) return { html: Views.notfound(), path };
    if (hit.g) {
      if (!me) { location.hash = '#/login?next=' + encodeURIComponent(location.hash.slice(1)); return null; }
      if (me.role !== hit.g) { if (hit.g === 'admin') return { html: Views.forbidden(), path }; location.hash = '#' + KV.home(me); return null; }
    }
    return { html: Views[hit.v](params, q), path };
  }

  function layout(body, path) {
    const me = KV.me(), unread = me ? KV.myNotes(me).filter(n => !n.read).length : 0;
    const nav = [['/services', 'nav.services'], ['/cases', 'nav.cases'], ['/insights', 'nav.insights'], ['/team', 'nav.team'], ['/careers', 'nav.careers']];
    const home = KV.home(me);
    const links = nav.map(([h, k]) => `<a href="#${h}" class="${path.startsWith(h) ? 'on' : ''}">${t(k)}</a>`).join('');
    const acct = me ? `<a class="btn sm primary" href="#${home}">${t('nav.portal')}${unread ? ` <span class="dot">${unread}</span>` : ''}</a><button class="btn sm" data-act="logout">${t('nav.logout')}</button>` : `<a class="btn sm primary" href="#/login">${t('nav.portal')}</a>`;
    const lang = `<select class="lang" data-chg="lang" aria-label="Language"><option value="en"${KV.lang === 'en' ? ' selected' : ''}>EN</option><option value="am"${KV.lang === 'am' ? ' selected' : ''}>አማ</option><option value="om"${KV.lang === 'om' ? ' selected' : ''}>OM</option></select>`;
    return `<div class="sample" role="note"><div class="wrap"><b>${esc(t('banner'))}</b></div></div>
      <header class="top ${state.menu ? 'open' : ''}"><div class="wrap bar2"><a class="brand" href="#/"><span class="mark">KV</span><span>KV Advisory<small>SAMPLE</small></span></a>
      <nav class="nav" aria-label="Primary">${links}<a href="#/search" class="${path === '/search' ? 'on' : ''}">${t('nav.search')}</a></nav>
      <div class="right">${lang}${acct}</div>
      <button class="burger" data-act="menu" aria-label="${t('menu')}" aria-expanded="${state.menu}"><i></i><i></i><i></i></button></div>
      <div class="mnav"><div class="wrap">${links}<a href="#/search">${t('nav.search')}</a><a href="#/proposal">${t('cta.proposal')}</a><a href="#${home}" class="strong">${t('nav.portal')}</a>${me ? `<button class="linkbtn" data-act="logout">${t('nav.logout')}</button>` : `<a href="#/register">${t('nav.register')}</a>`}<div class="mlang">${lang.replace('class="lang"', 'class="lang m"')}</div></div></div></header>
      <main id="main">${body}</main>
      <footer class="foot"><div class="wrap"><p>${esc(t('foot.disc'))}</p><p><a href="#/proposal">${t('cta.proposal')}</a> · <a href="#/login">${t('nav.login')}</a> · <button class="linkbtn" data-act="reset">${t('foot.reset')}</button></p><p class="mut">© 2026 KV Advisory (fictional) — demonstration only.</p></div></footer>`;
  }

  function render(keepScroll) {
    const y = window.scrollY; let v;
    try { v = view(); } catch (e) { console.error(e); v = { html: `<div class="wrap sec"><h1>Something went wrong</h1><p class="mut">${esc(e.message)}</p></div>`, path: '' }; }
    if (!v) return;
    document.getElementById('app').innerHTML = layout(v.html, v.path);
    document.title = (document.querySelector('#main h1') ? document.querySelector('#main h1').textContent + ' — ' : '') + 'KV Advisory (Sample)';
    window.scrollTo(0, keepScroll ? y : 0);
  }
  KV.rerender = () => render(true);

  window.addEventListener('hashchange', () => { state.menu = false; render(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && state.menu) { state.menu = false; render(true); } });
  window.addEventListener('resize', () => { if (state.menu && window.innerWidth >= 860) { state.menu = false; render(true); } });

  Acts.menu = () => { state.menu = !state.menu; };
  Acts.logout = () => { KV.logout(); state.menu = false; location.hash = '#/'; return false; };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]'); if (!el) { if (e.target.closest('.mnav a')) { state.menu = false; } return; }
    const fn = Acts[el.dataset.act]; if (!fn) return;
    if (el.tagName === 'A') e.preventDefault();
    const r = fn(el, e); if (r !== false) render(true);
  });
  document.addEventListener('change', e => {
    const el = e.target.closest('[data-chg]'); if (!el) return;
    if (el.dataset.chg === 'lang') { KV.setLang(el.value); render(true); return; }
    const fn = Chg[el.dataset.chg]; if (fn) { fn(el); render(true); }
  });
  document.addEventListener('submit', async e => {
    const f = e.target.closest('form[data-form]'); if (!f) return; e.preventDefault();
    const fn = Forms[f.dataset.form]; if (!fn) return;
    const fd = new FormData(f); const d = Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string'));
    f.querySelectorAll('input[type=checkbox][name]').forEach(c => { if (!c.checked) delete d[c.name]; });
    try { await fn(d, f, fd); } catch (err) { console.error(err); KV.toast('Error: ' + err.message); }
  });

  window.App = { render };
  render(false);
})();
