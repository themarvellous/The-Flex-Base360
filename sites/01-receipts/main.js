(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const nav = $('#nav');
  const cover = $('#top');
  const readbar = $('#readbar');
  const mbar = $('#mbar');
  const checkinSec = $('#book-section');

  /* =========================================================
     COVER · The Flex, drawn as houses that multiply
     ========================================================= */
  const canvas = $('#houses');
  const ctx = canvas.getContext('2d');
  const HL = '#EDD55C';
  const COUNTS = [1, 10, 30, 110, 260];
  // cluster centres are relative to the drawing region; distribution is illustrative
  const CITIES = [
    { n: 'London', s3: 48, s4: 100, d: [.14, .20], m: [.22, .24] },
    { n: 'Paris', s3: 16, s4: 40, d: [.42, .56], m: [.40, .60] },
    { n: 'Berlin', s3: 10, s4: 25, d: [.68, .14], m: [.78, .16] },
    { n: 'Lisbon', s3: 10, s4: 25, d: [.04, .80], m: [.10, .78] },
    { n: 'Algiers', s3: 12, s4: 30, d: [.40, .90], m: [.52, .90] },
    { n: 'Oran', s3: 7, s4: 20, d: [.22, .92], m: [.30, .92] },
    { n: 'Constantine', s3: 7, s4: 20, d: [.60, .86], m: [.76, .84] }
  ];
  const SOON = [{ n: 'Milan', d: [.64, .44], m: [.68, .36] }, { n: 'Cairo', d: [.90, .62], m: [.94, .56] }];
  const STAGES = [
    { label: 'Stage 1/5 · 2019', count: '1', unit: 'flat<br>London', note: 'Raouf moved the furniture in himself.', broke: 'Nothing yet. Every guest message came to one phone.', built: 'A standard: same checklist, same welcome, every stay.' },
    { label: 'Stage 2/5', count: '10', unit: 'units<br>London', note: 'The phone never stopped ringing.', broke: 'Check-ins, cleaners and pricing all ran through the founders.', built: 'Written SOPs for cleaning and check-in. The first ops hire.' },
    { label: 'Stage 3/5', count: '30', unit: 'units<br>London', note: 'Revenue grew. Margin didn’t.', broke: 'Spreadsheet pricing, double bookings, no profit per unit.', built: 'Dynamic pricing, a P&L per unit, better landlord terms.' },
    { label: 'Stage 4/5', count: '100+', unit: 'units<br>7 cities', note: 'New cities, new rules.', broke: 'Every city needed its own team, suppliers and regulations.', built: 'A city launch playbook and 150+ corporate partners.' },
    { label: 'Stage 5/5 · today', count: '[X]', unit: 'homes<br>7 cities, 2 next', note: 'So they wrote the software.', broke: 'No tool on the market could run the whole operation.', built: 'Base360: channels, AI pricing, guest inbox, cleaning, finance.' }
  ];

  // which city each house belongs to, stable across stages
  const cityOf = [];
  CITIES.forEach((c, ci) => { for (let k = 0; k < c.s3; k++) cityOf.push(ci); });
  CITIES.forEach((c, ci) => { for (let k = 0; k < c.s4 - c.s3; k++) cityOf.push(ci); });
  const N = cityOf.length; // 260

  let rand = 7;
  const rnd = () => (rand = (rand * 16807) % 2147483647) / 2147483647;
  const houses = Array.from({ length: N }, (_, i) => ({ x: 0, y: 0, s: 0, a: 0, fx: 0, fy: 0, fs: 0, fa: 0, tx: 0, ty: 0, ts: 0, ta: 0, t0: 0, lit: rnd() < .86, i }));

  let W = 0, H = 0, DPR = 1, R = { x: 0, y: 0, w: 0, h: 0 }, stage = -1, labels = [], ghosts = [], labelA = 0, labelT = 0, raf = 0, running = false;

  function region() {
    const mobile = W < 761;
    return mobile ? { x: W * .06, y: H * .10, w: W * .88, h: H * .28, mobile } : { x: W * .48, y: H * .12, w: W * .49, h: H * .38, mobile };
  }
  function grid(n, cols, cx, cy, gap) {
    const rows = Math.ceil(n / cols), out = [];
    for (let k = 0; k < n; k++) {
      const r = Math.floor(k / cols), c = k % cols;
      const inRow = r === rows - 1 ? n - r * cols : cols;
      out.push([cx + (c - (inRow - 1) / 2) * gap, cy + (r - (rows - 1) / 2) * gap * 1.08]);
    }
    return out;
  }
  // baseline for a label sitting just under a grid of houses
  const below = (cy, rows, gap, size) => cy + ((rows - 1) / 2) * gap * 1.08 + size / 2 + (R.mobile ? 11 : 15);
  function layout(st) {
    const count = COUNTS[st], m = Math.min(R.w, R.h), cx = R.x + R.w / 2, cy = R.y + R.h / 2;
    const pos = new Array(N);
    let size;
    labels = []; ghosts = [];
    if (st === 0) { size = m * .62; pos[0] = [cx, cy]; }
    else if (st === 1) { size = Math.min(R.w / 7.5, R.h / 3.2); grid(10, 5, cx, cy, size * 1.4).forEach((p, k) => pos[k] = p); labels.push({ n: 'London', x: cx, y: below(cy, 2, size * 1.4, size) }); }
    else if (st === 2) { size = Math.min(R.w / 14, R.h / 5.4); grid(30, 10, cx, cy, size * 1.35).forEach((p, k) => pos[k] = p); labels.push({ n: 'London', x: cx, y: below(cy, 3, size * 1.35, size) }); }
    else {
      size = m / (st === 3 ? (R.mobile ? 22 : 17) : (R.mobile ? 32 : 24));
      const gap = size * 1.3;
      CITIES.forEach((c, ci) => {
        const members = [];
        for (let i = 0; i < count; i++) if (cityOf[i] === ci) members.push(i);
        const [px, py] = R.mobile ? c.m : c.d;
        const ccx = R.x + px * R.w, ccy = R.y + py * R.h;
        const cols = Math.max(2, Math.ceil(Math.sqrt(members.length * 1.5)));
        const pts = grid(members.length, cols, ccx, ccy, gap);
        members.forEach((i, k) => pos[i] = pts[k]);
        const rows = Math.ceil(members.length / cols);
        labels.push({ n: c.n, x: ccx, y: below(ccy, rows, gap, size) });
      });
      if (st === 4) SOON.forEach(c => { const [px, py] = R.mobile ? c.m : c.d; ghosts.push({ n: c.n, x: R.x + px * R.w, y: R.y + py * R.h, s: size * 1.5, right: px > .85 }); });
    }
    return { pos, size, count };
  }

  function setStage(st, animate = true) {
    if (st === stage) return;
    const prevCount = stage < 0 ? 0 : COUNTS[stage];
    stage = st;
    const { pos, size, count } = layout(st);
    const now = performance.now();
    houses.forEach(h => {
      const i = h.i;
      h.fx = h.x; h.fy = h.y; h.fs = h.s; h.fa = h.a;
      if (i < count) {
        h.tx = pos[i][0]; h.ty = pos[i][1]; h.ts = size; h.ta = 1;
        if (i >= prevCount) { // new house grows out of an existing one
          const p = houses[i % Math.max(1, prevCount)];
          h.fx = h.x = p.x || h.tx; h.fy = h.y = p.y || h.ty; h.fs = h.s = 0; h.fa = h.a = 0;
        }
      } else {
        const p = pos[i % count];
        h.tx = p[0]; h.ty = p[1]; h.ts = 0; h.ta = 0;
      }
      h.t0 = animate ? now + Math.min(i, 140) * 5 + (i % 7) * 12 : now - 5000;
    });
    labelT = now;
    if (animate && !reduce) kick(); else { houses.forEach(h => { h.x = h.tx; h.y = h.ty; h.s = h.ts; h.a = h.ta; }); labelA = 1; draw(); }
    renderStageCard(st);
  }

  const ease = t => 1 - Math.pow(1 - t, 3);
  const DUR = 850;
  function step(now) {
    let busy = false;
    houses.forEach(h => {
      const t = clamp((now - h.t0) / DUR, 0, 1);
      if (t < 1) busy = true;
      const e = ease(t);
      h.x = h.fx + (h.tx - h.fx) * e; h.y = h.fy + (h.ty - h.fy) * e; h.s = h.fs + (h.ts - h.fs) * e; h.a = h.fa + (h.ta - h.fa) * e;
    });
    labelA = clamp((now - labelT - 500) / 500, 0, 1);
    if (labelA < 1) busy = true;
    draw();
    if (busy) raf = requestAnimationFrame(step); else running = false;
  }
  function kick() { if (!running) { running = true; raf = requestAnimationFrame(step); } }

  // drawn like The Flex's mark: heavy left wall and roof, hairline right side, base stopping short of the left wall
  function house(x, y, s, lit, glow, lw) {
    const w = s * .86, top = y - s / 2, eave = y - s * .06, base = y + s / 2, l = x - w / 2, r = x + w / 2;
    ctx.lineWidth = lw * 1.9;
    ctx.beginPath(); ctx.moveTo(l, base); ctx.lineTo(l, eave); ctx.lineTo(x, top); ctx.stroke();
    ctx.lineWidth = Math.max(.6, lw * .7);
    ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(r, eave); ctx.lineTo(r, base); ctx.lineTo(l + w * .24, base); ctx.stroke();
    const ws = s * .24;
    if (lit) {
      if (glow) { ctx.shadowColor = HL; ctx.shadowBlur = s * .35; }
      ctx.fillRect(x - ws / 2 + w * .03, y + s * .06, ws, ws);
      if (glow) ctx.shadowBlur = 0;
    }
  }
  function draw() {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const glow = stage <= 2;
    ctx.fillStyle = HL;
    houses.forEach(h => {
      if (h.a < .02 || h.s < .5) return;
      ctx.globalAlpha = h.a;
      ctx.strokeStyle = 'rgba(233,236,230,.85)';
      house(h.x, h.y, h.s, h.lit, glow, Math.max(.8, h.s * (h.s > 60 ? .032 : .045)));
    });
    ctx.globalAlpha = 1;
    // city labels + next cities
    ctx.font = `500 ${R.mobile ? 9 : 10.5}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = 'center';
    ctx.globalAlpha = labelA;
    ctx.fillStyle = 'rgba(233,236,230,.62)';
    labels.forEach(l => ctx.fillText(l.n.toUpperCase(), l.x, l.y));
    ghosts.forEach(g => {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(237,213,92,.8)';
      house(g.x, g.y, g.s, false, false, .7);
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(237,213,92,.85)';
      ctx.textAlign = g.right ? 'right' : 'center';
      ctx.fillText(g.n.toUpperCase() + ' · NEXT', g.right ? g.x + g.s * .6 : g.x, g.y + g.s * .5 + 16);
      ctx.textAlign = 'center';
    });
    ctx.globalAlpha = 1;
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    W = r.width; H = r.height; DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR);
    R = region();
    const st = stage; stage = -1;
    setStage(st < 0 ? (reduce ? 4 : 0) : st, false);
  }
  // occupancy flickers: a few windows switch each second
  if (!reduce) setInterval(() => {
    if (document.hidden || stage < 0) return;
    const count = COUNTS[stage];
    for (let k = 0; k < 3; k++) { const h = houses[Math.floor(Math.random() * count)]; h.lit = Math.random() < .86; }
    if (!running) draw();
  }, 900);

  /* stage card */
  const stageEl = $('#stage');
  const dots = $$('.stage-dots button');
  let cardTimer = 0;
  function renderStageCard(st) {
    const s = STAGES[st];
    dots.forEach((d, k) => { d.setAttribute('aria-selected', k === st ? 'true' : 'false'); d.classList.toggle('done', k < st); });
    const apply = () => {
      $('#st-label').textContent = s.label;
      $('#st-count').innerHTML = s.count === '[X]' ? '<span class="ph">[X]</span>' : s.count;
      $('#st-unit').innerHTML = s.unit;
      $('#st-note').textContent = s.note;
      $('#st-broke').textContent = s.broke;
      $('#st-built').textContent = s.built;
      stageEl.classList.remove('swap');
    };
    clearTimeout(cardTimer);
    if (reduce) apply(); else { stageEl.classList.add('swap'); cardTimer = setTimeout(apply, 200); }
  }
  ['#st-count', '#st-note', '.stage-dl'].forEach(sel => { const el = $(sel, stageEl); if (el) el.classList.add('fade'); });
  $('.stage-count', stageEl).classList.add('fade');

  const BANDS = [0, .16, .36, .58, .8];
  const pinned = () => getComputedStyle($('.cover-pin')).position === 'sticky';
  function coverProgress() {
    const r = cover.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
  }
  dots.forEach(d => d.addEventListener('click', () => {
    const i = +d.dataset.s;
    if (pinned()) {
      const top = cover.getBoundingClientRect().top + scrollY;
      const span = cover.offsetHeight - innerHeight;
      window.scrollTo({ top: top + span * (BANDS[i] + .06), behavior: reduce ? 'auto' : 'smooth' });
    } else setStage(i);
  }));

  /* =========================================================
     METHOD · horizontal chapters
     ========================================================= */
  const method = $('#method');
  const track = $('#method-track');
  const pages = $$('.page', track);
  const tabs = $$('.binder-tabs button');
  const mqPin = matchMedia('(min-width: 901px) and (min-height: 680px)');
  let dist = 0;
  function setupMethod() {
    const on = mqPin.matches && !reduce;
    method.classList.toggle('pinned', on);
    track.style.transform = '';
    if (!on) { method.style.removeProperty('--method-h'); return; }
    const view = $('.method-view', method);
    dist = Math.max(0, track.scrollWidth - view.clientWidth);
    method.style.setProperty('--method-h', (innerHeight + dist * 1.15) + 'px');
  }
  function methodScroll() {
    if (!method.classList.contains('pinned')) return;
    const r = method.getBoundingClientRect();
    const p = clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
    track.style.transform = `translate3d(${-p * dist}px,0,0)`;
    const active = Math.round(p * (pages.length - 1));
    tabs.forEach((t, k) => t.setAttribute('aria-selected', k === active ? 'true' : 'false'));
  }
  function gotoChapter(i) {
    if (method.classList.contains('pinned')) {
      const top = method.getBoundingClientRect().top + scrollY;
      const span = method.offsetHeight - innerHeight;
      window.scrollTo({ top: top + span * (i / (pages.length - 1)), behavior: reduce ? 'auto' : 'smooth' });
    } else pages[i].scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  }
  tabs.forEach(t => t.addEventListener('click', () => gotoChapter(+t.dataset.chI)));
  $$('[data-goto-ch]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); gotoChapter(+a.dataset.gotoCh); }));

  /* =========================================================
     Scroll: nav state, reading bar, cover stages, method track
     ========================================================= */
  const hint = $('#scrollhint');
  let ticking = false, ciVisible = false;
  function onScroll() {
    ticking = false;
    const cr = cover.getBoundingClientRect();
    const navH = nav.offsetHeight;
    nav.classList.toggle('paper', cr.bottom <= navH);
    const max = document.documentElement.scrollHeight - innerHeight;
    readbar.style.width = (max > 0 ? scrollY / max * 100 : 0) + '%';
    if (pinned()) {
      const p = coverProgress();
      let st = 0; BANDS.forEach((b, k) => { if (p >= b) st = k; });
      setStage(st);
      hint.classList.toggle('gone', p > .02);
    }
    methodScroll();
    const show = cr.bottom < innerHeight * .35 && !ciVisible;
    mbar.classList.toggle('show', show);
    mbar.setAttribute('aria-hidden', show ? 'false' : 'true');
    $$('a,button', mbar).forEach(el => el.tabIndex = show ? 0 : -1);
  }
  const requestScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', requestScroll, { passive: true });
  window.addEventListener('resize', () => { resize(); setupMethod(); requestScroll(); });
  mqPin.addEventListener && mqPin.addEventListener('change', () => { setupMethod(); requestScroll(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { ciVisible = e.isIntersecting; requestScroll(); }).observe(checkinSec);
    // running header: which chapter are we in?
    const ch = $('#runhead-ch');
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) ch.textContent = e.target.dataset.ch; }), { rootMargin: '-45% 0px -50% 0px' });
    $$('[data-ch]').forEach(s => io.observe(s));
    // receipt prints, graph draws, when they first come into view
    if (!reduce) {
      [[$('#receipt-paper'), 'print'], [$('#graph'), 'draw']].forEach(([el, cls]) => {
        if (!el || el.getBoundingClientRect().top < innerHeight) return;
        el.classList.add('pre');
        const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.remove('pre'); el.classList.add(cls); o.disconnect(); } }, { threshold: .3 });
        o.observe(el);
      });
    }
  }

  resize();
  setupMethod();
  onScroll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { draw(); setupMethod(); methodScroll(); });

  /* =========================================================
     Checklist capture
     ========================================================= */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  $$('[data-capture]').forEach(form => {
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('input[type=email]', form);
      let err = form.nextElementSibling && form.nextElementSibling.classList.contains('capture-err') ? form.nextElementSibling : null;
      if (!EMAIL.test(input.value.trim())) {
        input.setAttribute('aria-invalid', 'true');
        if (!err) { err = document.createElement('p'); err.className = 'capture-err'; err.setAttribute('role', 'alert'); form.after(err); }
        err.textContent = 'Enter an email like name@company.com.';
        input.focus();
        return;
      }
      if (err) err.remove();
      const done = document.createElement('div');
      done.className = 'capture-done';
      done.setAttribute('role', 'status');
      done.innerHTML = `<svg><use href="#i-check"/></svg><span><b>Sent to ${esc(input.value.trim())}.</b><br>Check your inbox in the next few minutes. You're on the waitlist too.</span>`;
      const help = form.parentElement.querySelector('.capture-help');
      if (help) help.remove();
      form.replaceWith(done);
    });
  });
  $$('[data-checklist]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    $('#checklist').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    const input = $('#cap-email');
    if (input) setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 700);
  }));

  /* =========================================================
     Booking flow
     ========================================================= */
  const dlg = $('#book');
  const form = $('#book-form');
  const steps = $$('.book-step', form);
  const bar = $('#book-bar');
  const nextBtn = $('#book-next');
  const backBtn = $('#book-back');
  const meta = $('#book-meta');
  const FLOW = ['units', 'target', 'city', 'budget', 'contact', 'slot'];
  const LABELS = {
    units: { none: 'No units yet', '1-3': '1–3 units', '4-10': '4–10 units', '11-30': '11–30 units', '30+': '30+ units' },
    target: { '10': 'Up to 10', '30': '10–30', '100': '30–100', '100+': '100+', city: 'A new city', unsure: 'Not sure' },
    budget: { u5: 'Under £5k', '5-20': '£5k–£20k', '20-50': '£20k–£50k', '50+': '£50k+' }
  };
  let state = { step: 'units', history: [], day: null, time: null };
  let lastFocus = null;
  const val = n => {
    const radio = $(`input[type=radio][name="${n}"]:checked`, form);
    if (radio) return radio.value;
    const el = $('#b-' + n);
    return el ? el.value.trim() : '';
  };

  function show(stepName, push = true) {
    if (push && state.step !== stepName) state.history.push(state.step);
    state.step = stepName;
    steps.forEach(s => s.hidden = s.dataset.step !== stepName);
    const i = FLOW.indexOf(stepName);
    const terminal = stepName === 'done' || stepName === 'nofit';
    bar.style.width = terminal ? '100%' : ((i + 1) / (FLOW.length + 1) * 100) + '%';
    backBtn.hidden = i <= 0 || terminal;
    meta.textContent = i >= 0 && i < 4 ? 'About a minute' : stepName === 'contact' ? 'We never share your details' : stepName === 'slot' ? 'Free · no obligation' : '';
    nextBtn.innerHTML = stepName === 'slot' ? 'Confirm call <span class="arr" aria-hidden="true">→</span>' : terminal ? 'Done' : 'Continue <span class="arr" aria-hidden="true">→</span>';
    if (stepName === 'contact') renderSummary();
    if (stepName === 'slot') renderDays();
    form.scrollTop = 0;
    const cur = steps.find(s => s.dataset.step === stepName);
    const target = terminal ? $('h2', cur) : ($('input:checked', cur) || $('input', cur) || $('button', cur));
    if (target) setTimeout(() => target.focus({ preventScroll: true }), 30);
  }
  function validate(s) {
    const hide = id => { const e = $('#' + id); if (e) e.hidden = true; };
    const fail = (id, input) => { const e = $('#' + id); if (e) e.hidden = false; if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); } return false; };
    if (['units', 'target', 'budget'].includes(s)) {
      if (!val(s)) { const first = $(`[data-step="${s}"] input`); if (first) first.focus(); shake(); return false; }
      return true;
    }
    if (s === 'city') { const c = $('#b-city'); if (!c.value.trim()) return fail('err-city', c); c.removeAttribute('aria-invalid'); hide('err-city'); return true; }
    if (s === 'contact') {
      const n = $('#b-name'), m = $('#b-email');
      n.removeAttribute('aria-invalid'); m.removeAttribute('aria-invalid'); hide('err-name'); hide('err-email');
      if (!n.value.trim()) return fail('err-name', n);
      if (!EMAIL.test(m.value.trim())) return fail('err-email', m);
      return true;
    }
    if (s === 'slot') { if (!state.day || !state.time) return fail('err-slot'); hide('err-slot'); return true; }
    return true;
  }
  function shake() {
    if (reduce || !nextBtn.animate) return;
    nextBtn.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }], { duration: 220 });
  }
  function next() {
    const s = state.step;
    if (s === 'done' || s === 'nofit') return close();
    if (!validate(s)) return;
    if (s === 'budget' && val('units') === 'none' && val('budget') === 'u5') return show('nofit');
    if (s === 'slot') return confirmBooking();
    show(FLOW[FLOW.indexOf(s) + 1]);
  }
  function back() { const prev = state.history.pop(); if (prev) show(prev, false); }
  form.addEventListener('change', e => {
    if (e.target.type === 'radio') setTimeout(() => { if (state.step === e.target.name) next(); }, reduce ? 0 : 260);
  });
  form.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio' && !e.target.closest('[data-capture]')) { e.preventDefault(); next(); }
  });
  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', back);
  $('#book-close').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { document.documentElement.style.overflow = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); });
  function open() {
    lastFocus = document.activeElement;
    if (state.step === 'done' || state.step === 'nofit') reset();
    document.documentElement.style.overflow = 'hidden';
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    show(state.step, false);
  }
  function close() { if (typeof dlg.close === 'function') dlg.close(); else dlg.removeAttribute('open'); }
  function reset() {
    $$('input', form).forEach(i => { if (i.type === 'radio') i.checked = false; else { i.value = ''; i.removeAttribute('aria-invalid'); } });
    state = { step: 'units', history: [], day: null, time: null };
  }
  $$('[data-book]').forEach(b => b.addEventListener('click', open));
  function renderSummary() {
    const chips = [LABELS.units[val('units')], 'Target: ' + LABELS.target[val('target')], val('city'), LABELS.budget[val('budget')]].filter(Boolean);
    $('#b-summary').innerHTML = chips.map(c => `<span>${esc(c)}</span>`).join('');
  }
  const TIMES = ['09:30', '10:30', '12:00', '14:00', '15:30', '17:00'];
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time zone'; } catch (e) { return 'your time zone'; } })();
  const isoDay = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function workdays(n) {
    const out = []; const d = new Date(); d.setHours(12, 0, 0, 0);
    while (out.length < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) out.push(new Date(d)); }
    return out;
  }
  const taken = i => TIMES.filter((_, k) => (i * 7 + k * 3) % 5 === 0); // prototype availability
  function renderDays() {
    $('#b-hi').textContent = val('name') || 'there';
    const days = workdays(10);
    if (!state.day) state.day = isoDay(days[0]);
    const wrap = $('#b-days');
    wrap.innerHTML = days.map((d, i) => `<button type="button" class="day" data-day="${isoDay(d)}" data-i="${i}" aria-pressed="${state.day === isoDay(d)}"><small>${d.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>${d.getDate()}</b><span>${TIMES.length - taken(i).length} slots</span></button>`).join('');
    $$('.day', wrap).forEach(b => b.addEventListener('click', () => {
      state.day = b.dataset.day; state.time = null;
      $$('.day', wrap).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      renderSlots(+b.dataset.i);
    }));
    const sel = $('.day[aria-pressed="true"]', wrap);
    renderSlots(sel ? +sel.dataset.i : 0);
    $('#b-tz').textContent = `Times shown in ${tz.replace(/_/g, ' ')}.`;
  }
  function renderSlots(i) {
    const busy = taken(i);
    const wrap = $('#b-slots');
    wrap.innerHTML = TIMES.map(t => `<button type="button" class="slot" data-t="${t}" aria-pressed="${state.time === t}" ${busy.includes(t) ? `disabled aria-label="${t}, unavailable"` : ''}>${t}</button>`).join('');
    $$('.slot', wrap).forEach(b => b.addEventListener('click', () => {
      state.time = b.dataset.t;
      $$('.slot', wrap).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      $('#err-slot').hidden = true;
    }));
  }
  function confirmBooking() {
    const [y, m, d] = state.day.split('-').map(Number);
    const [hh, mm] = state.time.split(':').map(Number);
    const startD = new Date(y, m - 1, d, hh, mm);
    const endD = new Date(startD.getTime() + 30 * 60000);
    const t = dt => dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    $('#d-title').textContent = `You're booked, ${val('name')}.`;
    $('#d-sub').textContent = `We've sent the invite and a video link to ${val('email')}, plus the STR scaling checklist to read before we talk.`;
    $('#d-mon').textContent = startD.toLocaleDateString(undefined, { weekday: 'short', month: 'short' });
    $('#d-day').textContent = startD.getDate();
    $('#d-time').textContent = `${t(startD)}–${t(endD)} · ${tz.replace(/_/g, ' ')} · Video call`;
    const fmt = dt => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = 'Flex Academy strategy call';
    const details = 'A 20–30 minute call with the team behind The Flex and Base360. Bring your unit list, recent revenue and your biggest bottleneck.';
    $('#d-gcal').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startD)}/${fmt(endD)}&details=${encodeURIComponent(details)}`;
    $('#d-ocal').href = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startD.toISOString()}&enddt=${endD.toISOString()}&body=${encodeURIComponent(details)}`;
    show('done');
  }
})();
