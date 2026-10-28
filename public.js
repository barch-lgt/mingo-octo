/* KV Advisory sample — public site views. */
(function () {
  'use strict';
  const D = KVD, V = window.Views = {}, A = window.Acts = {}, F = window.Forms = {};
  const t = k => KV.t(k), L = o => KV.L(o), esc = s => KV.esc(s);
  const svc = id => D.services.find(s => s.id === id);
  const ph = (title, sub) => `<section class="pagehead"><div class="wrap"><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div></section>`;
  const sec = body => `<div class="wrap sec">${body}</div>`;
  const opt = (arr, val) => arr.map(([v, l]) => `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(l)}</option>`).join('');
  const fld = (label, inner, cls) => `<label class="fld ${cls || ''}"><span>${label}</span>${inner}</label>`;
  const initials = n => n.replace(/^Dr\.\s*/, '').split(' ').map(x => x[0]).slice(0, 2).join('');
  window.UI = { ph, sec, opt, fld };

  const caseCard = c => `<a class="card link" href="#/cases/${c.id}"><div class="tag">${esc(c.sector)} · ${esc(c.year)}</div><h3>${esc(L(c.title))}</h3><p>${esc(L(c.summary))}</p><div class="kpirow">${(c.kpis || []).slice(0, 3).map(k => `<div><b>${esc(k.v)}</b><span>${esc(k.k)}</span></div>`).join('')}</div></a>`;
  const insCard = i => `<a class="card link" href="#/insights/${i.id}"><div class="tag">${esc(i.tag)} · ${KV.date(i.date)}</div><h3>${esc(L(i.title))}</h3><p class="mut">${esc(i.author)}</p></a>`;

  V.home = () => {
    const db = KV.db;
    return `<section class="hero"><div class="wrap hero-grid"><div>
      <p class="eyebrow">${t('eyebrow')}</p><h1>${t('hero.h')}</h1><p class="lead">${t('hero.sub')}</p>
      <div class="btnrow"><a class="btn primary" href="#/proposal">${t('cta.proposal')}</a><a class="btn" href="#/portal">${t('nav.portal')}</a></div></div>
      <div class="kpis"><div><b>140+</b><span>Engagements (sample figure)</span></div><div><b>12</b><span>Sectors served</span></div><div><b>94%</b><span>Client retention</span></div><div><b>3</b><span>Working languages</span></div></div></div></section>
      ${sec(`<div class="sh"><h2>${t('sec.services')}</h2><a href="#/services">${t('sec.all')} →</a></div><div class="grid g3">${D.services.map(s => `<a class="card link" href="#/services/${s.id}"><h3>${esc(L(s.t))}</h3><p>${esc(L(s.d))}</p></a>`).join('')}</div>`)}
      <div class="band"><div class="wrap sec">${`<div class="sh"><h2>${t('sec.cases')}</h2><a href="#/cases">${t('sec.all')} →</a></div><div class="grid g3">${db.cases.slice(0, 3).map(caseCard).join('')}</div>`}</div></div>
      ${sec(`<div class="sh"><h2>${t('sec.insights')}</h2><a href="#/insights">${t('sec.all')} →</a></div><div class="grid g3">${[...db.insights].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3).map(insCard).join('')}</div>`)}
      <div class="cta"><div class="wrap"><h2>Discuss your next engagement</h2><p>Submit a request and track it from the client portal. This is a sample flow.</p><a class="btn primary light" href="#/proposal">${t('cta.proposal')}</a></div></div>`;
  };

  V.services = () => ph(t('nav.services'), t('svc.sub')) + sec(`<div class="grid g3">${D.services.map(s => `<a class="card link" href="#/services/${s.id}"><h3>${esc(L(s.t))}</h3><p>${esc(L(s.d))}</p><div class="meta"><span>${esc(s.wk)}</span><span>${esc(s.fee)}</span></div></a>`).join('')}</div>`);

  V.service = p => {
    const s = svc(p.id); if (!s) return V.notfound();
    return ph(esc(L(s.t)), esc(L(s.d))) + sec(`<div class="two"><div><h3>Typical deliverables</h3><ul class="ticks">${s.dl.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="panel"><h3>Engagement profile</h3><dl class="dl"><dt>Duration</dt><dd>${esc(s.wk)}</dd><dt>Indicative fee</dt><dd>${esc(s.fee)} (sample)</dd></dl><a class="btn primary" href="#/proposal?service=${s.id}">${t('cta.proposal')}</a></div></div>`);
  };

  V.cases = (p, q) => {
    const sectors = [...new Set(KV.db.cases.map(c => c.sector))]; const f = q.sector || '';
    const list = KV.db.cases.filter(c => !f || c.sector === f);
    return ph(t('nav.cases'), 'Outcomes from fictional engagements.') + sec(`<div class="filters">${['', ...sectors].map(s => `<a class="chip ${s === f ? 'on' : ''}" href="#/cases${s ? '?sector=' + encodeURIComponent(s) : ''}">${s || 'All sectors'}</a>`).join('')}</div><div class="grid g2">${list.map(caseCard).join('') || '<p class="mut">No case studies.</p>'}</div>`);
  };
  V.case = p => {
    const c = KV.db.cases.find(x => x.id === p.id); if (!c) return V.notfound();
    return ph(esc(L(c.title)), `${esc(c.client)} · ${esc(c.sector)} · ${esc(c.year)}`) + sec(`<div class="kpis wide">${(c.kpis || []).map(k => `<div><b>${esc(k.v)}</b><span>${esc(k.k)}</span></div>`).join('')}</div><div class="prose">${(c.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</div><p><a href="#/cases">← ${t('nav.cases')}</a></p>`);
  };

  V.insights = (p, q) => {
    const tags = [...new Set(KV.db.insights.map(i => i.tag))]; const f = q.tag || '';
    const list = KV.db.insights.filter(i => !f || i.tag === f).sort((a, b) => b.date.localeCompare(a.date));
    return ph(t('nav.insights'), 'Practical notes from our practices.') + sec(`<div class="filters">${['', ...tags].map(s => `<a class="chip ${s === f ? 'on' : ''}" href="#/insights${s ? '?tag=' + encodeURIComponent(s) : ''}">${s || 'All topics'}</a>`).join('')}</div><div class="grid g3">${list.map(insCard).join('')}</div>`);
  };
  V.insight = p => {
    const i = KV.db.insights.find(x => x.id === p.id); if (!i) return V.notfound();
    return ph(esc(L(i.title)), `${esc(i.tag)} · ${esc(i.author)} · ${KV.date(i.date)}`) + sec(`<div class="prose">${(i.body || []).map(x => `<p>${esc(x)}</p>`).join('')}</div><p><a href="#/insights">← ${t('nav.insights')}</a></p>`);
  };

  V.team = () => ph(t('nav.team'), 'Fictional leadership team.') + sec(`<div class="grid g3">${D.team.map(m => `<div class="card person"><div class="avatar">${esc(initials(m.n))}</div><h3>${esc(m.n)}</h3><div class="tag">${esc(m.r)}</div><p>${esc(m.b)}</p></div>`).join('')}</div>`);

  V.careers = () => ph(t('nav.careers'), 'Open roles (sample listings).') + sec(`<div class="tscroll"><table class="tbl"><thead><tr><th>Role</th><th>Practice</th><th>Location</th><th>Type</th><th></th></tr></thead><tbody>${KV.db.jobs.filter(j => j.open).map(j => `<tr><td data-l="Role"><a href="#/careers/${j.id}">${esc(L(j.title))}</a></td><td data-l="Practice">${esc(j.dept)}</td><td data-l="Location">${esc(j.loc)}</td><td data-l="Type">${esc(j.type)}</td><td><a class="btn sm" href="#/careers/${j.id}">View</a></td></tr>`).join('') || '<tr><td colspan="5">No open roles.</td></tr>'}</tbody></table>`);
  V.job = (p, q) => {
    const j = KV.db.jobs.find(x => x.id === p.id); if (!j) return V.notfound();
    const me = KV.me();
    return ph(esc(L(j.title)), `${esc(j.dept)} · ${esc(j.loc)} · ${esc(j.type)}`) + sec(`<div class="two"><div class="prose"><p>${esc(L(j.desc))}</p><p class="mut">Posted ${KV.date(j.posted)}</p></div>
      <form class="panel form" data-form="apply"><h3>Apply</h3><input type="hidden" name="job" value="${j.id}">${fld('Full name', `<input name="name" required value="${esc(me ? me.name : '')}">`)}${fld('Email', `<input type="email" name="email" required value="${esc(me ? me.email : '')}">`)}${fld('Cover note', '<textarea name="note" rows="4" required></textarea>')}${fld('CV (optional, stored in your browser only)', '<input type="file" name="cv">')}<button class="btn primary">Submit application</button>${q.done ? '<p class="ok">Application received (simulated).</p>' : ''}</form></div>`);
  };
  F.apply = async (d, f, fd) => {
    const file = await KV.readFile(fd.get('cv'));
    const a = { id: KV.next('A', 'A-'), ts: new Date().toISOString(), job: d.job, name: d.name, email: d.email, note: d.note, file, status: 'new' };
    KV.db.applications.unshift(a); KV.notify('admin', `New application from ${d.name}`, '/admin/leads');
    KV.mail(d.email, 'We received your application (sample)', 'This is a simulated confirmation.'); KV.log('application', a.id); KV.save();
    location.hash = `#/careers/${d.job}?done=1`;
  };

  V.proposal = (p, q) => {
    const me = KV.me();
    return ph(t('cta.proposal'), 'Tell us about the engagement. A reference number is issued immediately.') + sec(`<form class="panel form two-col" data-form="proposal">
      ${fld('Full name', `<input name="name" required value="${esc(me ? me.name : '')}">`)}${fld('Work email', `<input type="email" name="email" required value="${esc(me ? me.email : '')}">`)}
      ${fld('Organisation', `<input name="org" required value="${esc(me ? me.org : '')}">`)}${fld('Service', `<select name="service">${opt(D.services.map(s => [s.id, L(s.t)]), q.service)}</select>`)}
      ${fld('Indicative budget', `<select name="budget">${opt(['Under ETB 2M', 'ETB 2–5M', 'ETB 5M+', 'Not sure'].map(x => [x, x]))}</select>`)}${fld('Timeline', `<select name="timeline">${opt(['Under 2 months', '3 months', '4–6 months', '6+ months'].map(x => [x, x]))}</select>`)}
      ${fld('Brief', '<textarea name="msg" rows="5" required></textarea>', 'full')}${fld('Attachment (optional; kept in your browser, never uploaded)', '<input type="file" name="file">', 'full')}
      <label class="chk full"><input type="checkbox" required> I understand this is a sample site and no real request is sent.</label><div class="full"><button class="btn primary">Submit request</button></div></form>`);
  };
  F.proposal = async (d, f, fd) => {
    const file = await KV.readFile(fd.get('file'));
    const l = { id: KV.next('L', 'L-'), ts: new Date().toISOString(), name: d.name, email: d.email, org: d.org, service: d.service, budget: d.budget, timeline: d.timeline, msg: d.msg, file, status: 'new' };
    KV.db.leads.unshift(l); KV.notify('admin', `New proposal request ${l.id} from ${l.org}`, '/admin/leads');
    KV.mail(d.email, `Proposal request ${l.id} received (sample)`, `Thank you ${d.name}. Your reference is ${l.id}. This is a simulated email.`);
    KV.mail('admin@kv-sample.demo', `New lead ${l.id}`, `${d.name} (${d.org}) requested ${d.service}.`); KV.log('lead', l.id); KV.save();
    location.hash = '#/proposal/done/' + l.id;
  };
  V.proposalDone = p => ph('Request received', `Reference <b>${esc(p.id)}</b>`) + sec(`<div class="panel"><p>Your request is now visible to the admin console. A simulated confirmation email was written to the Outbox (admin console → Outbox).</p><p>Create a client account with the same email to track its status in the portal.</p><div class="btnrow"><a class="btn primary" href="#/register">${t('nav.register')}</a><a class="btn" href="#/">Home</a></div></div>`);

  V.search = (p, q) => {
    const s = (q.q || '').trim().toLowerCase(); const db = KV.db; let res = [];
    if (s) {
      const m = (...a) => a.join(' ').toLowerCase().includes(s);
      D.services.forEach(x => m(L(x.t), L(x.d), x.dl.join(' ')) && res.push(['Service', L(x.t), '/services/' + x.id]));
      db.cases.forEach(x => m(L(x.title), x.client, x.sector, L(x.summary), (x.body || []).join(' ')) && res.push(['Case study', L(x.title), '/cases/' + x.id]));
      db.insights.forEach(x => m(L(x.title), x.tag, x.author, (x.body || []).join(' ')) && res.push(['Insight', L(x.title), '/insights/' + x.id]));
      db.jobs.forEach(x => x.open && m(L(x.title), x.dept, L(x.desc)) && res.push(['Career', L(x.title), '/careers/' + x.id]));
      D.team.forEach(x => m(x.n, x.r, x.b) && res.push(['Team', x.n, '/team']));
    }
    return ph(t('nav.search')) + sec(`<form class="searchbar" data-form="search"><input name="q" value="${esc(q.q || '')}" placeholder="Search services, cases, insights, roles…" aria-label="Search"><button class="btn primary">${t('nav.search')}</button></form>
      ${s ? `<p class="mut">${res.length} result${res.length === 1 ? '' : 's'}</p>` : ''}<ul class="results">${res.map(r => `<li><span class="tag">${r[0]}</span><a href="#${r[2]}">${esc(r[1])}</a></li>`).join('')}</ul>`);
  };
  F.search = d => { location.hash = '#/search?q=' + encodeURIComponent(d.q || ''); };

  V.login = (p, q) => ph(t('nav.login'), 'Client and admin access to the sample portal.') + sec(`<div class="two"><form class="panel form" data-form="login"><input type="hidden" name="next" value="${esc(q.next || '')}">${fld('Email', '<input type="email" name="email" id="lemail" required autocomplete="username">')}${fld('Password', '<input type="password" name="password" id="lpw" required autocomplete="current-password">')}<button class="btn primary">${t('nav.login')}</button><p class="mut">No account? <a href="#/register">${t('nav.register')}</a></p></form>
      <div class="panel"><h3>Demo accounts</h3><p class="mut">Passwords are all <code>demo</code>. Click to fill the form.</p><div class="demo"><button class="btn" data-act="fill" data-e="client@kv-sample.demo">Client — Abay Logistics</button><button class="btn" data-act="fill" data-e="client2@kv-sample.demo">Client — Selam Foods</button><button class="btn" data-act="fill" data-e="admin@kv-sample.demo">Admin console</button></div></div></div>`);
  A.fill = el => { document.getElementById('lemail').value = el.dataset.e; document.getElementById('lpw').value = 'demo'; return false; };
  F.login = d => {
    const r = KV.login(d.email, d.password); if (r.err) { KV.toast(r.err); return; }
    location.hash = '#' + (d.next || (r.user.role === 'admin' ? '/admin' : '/portal'));
  };
  V.register = () => ph(t('nav.register'), 'Create a sample client account.') + sec(`<form class="panel form narrow" data-form="register">${fld('Full name', '<input name="name" required>')}${fld('Email', '<input type="email" name="email" required>')}${fld('Organisation', '<input name="org">')}${fld('Password (min 6)', '<input type="password" name="password" minlength="6" required autocomplete="new-password">')}<p class="mut">Do not enter real personal data. Everything stays in this browser.</p><button class="btn primary">${t('nav.register')}</button></form>`);
  F.register = d => { const r = KV.register(d); if (r.err) { KV.toast(r.err); return; } location.hash = '#/portal'; };

  V.notfound = () => ph('Page not found', 'The page you requested does not exist in this sample.') + sec('<a class="btn" href="#/">Home</a>');
  V.forbidden = () => ph('Access restricted', 'Your role cannot view this page.') + sec('<a class="btn" href="#/">Home</a>');
})();
