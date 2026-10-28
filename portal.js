/* KV Advisory sample — client portal and admin console. */
(function () {
  'use strict';
  const D = KVD, V = Views, A = Acts, F = Forms, { ph, opt, fld } = UI;
  const esc = s => KV.esc(s), L = o => KV.L(o), db = () => KV.db;
  const svcName = id => { const s = D.services.find(x => x.id === id); return s ? L(s.t) : id; };
  const userOf = id => db().users.find(u => u.id === id);
  const badge = s => `<span class="badge b-${esc(s)}">${esc(s)}</span>`;
  const bar = n => `<div class="bar" title="${n}%"><i style="width:${n}%"></i><em>${n}%</em></div>`;
  const kp = arr => `<div class="kpis wide">${arr.map(([v, l]) => `<div><b>${v}</b><span>${l}</span></div>`).join('')}</div>`;
  const tbl = (head, rows, empty) => `<div class="tscroll"><table class="tbl"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="mut">${empty || 'Nothing to show.'}</td></tr>`}</tbody></table></div>`;
  const td = (l, v) => `<td data-l="${l}">${v}</td>`;

  const shell = (kind, active, title, body) => {
    const links = kind === 'staff' ? [['/staff', 'Dashboard'], ['/staff/projects', 'My projects']] : kind === 'admin'
      ? [['/admin', 'Overview'], ['/admin/leads', 'Leads'], ['/admin/projects', 'Projects'], ['/admin/invoices', 'Invoices'], ['/admin/cms', 'Content (CMS)'], ['/admin/users', 'Users'], ['/admin/outbox', 'Outbox'], ['/admin/log', 'Audit log']]
      : [['/portal', 'Dashboard'], ['/portal/projects', 'Projects'], ['/portal/invoices', 'Invoices'], ['/portal/messages', 'Messages'], ['/portal/requests', 'Requests'], ['/portal/profile', 'Profile']];
    return `<div class="wrap shell"><aside class="side"><div class="sidehd">${kind === 'admin' ? 'Admin console' : kind === 'staff' ? 'Staff workspace' : 'Client portal'}</div><nav>${links.map(([h, l]) => `<a href="#${h}" class="${active === h ? 'on' : ''}">${l}</a>`).join('')}</nav></aside><div class="content"><h1 class="ct">${title}</h1>${body}</div></div>`;
  };
  const notes = u => {
    const n = KV.myNotes(u).slice(0, 8);
    return `<div class="sh"><h3>Notifications</h3><button class="btn sm" data-act="readall">Mark all read</button></div><ul class="notes">${n.map(x => `<li class="${x.read ? '' : 'unread'}"><a href="#${x.link || '/'}" data-act="readone" data-id="${x.id}">${esc(x.text)}</a><span>${KV.dt(x.ts)}</span></li>`).join('') || '<li class="mut">No notifications.</li>'}</ul>`;
  };
  A.readall = () => { KV.myNotes(KV.me()).forEach(n => n.read = true); KV.save(); };
  A.readone = el => { const n = db().notifications.find(x => x.id === el.dataset.id); if (n) { n.read = true; KV.save(); } return false; };

  /* ---------- CLIENT ---------- */
  const mine = () => db().projects.filter(p => p.userId === KV.me().id);
  const myInv = () => db().invoices.filter(i => i.userId === KV.me().id && i.status !== 'draft');

  V.pDash = () => {
    const me = KV.me(), ps = mine(), inv = myInv(), open = inv.filter(i => ['sent', 'overdue'].includes(i.status));
    const nxt = ps.flatMap(p => p.milestones.filter(m => !m.done).map(m => ({ ...m, p }))).sort((a, b) => a.due.localeCompare(b.due))[0];
    return shell('portal', '/portal', `Welcome, ${esc(me.name)}`, `<p class="mut">${esc(me.org)}</p>${kp([[ps.filter(p => p.status !== 'closed').length, 'Active projects'], [KV.money(open.reduce((s, i) => s + KV.invTotal(i), 0)), 'Outstanding invoices'], [nxt ? KV.date(nxt.due) : '—', nxt ? 'Next milestone: ' + esc(nxt.title) : 'Next milestone']])}
      <div class="sh"><h3>Projects</h3><a href="#/portal/projects">All →</a></div>${projTable(ps, '/portal/projects/')}${notes(me)}`);
  };
  const projTable = (ps, base, admin) => tbl(['Ref', 'Project', admin ? 'Client' : 'Lead', 'Status', 'Progress', 'End'], ps.map(p => `<tr>${td('Ref', esc(p.id))}${td('Project', `<a href="#${base}${p.id}">${esc(p.title)}</a>`)}${td(admin ? 'Client' : 'Lead', esc(admin ? (userOf(p.userId) || {}).org : p.lead))}${td('Status', badge(p.status))}${td('Progress', bar(KV.progress(p)))}${td('End', KV.date(p.end))}</tr>`), 'No projects yet.');
  V.pProjects = () => shell('portal', '/portal/projects', 'Projects', projTable(mine(), '/portal/projects/'));

  function projectDetail(id, kind) {
    const p = db().projects.find(x => x.id === id), me = KV.me(); const admin = kind !== 'portal', full = kind === 'admin';
    if (!p || (!admin && p.userId !== me.id)) return V.notfound();
    const base = '/' + kind, cl = userOf(p.userId) || {};
    const invs = db().invoices.filter(i => i.projectId === p.id && (admin || i.status !== 'draft'));
    return shell(kind, base + '/projects', esc(p.title), `<p class="mut"><a href="#${base}/projects">← Projects</a> · ${esc(p.id)} · ${esc(svcName(p.service))}${admin ? ' · ' + esc(cl.org || '') : ''}</p>
      ${kp([[badge(p.status), 'Status'], [esc(p.lead), 'Engagement lead'], [KV.date(p.start) + ' – ' + KV.date(p.end), 'Period'], [KV.money(p.budget), 'Budget']])}
      ${full ? `<div class="panel row"><label class="fld"><span>Status</span><select data-chg="pstatus" data-id="${p.id}">${opt(['planning', 'active', 'review', 'closed'].map(x => [x, x]), p.status)}</select></label></div>` : ''}
      <div class="sh"><h3>Milestones</h3>${bar(KV.progress(p))}</div>
      <ol class="timeline">${p.milestones.map(m => `<li class="${m.done ? 'done' : ''}"><div><b>${esc(m.title)}</b><span>Due ${KV.date(m.due)}</span></div>${admin ? `<div class="acts"><button class="btn sm" data-act="mtoggle" data-p="${p.id}" data-m="${m.id}">${m.done ? 'Reopen' : 'Mark done'}</button><button class="btn sm ghost" data-act="mdel" data-p="${p.id}" data-m="${m.id}">Remove</button></div>` : badge(m.done ? 'done' : 'open')}</li>`).join('')}</ol>
      ${admin ? `<form class="inline" data-form="madd"><input type="hidden" name="p" value="${p.id}"><input name="title" placeholder="New milestone" required><input type="date" name="due" required><button class="btn sm primary">Add</button></form>` : ''}
      <div class="sh"><h3>Messages</h3></div><div class="thread">${p.messages.map(m => { const u = userOf(m.from) || {}; return `<div class="msg ${u.role === 'admin' ? 'staff' : ''}"><b>${esc(u.name || 'Unknown')}${u.role === 'admin' ? ' · KV Advisory' : ''}</b><span>${KV.dt(m.ts)}</span><p>${esc(m.text)}</p></div>`; }).join('') || '<p class="mut">No messages yet.</p>'}</div>
      <form class="inline" data-form="msg"><input type="hidden" name="p" value="${p.id}"><input name="text" placeholder="Write a message…" required autocomplete="off"><button class="btn sm primary">Send</button></form>
      ${full || !admin ? `<div class="sh"><h3>Invoices</h3></div>${invTable(invs, base, admin)}` : ''}`);
  }
  V.sDash = () => {
    const me = KV.me(), ps = db().projects.filter(p => p.status !== 'closed'), ms = ps.flatMap(p => p.milestones.filter(m => !m.done).map(m => ({ ...m, p }))).sort((a, b) => a.due.localeCompare(b.due)).slice(0, 8);
    return shell('staff', '/staff', `Welcome, ${esc(me.name)}`, `<p class="mut">Staff workspace (sample). Staff can update milestones and message clients; billing and user management are admin-only.</p>${kp([[ps.length, 'Open projects'], [ms.length, 'Upcoming milestones']])}<div class="sh"><h3>Next milestones</h3></div>${tbl(['Due', 'Milestone', 'Project'], ms.map(m => `<tr>${td('Due', KV.date(m.due))}${td('Milestone', esc(m.title))}${td('Project', `<a href="#/staff/projects/${m.p.id}">${esc(m.p.title)}</a>`)}</tr>`), 'Nothing due.')}${notes(me)}`);
  };
  V.sProjects = () => shell('staff', '/staff/projects', 'My projects', projTable(db().projects, '/staff/projects/', true));
  V.sProject = p => projectDetail(p.id, 'staff');
  V.pProject = p => projectDetail(p.id, 'portal');
  V.aProject = p => projectDetail(p.id, 'admin');
  F.msg = d => {
    const p = db().projects.find(x => x.id === d.p), me = KV.me(); if (!p || (me.role === 'client' && p.userId !== me.id)) return;
    p.messages.push({ id: KV.rid(), from: me.id, text: d.text.trim(), ts: new Date().toISOString() });
    if (me.role !== 'client') { const c = userOf(p.userId); KV.notify(c.id, `New message on ${p.title}`, '/portal/projects/' + p.id); KV.mail(c.email, `New message on ${p.title} (sample)`, d.text); }
    else KV.notify('admin', `${me.name}: new message on ${p.title}`, '/admin/projects/' + p.id);
    KV.log('message', p.id); KV.save(); KV.rerender();
  };
  V.pMessages = () => {
    const rows = mine().filter(p => p.messages.length).map(p => { const m = p.messages[p.messages.length - 1], u = userOf(m.from) || {}; return `<tr>${td('Project', `<a href="#/portal/projects/${p.id}">${esc(p.title)}</a>`)}${td('Last message', `${esc(u.name)}: ${esc(m.text.slice(0, 90))}`)}${td('When', KV.dt(m.ts))}</tr>`; });
    return shell('portal', '/portal/messages', 'Messages', tbl(['Project', 'Last message', 'When'], rows, 'No conversations yet.'));
  };
  V.pRequests = () => {
    const me = KV.me(), ls = db().leads.filter(l => l.email.toLowerCase() === me.email.toLowerCase());
    return shell('portal', '/portal/requests', 'Proposal requests', tbl(['Ref', 'Service', 'Submitted', 'Status'], ls.map(l => `<tr>${td('Ref', l.id)}${td('Service', esc(svcName(l.service)))}${td('Submitted', KV.date(l.ts))}${td('Status', badge(l.status))}</tr>`), 'No requests under your email.') + '<p><a class="btn" href="#/proposal">New request</a></p>');
  };
  V.pProfile = () => {
    const me = KV.me();
    return shell('portal', '/portal/profile', 'Profile', `<form class="panel form narrow" data-form="profile">${fld('Name', `<input name="name" value="${esc(me.name)}" required>`)}${fld('Organisation', `<input name="org" value="${esc(me.org)}">`)}${fld('Email', `<input value="${esc(me.email)}" disabled>`)}${fld('New password (optional)', '<input type="password" name="pw" minlength="6" autocomplete="new-password">')}<button class="btn primary">Save</button></form>`);
  };
  F.profile = d => { const me = KV.me(); me.name = d.name.trim(); me.org = d.org.trim(); if (d.pw) me.hash = KV.hashPw(d.pw); KV.log('profile', me.email); KV.save(); KV.toast('Profile saved.'); KV.rerender(); };

  /* ---------- invoices ---------- */
  const invTable = (ivs, base, admin) => tbl(['Number', 'Issued', 'Due', 'Total', 'Status', ''], ivs.map(i => `<tr>${td('Number', `<a href="#${base}/invoices/${i.id}">${i.id}</a>`)}${td('Issued', KV.date(i.issued))}${td('Due', KV.date(i.due))}${td('Total', KV.money(KV.invTotal(i)))}${td('Status', badge(i.status))}<td>${admin ? invActs(i) : ''}</td></tr>`), 'No invoices.');
  const invActs = i => i.status === 'paid' ? '' : `<button class="btn sm" data-act="inv" data-id="${i.id}" data-s="${i.status === 'draft' ? 'sent' : 'paid'}">${i.status === 'draft' ? 'Send' : 'Mark paid'}</button>`;
  V.pInvoices = () => shell('portal', '/portal/invoices', 'Invoices', invTable(myInv(), '/portal'));
  A.inv = el => {
    const i = db().invoices.find(x => x.id === el.dataset.id); i.status = el.dataset.s; KV.log('invoice', i.id + ' → ' + i.status);
    if (i.status === 'sent') { const c = userOf(i.userId); KV.notify(c.id, `Invoice ${i.id} issued`, '/portal/invoices/' + i.id); KV.mail(c.email, `Invoice ${i.id} (sample)`, `Total ${KV.money(KV.invTotal(i))}. Sample document only.`); }
    KV.save();
  };
  function invoiceDoc(id, kind) {
    const i = db().invoices.find(x => x.id === id), me = KV.me(); const admin = kind === 'admin';
    if (!i || (!admin && (i.userId !== me.id || i.status === 'draft'))) return V.notfound();
    const c = userOf(i.userId) || {}, p = db().projects.find(x => x.id === i.projectId) || {}, sub = KV.invSub(i);
    return shell(kind, (admin ? '/admin' : '/portal') + '/invoices', 'Invoice ' + i.id, `<p class="noprint"><a href="#${admin ? '/admin' : '/portal'}/invoices">← Invoices</a> <button class="btn primary sm" data-act="print">Print / save as PDF</button></p>
      <div class="invoice"><div class="wm">SAMPLE</div><div class="ih"><div><h2>KV Advisory</h2><p class="mut">Fictional firm · Addis Ababa<br>TIN 0000000000 (placeholder)</p></div><div class="ir"><b>${i.id}</b><br>${badge(i.status)}<br>Issued ${KV.date(i.issued)}<br>Due ${KV.date(i.due)}</div></div>
      <p><b>Bill to</b><br>${esc(c.name)}<br>${esc(c.org)}<br>Project: ${esc(p.title || '')} (${esc(i.projectId)})</p>
      <table class="tbl"><thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead><tbody>${i.items.map(x => `<tr><td>${esc(x.d)}</td><td>${x.q}</td><td>${KV.money(x.r)}</td><td>${KV.money(x.q * x.r)}</td></tr>`).join('')}</tbody></table>
      <table class="sum"><tr><td>Subtotal</td><td>${KV.money(sub)}</td></tr><tr><td>VAT 15%</td><td>${KV.money(KV.invTotal(i) - sub)}</td></tr><tr class="tot"><td>Total</td><td>${KV.money(KV.invTotal(i))}</td></tr></table>
      <p class="mut small">SAMPLE DOCUMENT — not a valid tax invoice. No payment is requested.</p></div>`);
  }
  V.pInvoice = p => invoiceDoc(p.id, 'portal'); V.aInvoice = p => invoiceDoc(p.id, 'admin');
  A.print = () => { window.print(); return false; };

  /* ---------- ADMIN ---------- */
  V.aDash = () => {
    const d = db(), ar = d.invoices.filter(i => ['sent', 'overdue'].includes(i.status)).reduce((s, i) => s + KV.invTotal(i), 0), paid = d.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + KV.invTotal(i), 0);
    return shell('admin', '/admin', 'Overview', `${kp([[d.leads.filter(l => l.status === 'new').length, 'New leads'], [d.projects.filter(p => p.status === 'active').length, 'Active projects'], [KV.money(ar), 'Receivables'], [KV.money(paid), 'Collected']])}
      <div class="sh"><h3>Latest leads</h3><a href="#/admin/leads">All →</a></div>${tbl(['Ref', 'Organisation', 'Service', 'Status'], d.leads.slice(0, 5).map(l => `<tr>${td('Ref', l.id)}${td('Organisation', esc(l.org))}${td('Service', esc(svcName(l.service)))}${td('Status', badge(l.status))}</tr>`))}
      <div class="sh"><h3>Recent activity</h3><a href="#/admin/log">All →</a></div>${tbl(['When', 'User', 'Action', 'Detail'], d.log.slice(0, 6).map(x => `<tr>${td('When', KV.dt(x.ts))}${td('User', esc(x.user))}${td('Action', esc(x.action))}${td('Detail', esc(x.detail))}</tr>`), 'No activity yet.')}${notes(KV.me())}
      <p><button class="btn ghost" data-act="reset">Reset all sample data</button></p>`);
  };
  A.reset = () => { if (confirm('Reset all sample data in this browser?')) { KV.reset(); location.hash = '#/'; } return false; };

  V.aLeads = () => {
    const d = db(), st = ['new', 'contacted', 'qualified', 'won', 'lost'];
    return shell('admin', '/admin/leads', 'Leads', `<p><button class="btn sm" data-act="csv">Export CSV</button></p>${tbl(['Ref', 'Contact', 'Service', 'Budget', 'Received', 'Status', ''], d.leads.map(l => `<tr>${td('Ref', l.id)}${td('Contact', `<b>${esc(l.name)}</b><br><span class="mut">${esc(l.org)}<br>${esc(l.email)}</span><details><summary>Brief</summary>${esc(l.msg)}${l.file ? `<br><span class="mut">File: ${esc(l.file.name)} (${Math.round(l.file.size / 1024)} KB)</span>${l.file.data ? ` <a href="${l.file.data}" download="${esc(l.file.name)}">download</a>` : ''}` : ''}</details>`)}${td('Service', esc(svcName(l.service)))}${td('Budget', esc(l.budget))}${td('Received', KV.date(l.ts))}${td('Status', `<select data-chg="lstatus" data-id="${l.id}">${opt(st.map(x => [x, x]), l.status)}</select>`)}<td><button class="btn sm" data-act="convert" data-id="${l.id}">Convert to project</button></td></tr>`), 'No leads.')}
      <div class="sh"><h3>Job applications</h3></div>${tbl(['Ref', 'Applicant', 'Role', 'Received', 'Note'], d.applications.map(a => { const j = d.jobs.find(x => x.id === a.job); return `<tr>${td('Ref', a.id)}${td('Applicant', `${esc(a.name)}<br><span class="mut">${esc(a.email)}</span>`)}${td('Role', esc(j ? L(j.title) : a.job))}${td('Received', KV.date(a.ts))}${td('Note', esc(a.note))}</tr>`; }), 'No applications yet.')}`);
  };
  A.csv = () => { const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; KV.download('leads.csv', 'id,received,name,email,org,service,budget,timeline,status\n' + db().leads.map(l => [l.id, l.ts, l.name, l.email, l.org, l.service, l.budget, l.timeline, l.status].map(q).join(',')).join('\n'), 'text/csv'); return false; };
  A.convert = el => {
    const l = db().leads.find(x => x.id === el.dataset.id); let u = db().users.find(x => x.email.toLowerCase() === l.email.toLowerCase());
    if (!u) { u = { id: KV.next('U', 'u'), name: l.name, email: l.email.toLowerCase(), role: 'client', org: l.org, hash: KV.hashPw('demo'), created: new Date().toISOString() }; db().users.push(u); KV.mail(u.email, 'Your client portal account (sample)', 'Temporary password: demo. Simulated email.'); }
    const today = new Date(), end = new Date(today.getTime() + 90 * 864e5), iso = x => x.toISOString().slice(0, 10);
    const p = { id: KV.next('P', 'P-'), userId: u.id, title: `${svcName(l.service)} — ${l.org.replace(/ \(fictional\)/, '')}`, service: l.service, status: 'planning', start: iso(today), end: iso(end), lead: 'To be assigned', budget: 0, milestones: [{ id: 'm1', title: 'Kick-off', due: iso(new Date(today.getTime() + 7 * 864e5)), done: false }], messages: [] };
    db().projects.unshift(p); l.status = 'won'; KV.notify(u.id, `Project ${p.id} created for you`, '/portal/projects/' + p.id); KV.log('convert', `${l.id} → ${p.id}`); KV.save(); KV.toast('Project ' + p.id + ' created.'); location.hash = '#/admin/projects/' + p.id; return false;
  };
  const chg = window.Chg = {};
  chg.lstatus = el => { db().leads.find(x => x.id === el.dataset.id).status = el.value; KV.log('lead status', el.dataset.id + ' → ' + el.value); KV.save(); };
  chg.pstatus = el => { const p = db().projects.find(x => x.id === el.dataset.id); p.status = el.value; KV.notify(p.userId, `${p.title} is now ${p.status}`, '/portal/projects/' + p.id); KV.log('project status', p.id + ' → ' + p.status); KV.save(); };
  chg.urole = el => { db().users.find(x => x.id === el.dataset.id).role = el.value; KV.log('user role', el.dataset.id + ' → ' + el.value); KV.save(); };

  V.aProjects = () => {
    const clients = db().users.filter(u => u.role === 'client');
    return shell('admin', '/admin/projects', 'Projects', projTable(db().projects, '/admin/projects/', true) + `<div class="sh"><h3>New project</h3></div><form class="panel form two-col" data-form="pnew">${fld('Title', '<input name="title" required>')}${fld('Client', `<select name="user">${opt(clients.map(u => [u.id, u.org || u.name]))}</select>`)}${fld('Service', `<select name="service">${opt(D.services.map(s => [s.id, L(s.t)]))}</select>`)}${fld('Engagement lead', `<select name="lead">${opt(D.team.map(m => [m.n, m.n]))}</select>`)}${fld('Start', '<input type="date" name="start" required>')}${fld('End', '<input type="date" name="end" required>')}${fld('Budget (ETB)', '<input type="number" name="budget" min="0" value="0">')}<div class="full"><button class="btn primary">Create project</button></div></form>`);
  };
  F.pnew = d => { const p = { id: KV.next('P', 'P-'), userId: d.user, title: d.title, service: d.service, status: 'planning', start: d.start, end: d.end, lead: d.lead, budget: +d.budget || 0, milestones: [], messages: [] }; db().projects.unshift(p); KV.notify(d.user, `Project ${p.id} created`, '/portal/projects/' + p.id); KV.log('project', p.id); KV.save(); location.hash = '#/admin/projects/' + p.id; };
  A.mtoggle = el => { const m = db().projects.find(x => x.id === el.dataset.p).milestones.find(x => x.id === el.dataset.m); m.done = !m.done; const p = db().projects.find(x => x.id === el.dataset.p); if (m.done) KV.notify(p.userId, `Milestone complete: ${m.title}`, '/portal/projects/' + p.id); KV.log('milestone', p.id + ' ' + m.title); KV.save(); };
  A.mdel = el => { const p = db().projects.find(x => x.id === el.dataset.p); p.milestones = p.milestones.filter(x => x.id !== el.dataset.m); KV.save(); };
  F.madd = d => { db().projects.find(x => x.id === d.p).milestones.push({ id: KV.rid(), title: d.title, due: d.due, done: false }); KV.save(); KV.rerender(); };

  V.aInvoices = () => {
    const ps = db().projects;
    return shell('admin', '/admin/invoices', 'Invoices', invTable(db().invoices, '/admin', true) + `<div class="sh"><h3>New invoice</h3></div><form class="panel form" data-form="inew">${fld('Project', `<select name="p">${opt(ps.map(p => [p.id, p.id + ' — ' + p.title]))}</select>`)}${fld('Line items — one per line: description | quantity | rate', '<textarea name="lines" rows="4" required placeholder="Workshop facilitation | 2 | 120000"></textarea>')}${fld('Payment terms (days)', '<input type="number" name="days" value="30" min="0">')}<button class="btn primary">Create draft</button></form>`);
  };
  F.inew = d => {
    const items = d.lines.split('\n').map(x => x.split('|').map(s => s.trim())).filter(a => a[0]).map(a => ({ d: a[0], q: +a[1] || 1, r: +a[2] || 0 }));
    if (!items.length) return KV.toast('Add at least one line.');
    const p = db().projects.find(x => x.id === d.p), now = new Date(), due = new Date(now.getTime() + (+d.days || 0) * 864e5);
    const i = { id: KV.next('INV', 'INV-2026-', 3), projectId: p.id, userId: p.userId, issued: now.toISOString().slice(0, 10), due: due.toISOString().slice(0, 10), status: 'draft', items };
    db().invoices.unshift(i); KV.log('invoice', i.id); KV.save(); location.hash = '#/admin/invoices/' + i.id;
  };

  /* CMS */
  const CMS = { insights: 'Insights', cases: 'Case studies', jobs: 'Job postings' };
  V.aCms = (p, q) => {
    const type = CMS[q.type] ? q.type : 'insights', list = db()[type], edit = q.edit;
    const item = edit && edit !== 'new' ? list.find(x => x.id === edit) : null;
    const tabs = `<div class="filters">${Object.entries(CMS).map(([k, v]) => `<a class="chip ${k === type ? 'on' : ''}" href="#/admin/cms?type=${k}">${v}</a>`).join('')}</div>`;
    const rows = list.map(x => `<tr>${td('Title', esc(L(x.title)))}${td('Info', esc(type === 'insights' ? x.tag + ' · ' + KV.date(x.date) : type === 'cases' ? x.sector + ' · ' + x.year : x.dept + (x.open ? '' : ' · closed')))}<td><a class="btn sm" href="#/admin/cms?type=${type}&edit=${x.id}">Edit</a> <button class="btn sm ghost" data-act="cmsdel" data-type="${type}" data-id="${x.id}">Delete</button></td></tr>`);
    const v = item || {};
    const common = fld('Title', `<input name="title" required value="${esc(L(v.title))}">`);
    const bodyF = fld('Body (paragraphs separated by a blank line)', `<textarea name="body" rows="7">${esc((v.body || []).join('\n\n'))}</textarea>`, 'full');
    const f = type === 'insights' ? common + fld('Topic', `<input name="tag" value="${esc(v.tag || '')}" required>`) + fld('Author', `<input name="author" value="${esc(v.author || '')}" required>`) + bodyF
      : type === 'cases' ? common + fld('Client', `<input name="client" value="${esc(v.client || '')}" required>`) + fld('Sector', `<input name="sector" value="${esc(v.sector || '')}" required>`) + fld('Year', `<input name="year" type="number" value="${esc(v.year || new Date().getFullYear())}">`) + fld('Summary', `<input name="summary" value="${esc(L(v.summary))}" required>`, 'full') + fld('KPIs — one per line: label | value', `<textarea name="kpis" rows="3">${esc((v.kpis || []).map(k => k.k + ' | ' + k.v).join('\n'))}</textarea>`, 'full') + bodyF
        : common + fld('Practice', `<input name="dept" value="${esc(v.dept || '')}" required>`) + fld('Location', `<input name="loc" value="${esc(v.loc || 'Addis Ababa')}">`) + fld('Type', `<input name="type" value="${esc(v.type || 'Full-time')}">`) + fld('Description', `<textarea name="desc" rows="4">${esc(L(v.desc))}</textarea>`, 'full') + `<label class="chk full"><input type="checkbox" name="open" ${v.open === false ? '' : 'checked'}> Open for applications</label>`;
    return shell('admin', '/admin/cms', 'Content (CMS)', tabs + tbl(['Title', 'Info', ''], rows) + `<p><a class="btn" href="#/admin/cms?type=${type}&edit=new">New ${CMS[type].toLowerCase().replace(/s$/, '')}</a></p>` +
      (edit ? `<form class="panel form two-col" data-form="cms"><h3 class="full">${item ? 'Edit' : 'New'}</h3><input type="hidden" name="type" value="${type}"><input type="hidden" name="id" value="${item ? item.id : ''}">${f}<div class="full"><button class="btn primary">Publish</button> <a class="btn" href="#/admin/cms?type=${type}">Cancel</a></div></form>` : ''));
  };
  F.cms = d => {
    const type = d.type, list = db()[type], paras = (d.body || '').split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
    let it = d.id ? list.find(x => x.id === d.id) : null, isNew = !it;
    if (isNew) { it = { id: { insights: 'i', cases: 'c', jobs: 'j' }[type] + KV.rid() }; }
    it.title = d.title;
    if (type === 'insights') Object.assign(it, { tag: d.tag, author: d.author, body: paras, date: it.date || new Date().toISOString().slice(0, 10) });
    if (type === 'cases') Object.assign(it, { client: d.client, sector: d.sector, year: +d.year, summary: d.summary, body: paras, kpis: (d.kpis || '').split('\n').map(x => x.split('|').map(s => s.trim())).filter(a => a[0]).map(a => ({ k: a[0], v: a[1] || '' })) });
    if (type === 'jobs') Object.assign(it, { dept: d.dept, loc: d.loc, type: d.type, desc: d.desc, open: !!d.open, posted: it.posted || new Date().toISOString().slice(0, 10) });
    if (isNew) list.unshift(it); KV.log('cms', `${type}/${it.id}`); KV.save(); KV.toast('Published.'); location.hash = '#/admin/cms?type=' + type;
  };
  A.cmsdel = el => { if (!confirm('Delete this item?')) return false; db()[el.dataset.type] = db()[el.dataset.type].filter(x => x.id !== el.dataset.id); KV.log('cms delete', el.dataset.type + '/' + el.dataset.id); KV.save(); };

  V.aUsers = () => {
    const me = KV.me();
    return shell('admin', '/admin/users', 'Users', tbl(['Name', 'Email', 'Organisation', 'Role', 'Access'], db().users.map(u => `<tr>${td('Name', esc(u.name))}${td('Email', esc(u.email))}${td('Organisation', esc(u.org))}${td('Role', u.id === me.id ? badge(u.role) : `<select data-chg="urole" data-id="${u.id}">${opt([['client', 'client'], ['admin', 'admin']], u.role)}</select>`)}<td>${u.id === me.id ? '<span class="mut">You</span>' : `<button class="btn sm" data-act="utoggle" data-id="${u.id}">${u.disabled ? 'Enable' : 'Disable'}</button> <button class="btn sm ghost" data-act="upw" data-id="${u.id}">Reset pw</button>`}</td></tr>`)));
  };
  A.utoggle = el => { const u = userOf(el.dataset.id); u.disabled = !u.disabled; KV.log('user', u.email + (u.disabled ? ' disabled' : ' enabled')); KV.save(); };
  A.upw = el => { const u = userOf(el.dataset.id); u.hash = KV.hashPw('demo'); KV.mail(u.email, 'Password reset (sample)', 'Your password was reset to: demo'); KV.log('user', u.email + ' pw reset'); KV.save(); KV.toast('Password reset to "demo" (simulated email in Outbox).'); };
  V.aOutbox = () => shell('admin', '/admin/outbox', 'Outbox (simulated email)', `<p class="mut">No email is ever sent. Messages generated by the sample workflows appear here.</p>${db().outbox.map(m => `<details class="mail"><summary><b>${esc(m.subject)}</b> <span class="mut">to ${esc(m.to)} · ${KV.dt(m.ts)}</span></summary><p>${esc(m.body)}</p></details>`).join('') || '<p class="mut">Empty.</p>'}`);
  V.aLog = () => shell('admin', '/admin/log', 'Audit log', tbl(['When', 'User', 'Action', 'Detail'], db().log.map(x => `<tr>${td('When', KV.dt(x.ts))}${td('User', esc(x.user))}${td('Action', esc(x.action))}${td('Detail', esc(x.detail))}</tr>`), 'No activity yet.'));
})();
