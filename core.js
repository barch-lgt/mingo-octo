/* KV Advisory sample — core: browser database, auth, i18n, helpers. */
(function () {
  'use strict';
  const D = window.KVD;
  const KEY = 'kv.sample.db.v1', SESS = 'kv.sample.session', LK = 'kv.sample.lang';
  const clone = o => JSON.parse(JSON.stringify(o));

  function sha256(str) {
    const b = unescape(encodeURIComponent(str));
    const primes = []; for (let n = 2; primes.length < 64; n++) if (primes.every(p => n % p)) primes.push(n);
    const fr = x => Math.floor((x - Math.floor(x)) * 4294967296);
    const K = primes.map(p => fr(Math.cbrt(p)));
    let H = primes.slice(0, 8).map(p => fr(Math.sqrt(p)));
    const by = []; for (let i = 0; i < b.length; i++) by.push(b.charCodeAt(i));
    const bits = by.length * 8; by.push(0x80); while (by.length % 64 !== 56) by.push(0);
    for (let i = 7; i >= 0; i--) by.push(i > 3 ? 0 : (bits >>> (i * 8)) & 255);
    const rr = (x, n) => (x >>> n) | (x << (32 - n));
    for (let o = 0; o < by.length; o += 64) {
      const w = new Array(64);
      for (let i = 0; i < 16; i++) w[i] = (by[o + 4 * i] << 24) | (by[o + 4 * i + 1] << 16) | (by[o + 4 * i + 2] << 8) | by[o + 4 * i + 3];
      for (let i = 16; i < 64; i++) {
        const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let [a, b2, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (rr(e, 6) ^ rr(e, 11) ^ rr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
        const t2 = ((rr(a, 2) ^ rr(a, 13) ^ rr(a, 22)) + ((a & b2) ^ (a & c) ^ (b2 & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b2; b2 = a; a = (t1 + t2) | 0;
      }
      H = [H[0] + a | 0, H[1] + b2 | 0, H[2] + c | 0, H[3] + d | 0, H[4] + e | 0, H[5] + f | 0, H[6] + g | 0, H[7] + h | 0];
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, '0')).join('');
  }
  const hashPw = p => sha256('kv-sample:' + p);

  const KV = window.KV = { db: null, lang: localStorage.getItem(LK) || 'en', sha256 };

  function seed() {
    const db = clone(D.seed); db.v = 1;
    db.users.forEach(u => { u.hash = hashPw(u.pw); delete u.pw; });
    return db;
  }
  KV.load = () => {
    try { KV.db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { KV.db = null; }
    if (!KV.db || KV.db.v !== 1) { KV.db = seed(); KV.save(); }
    return KV.db;
  };
  KV.save = () => { try { localStorage.setItem(KEY, JSON.stringify(KV.db)); } catch (e) { KV.toast('Browser storage is full.'); } };
  KV.reset = () => { localStorage.removeItem(KEY); localStorage.removeItem(SESS); KV.load(); };
  KV.next = (k, prefix, pad) => { const s = KV.db.seq; s[k] = (s[k] || 0) + 1; return prefix + (pad ? String(s[k]).padStart(pad, '0') : s[k]); };
  KV.rid = () => Math.random().toString(36).slice(2, 9);

  /* auth */
  KV.me = () => { const id = localStorage.getItem(SESS); return KV.db.users.find(u => u.id === id && !u.disabled) || null; };
  KV.login = (email, pw) => {
    const u = KV.db.users.find(x => x.email.toLowerCase() === String(email).trim().toLowerCase());
    if (!u || u.hash !== hashPw(pw)) return { err: 'Incorrect email or password.' };
    if (u.disabled) return { err: 'This account is disabled.' };
    localStorage.setItem(SESS, u.id); KV.log('login', u.email); KV.save(); return { user: u };
  };
  KV.logout = () => { const m = KV.me(); if (m) KV.log('logout', m.email); localStorage.removeItem(SESS); KV.save(); };
  KV.register = d => {
    const email = String(d.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return { err: 'Enter a valid email address.' };
    if (KV.db.users.some(u => u.email.toLowerCase() === email)) return { err: 'That email is already registered.' };
    if (String(d.password || '').length < 6) return { err: 'Password must be at least 6 characters.' };
    const u = { id: KV.next('U', 'u'), name: d.name.trim(), email, role: ['admin', 'staff'].includes(d.role) ? d.role : 'client', org: (d.org || '').trim(), hash: hashPw(d.password), created: new Date().toISOString() };
    KV.db.users.push(u); localStorage.setItem(SESS, u.id);
    KV.log('register', email); KV.notify('admin', `New ${u.role} registered: ${u.name}`, '/admin/users');
    KV.mail(email, 'Welcome to the KV Advisory client portal (sample)', `Hello ${u.name}, your sample account is active. This is a simulated email.`);
    KV.save(); return { user: u };
  };
  KV.hashPw = hashPw;

  /* events */
  KV.log = (action, detail) => { const m = KV.me(); KV.db.log.unshift({ id: KV.rid(), ts: new Date().toISOString(), user: m ? m.email : 'visitor', action, detail: detail || '' }); KV.db.log.length = Math.min(KV.db.log.length, 300); };
  KV.notify = (userId, text, link) => { KV.db.notifications.unshift({ id: KV.next('N', 'n'), userId, text, link, ts: new Date().toISOString(), read: false }); };
  KV.mail = (to, subject, body) => { KV.db.outbox.unshift({ id: KV.rid(), to, subject, body, ts: new Date().toISOString() }); };
  KV.home = u => !u ? '/login' : u.role === 'admin' ? '/admin' : u.role === 'staff' ? '/staff' : '/portal';
  KV.myNotes = u => KV.db.notifications.filter(n => n.userId === u.id || (n.userId === 'admin' && u.role === 'admin'));

  /* i18n */
  KV.setLang = l => { KV.lang = l; localStorage.setItem(LK, l); document.documentElement.lang = l === 'om' ? 'om' : l; };
  KV.t = k => (D.STR[KV.lang] && D.STR[KV.lang][k]) || D.STR.en[k] || k;
  KV.L = o => (o && typeof o === 'object') ? (o[KV.lang] || o.en || '') : (o == null ? '' : o);

  /* format */
  KV.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  KV.date = s => { if (!s) return '—'; const d = new Date(s); return isNaN(d) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: s.length === 10 ? 'UTC' : undefined }); };
  KV.dt = s => s ? KV.date(s) + ' ' + new Date(s).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—';
  KV.money = n => 'ETB ' + Math.round(n).toLocaleString('en-US');
  KV.invSub = i => i.items.reduce((s, x) => s + x.q * x.r, 0);
  KV.invTotal = i => Math.round(KV.invSub(i) * 1.15);
  KV.progress = p => p.milestones.length ? Math.round(100 * p.milestones.filter(m => m.done).length / p.milestones.length) : 0;
  KV.toast = msg => {
    let t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show'; clearTimeout(KV._tt); KV._tt = setTimeout(() => t.className = '', 3200);
  };
  KV.download = (name, text, type) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: type || 'text/plain' })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  KV.readFile = f => new Promise(res => {
    if (!f || !f.size) return res(null);
    const meta = { name: f.name, size: f.size, data: null };
    if (f.size > 200 * 1024) return res(meta);
    const r = new FileReader(); r.onload = () => { meta.data = r.result; res(meta); }; r.onerror = () => res(meta); r.readAsDataURL(f);
  });
  KV.load(); KV.setLang(KV.lang);
})();
