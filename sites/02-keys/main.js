(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem('fa2-' + k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem('fa2-' + k, JSON.stringify(v)); } catch (e) {} }
  };

  /* =========================================================
     The visitor's number
     ========================================================= */
  const MAX = 40;
  let units = clamp(+store.get('units') || 12, 1, MAX);
  let touched = !!store.get('touched');
  let noUnits = false;

  const STAGES = [
    { max: 3, name: 'Side-hustle stage.', text: 'The next step is structure, not more listings.', start: 0, foot: 'Every key is a home you answer for at 2am.' },
    { max: 10, name: 'Hands-on operator.', text: 'You’re the bottleneck: every message and clean runs through you.', start: 1, foot: 'Every key on this board still rings your phone.' },
    { max: 30, name: 'Growing operator.', text: 'Revenue is growing faster than margin. Time for systems and a team.', start: 0, foot: 'More keys, same margin. That’s the stall.' },
    { max: 99, name: 'Multi-city ready.', text: 'Your next unit is a new city. You need a company that opens markets without you.', start: 3, foot: 'The board is nearly full. Time for a second city.' }
  ];
  const stageOf = n => STAGES.find(s => n <= s.max);

  /* ---------- key board ---------- */
  const hooksEl = $('#hooks');
  const COLORS = [['var(--green)', '#fff'], ['var(--brass)', 'var(--deep-2)'], ['var(--sage)', 'var(--ink)'], ['var(--butter)', 'var(--ink)'], ['#1B3B38', '#fff']];
  const hooks = Array.from({ length: MAX }, (_, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'hook';
    b.setAttribute('aria-label', `Set to ${i + 1} unit${i ? 's' : ''}`);
    b.addEventListener('click', () => setUnits(i + 1, true));
    hooksEl.appendChild(b);
    return b;
  });
  function keyEl(i, drop) {
    const [c, t] = COLORS[(i * 7 + (i >> 2)) % COLORS.length];
    const k = document.createElement('span');
    k.className = 'key' + (drop ? ' drop' : '');
    k.style.animationDelay = drop ? `${Math.min(12, drop - 1) * 35}ms` : `${(i % 8) * 60}ms`;
    k.innerHTML = `<i class="key-ring"></i><span class="key-tag" style="--c:${c};--t:${t}">${String(i + 1).padStart(2, '0')}</span>`;
    return k;
  }
  function renderKeys(prev) {
    hooks.forEach((h, i) => {
      const has = h.querySelector('.key:not(.leave)');
      if (i < units && !has) h.appendChild(keyEl(i, prev == null || reduce ? 0 : i - prev + 1));
      if (i >= units && has) {
        if (reduce) has.remove();
        else { has.classList.add('leave'); setTimeout(() => has.remove(), 300); }
      }
    });
  }

  /* ---------- week calendar (illustrative model) ---------- */
  const CATS = [
    { n: 'Guest messages', s: .30, c: 'var(--green)' },
    { n: 'Cleaning & turnovers', s: .22, c: 'var(--brass)' },
    { n: 'Check-ins & access', s: .14, c: 'var(--sage)' },
    { n: 'Pricing & calendars', s: .12, c: 'var(--butter)' },
    { n: 'Maintenance', s: .12, c: '#7C8C86' },
    { n: 'Admin & finance', s: .10, c: '#C9D3CC' }
  ];
  const hoursNow = n => clamp(Math.round(2 + 3.3 * n), 3, 70);
  const hoursAfter = n => clamp(Math.round(4 + 0.55 * n), 3, 30);
  function split(total) { // largest remainder, so categories always add up
    const raw = CATS.map(c => c.s * total), out = raw.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    raw.map((r, i) => [r - Math.floor(r), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left-- > 0) out[i]++; });
    return out;
  }
  function sequence(total) { // weighted round-robin, so each day gets a realistic mix
    const counts = split(total), used = counts.map(() => 0), seq = [];
    for (let k = 0; k < total; k++) {
      let best = -1, score = -1;
      counts.forEach((c, i) => { const s = c ? (c - used[i]) / c : -1; if (s > score) { score = s; best = i; } });
      used[best]++; seq.push(best);
    }
    return seq;
  }
  const cal = $('#cal');
  const cells = Array.from({ length: 70 }, () => { const d = document.createElement('i'); d.className = 'cell'; cal.appendChild(d); return d; });
  // hour slots fill evenly across the week: hour 1 of every day, then hour 2...
  const order = []; for (let h = 9; h >= 0; h--) for (let d = 0; d < 7; d++) order.push(d * 10 + h);
  let mode = 'now';
  function renderWeek() {
    const now = hoursNow(units), after = hoursAfter(units);
    const shown = mode === 'now' ? now : after;
    const seq = sequence(shown);
    cells.forEach(c => { c.className = 'cell'; c.style.removeProperty('--c'); });
    order.forEach((idx, k) => {
      const c = cells[idx];
      if (k < shown) { c.classList.add('on'); c.style.setProperty('--c', CATS[seq[k]].c); c.style.transitionDelay = reduce ? '0ms' : `${k * 8}ms`; }
      else if (mode === 'after' && k < now) { c.classList.add('freed'); c.style.transitionDelay = reduce ? '0ms' : `${(k - shown) * 6}ms`; }
    });
    $('#w-hours').textContent = shown;
    $('#w-unit').textContent = mode === 'now' ? 'hours a week on operations' : 'hours a week, with systems and a team';
    const per = split(shown);
    $('#legend').innerHTML = CATS.map((c, i) => `<li><i style="--c:${c.c}"></i>${c.n}<b>${per[i]}h</b></li>`).join('');
    const msgs = split(now)[0];
    $('#week-note').innerHTML = mode === 'now'
      ? `Guest messages alone take <b>${msgs} hours</b>. That's before a single new deal.`
      : `That's <b>${now - after} hours back</b> every week to find, sign and open new units.`;
    cal.setAttribute('aria-label', `${shown} hours of operational work across your week${mode === 'after' ? `, ${now - after} hours freed` : ''}`);
  }
  $$('.toggle button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.mode;
    $$('.toggle button').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    renderWeek();
  }));

  /* ---------- everything that listens to the number ---------- */
  const out = $('#u-out'), range = $('#u-range');
  function setUnits(n, byUser) {
    const prev = units;
    units = clamp(Math.round(n), 1, MAX);
    if (byUser) { touched = true; store.set('touched', true); }
    store.set('units', units);
    out.value = out.textContent = units;
    range.value = units;
    if (byUser && prev !== units && !reduce) { out.classList.remove('bump'); void out.offsetWidth; out.classList.add('bump'); }
    $$('[data-units]').forEach(e => e.textContent = units);
    const st = stageOf(units);
    $('#stage-name').textContent = st.name;
    $('#stage-text').textContent = st.text;
    $('#board-foot').textContent = st.foot;
    $$('.chapter').forEach((c, i) => { const on = i === st.start; c.classList.toggle('is-start', on); c.querySelector('.start').hidden = !on; });
    const chip = $('[data-units-chip]');
    chip.hidden = !touched; chip.textContent = `${units} units`;
    renderKeys(prev === units ? null : prev);
    renderWeek();
    $('#f-out').value = $('#f-out').textContent = units;
  }
  $('#u-minus').addEventListener('click', () => setUnits(units - 1, true));
  $('#u-plus').addEventListener('click', () => setUnits(units + 1, true));
  range.addEventListener('input', () => setUnits(+range.value, true));

  /* =========================================================
     Keyring
     ========================================================= */
  const KEYS = [
    { k: '12 live sessions', t: 'A weekly group session', p: '90 minutes, live and recorded. One topic a week, worked through on members’ real units.' },
    { k: '3 founder 1:1s', t: 'A monthly 1:1 with a founder', p: 'Bring your numbers. Leave with decisions on your pricing, your deals or your next hire.' },
    { k: 'Templates & SOPs', t: 'The documents The Flex runs on', p: 'Cleaning and check-in SOPs, a unit P&L model, a landlord pitch deck and an ops hiring scorecard.' },
    { k: 'Base360 access', t: 'The software, set up with you', p: 'Channel manager, AI pricing, a single guest inbox, cleaning and finance, live on your units by week 6.' },
    { k: 'Community', t: 'Operators at your stage', p: 'A private group across cities for suppliers, landlords and what’s working. Yours to keep after the 12 weeks.' }
  ];
  const fobs = $$('.fob');
  const kd = $('#key-detail');
  fobs.forEach(f => f.addEventListener('click', () => {
    const d = KEYS[+f.dataset.i];
    fobs.forEach(x => x.setAttribute('aria-selected', x === f ? 'true' : 'false'));
    $('#kd-k').textContent = d.k; $('#kd-t').textContent = d.t; $('#kd-p').textContent = d.p;
    if (!reduce) { kd.classList.remove('swap'); void kd.offsetWidth; kd.classList.add('swap'); }
  }));

  /* =========================================================
     Compare
     ========================================================= */
  $$('.cmp-toggle button').forEach(b => b.addEventListener('click', () => {
    $$('.cmp-toggle button').forEach(x => x.setAttribute('aria-selected', x === b ? 'true' : 'false'));
    $$('.cmp-col.them').forEach(c => { const on = c.dataset.col === b.dataset.vs; c.hidden = !on; if (on && !reduce) { c.classList.remove('swap'); void c.offsetWidth; c.classList.add('swap'); } });
  }));

  /* =========================================================
     Nav, mobile bar, checklist
     ========================================================= */
  const nav = $('#nav'), mbar = $('#mbar');
  addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 8), { passive: true });
  let heroIn = true, finalIn = false;
  const syncBar = () => {
    const show = !heroIn && !finalIn;
    mbar.classList.toggle('show', show);
    mbar.setAttribute('aria-hidden', show ? 'false' : 'true');
    $$('button', mbar).forEach(b => b.tabIndex = show ? 0 : -1);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { heroIn = e.isIntersecting; syncBar(); }, { rootMargin: '-35% 0px 0px 0px' }).observe($('#top'));
    new IntersectionObserver(([e]) => { finalIn = e.isIntersecting; syncBar(); }).observe($('#book-section'));
  }
  $$('[data-checklist]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    $('#checklist').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { const i = $('#cap-email'); if (i) i.focus({ preventScroll: true }); }, reduce ? 0 : 650);
  }));
  $('#sc-change').addEventListener('click', () => {
    $('#top').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => range.focus({ preventScroll: true }), reduce ? 0 : 650);
  });

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  $$('[data-capture]').forEach(form => form.addEventListener('submit', e => {
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
    done.className = 'capture-done'; done.setAttribute('role', 'status');
    done.innerHTML = `<svg><use href="#i-check"/></svg><span><b>Sent to ${esc(input.value.trim())}.</b><br>Check your inbox in a few minutes. You're on the waitlist too.</span>`;
    const help = form.parentElement.querySelector('.capture-help'); if (help) help.remove();
    form.replaceWith(done);
  }));

  /* =========================================================
     Booking: starts from the number the visitor already gave
     ========================================================= */
  const dlg = $('#book'), body = $('#book-form');
  const steps = $$('.step-f', body);
  const nextBtn = $('#book-next'), backBtn = $('#book-back'), bar = $('#book-bar'), meta = $('#book-meta'), known = $('#known');
  const FLOW = ['units', 'target', 'city', 'budget', 'contact', 'slot'];
  let cur = 'units', history = [], day = null, time = null, lastFocus = null;
  const radio = n => { const r = $(`input[name="${n}"]:checked`, body); return r ? r.value : ''; };
  const BUDGET = { u5: 'Under £5k', '5-20': '£5k–£20k', '20-50': '£20k–£50k', '50+': '£50k+' };

  function show(step, push = true) {
    if (push && cur !== step) history.push(cur);
    cur = step;
    steps.forEach(s => s.hidden = s.dataset.step !== step);
    const i = FLOW.indexOf(step), end = step === 'done' || step === 'nofit';
    bar.style.width = end ? '100%' : ((i + 1) / (FLOW.length + 1) * 100) + '%';
    backBtn.hidden = !history.length || end;
    known.hidden = !(touched && step !== 'units' && !end && !noUnits);
    meta.textContent = i >= 0 && i < 4 ? 'About a minute' : step === 'contact' ? 'We never share your details' : step === 'slot' ? 'Free, no obligation' : '';
    nextBtn.innerHTML = step === 'slot' ? 'Confirm my call <span class="arr" aria-hidden="true">→</span>' : end ? 'Done' : 'Continue <span class="arr" aria-hidden="true">→</span>';
    if (step === 'contact') summary();
    if (step === 'slot') renderDays();
    body.scrollTop = 0;
    const node = steps.find(s => s.dataset.step === step);
    const f = end ? $('h2', node) : ($('input:checked', node) || $('input:not([type=checkbox])', node) || $('button', node));
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 40);
  }
  function fail(id, input) { const e = $('#' + id); if (e) e.hidden = false; if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); } return false; }
  function ok(id, input) { const e = $('#' + id); if (e) e.hidden = true; if (input) input.removeAttribute('aria-invalid'); }
  function validate(s) {
    if (s === 'target' || s === 'budget') { if (!radio(s)) { nudge(); const f = $(`input[name="${s}"]`, body); if (f) f.focus(); return false; } return true; }
    if (s === 'city') { const c = $('#b-city'); if (!c.value.trim()) return fail('err-city', c); ok('err-city', c); return true; }
    if (s === 'contact') {
      const n = $('#b-name'), m = $('#b-email'); ok('err-name', n); ok('err-email', m);
      if (!n.value.trim()) return fail('err-name', n);
      if (!EMAIL.test(m.value.trim())) return fail('err-email', m);
      return true;
    }
    if (s === 'slot') { if (!day || !time) return fail('err-slot'); ok('err-slot'); return true; }
    return true;
  }
  function nudge() { if (!reduce && nextBtn.animate) nextBtn.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'none' }], { duration: 240 }); }
  function next() {
    if (cur === 'done' || cur === 'nofit') return close();
    if (!validate(cur)) return;
    if (cur === 'units') { touched = true; store.set('touched', true); setUnits(units); }
    if (cur === 'budget' && noUnits && radio('budget') === 'u5') return show('nofit');
    if (cur === 'slot') return confirm();
    show(FLOW[FLOW.indexOf(cur) + 1]);
  }
  body.addEventListener('change', e => { if (e.target.type === 'radio') setTimeout(() => { if (cur === e.target.name) next(); }, reduce ? 0 : 280); });
  body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio' && e.target.type !== 'checkbox' && !e.target.closest('[data-capture]')) { e.preventDefault(); next(); } });
  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', () => { const p = history.pop(); if (p) show(p, false); });
  $('#known-change').addEventListener('click', () => show('units'));
  $('#f-minus').addEventListener('click', () => setUnits(units - 1, true));
  $('#f-plus').addEventListener('click', () => setUnits(units + 1, true));
  $('#f-none').addEventListener('change', e => { noUnits = e.target.checked; $('#f-out').style.opacity = noUnits ? .3 : 1; });
  $('#book-close').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { document.documentElement.style.overflow = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); });
  function open() {
    lastFocus = document.activeElement;
    if (cur === 'done' || cur === 'nofit') reset();
    history = [];
    document.documentElement.style.overflow = 'hidden';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    // they already told us their units on the page, so skip straight to question 2
    show(cur === 'units' && touched ? 'target' : cur, false);
  }
  function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  function reset() {
    $$('input', body).forEach(i => { if (i.type === 'radio' || i.type === 'checkbox') i.checked = false; else { i.value = ''; i.removeAttribute('aria-invalid'); } });
    noUnits = false; $('#f-out').style.opacity = 1; cur = 'units'; day = null; time = null;
  }
  $$('[data-book]').forEach(b => b.addEventListener('click', open));
  function summary() {
    const chips = [noUnits ? 'No units yet' : `${units} units`, 'Target: ' + radio('target'), $('#b-city').value.trim(), BUDGET[radio('budget')]].filter(Boolean);
    $('#summary').innerHTML = chips.map(c => `<span>${esc(c)}</span>`).join('');
  }
  const TIMES = ['09:30', '10:30', '12:00', '14:00', '15:30', '17:00'];
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time zone'; } catch (e) { return 'your time zone'; } })();
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const busy = i => TIMES.filter((_, k) => (i * 7 + k * 3) % 5 === 0); // prototype availability
  function renderDays() {
    $('#b-hi').textContent = $('#b-name').value.trim() || 'there';
    const days = []; const d = new Date(); d.setHours(12, 0, 0, 0);
    while (days.length < 10) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) days.push(new Date(d)); }
    if (!day) day = iso(days[0]);
    const wrap = $('#b-days');
    wrap.innerHTML = days.map((x, i) => `<button type="button" class="day" data-d="${iso(x)}" data-i="${i}" aria-pressed="${day === iso(x)}"><small>${x.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>${x.getDate()}</b><span>${TIMES.length - busy(i).length} slots</span></button>`).join('');
    $$('.day', wrap).forEach(b => b.addEventListener('click', () => { day = b.dataset.d; time = null; $$('.day', wrap).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); slots(+b.dataset.i); }));
    const sel = $('.day[aria-pressed="true"]', wrap);
    slots(sel ? +sel.dataset.i : 0);
    $('#b-tz').textContent = `Times shown in ${tz.replace(/_/g, ' ')}.`;
  }
  function slots(i) {
    const b = busy(i), wrap = $('#b-slots');
    wrap.innerHTML = TIMES.map(t => `<button type="button" class="slot" data-t="${t}" aria-pressed="${time === t}" ${b.includes(t) ? `disabled aria-label="${t}, unavailable"` : ''}>${t}</button>`).join('');
    $$('.slot', wrap).forEach(s => s.addEventListener('click', () => { time = s.dataset.t; $$('.slot', wrap).forEach(x => x.setAttribute('aria-pressed', x === s ? 'true' : 'false')); $('#err-slot').hidden = true; }));
  }
  function confirm() {
    const [y, m, dd] = day.split('-').map(Number), [hh, mm] = time.split(':').map(Number);
    const s = new Date(y, m - 1, dd, hh, mm), e = new Date(s.getTime() + 30 * 60000);
    const t = x => x.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const city = $('#b-city').value.trim();
    $('#d-title').textContent = `You're booked, ${$('#b-name').value.trim()}.`;
    $('#d-sub').textContent = `We've sent the invite and a video link to ${$('#b-email').value.trim()}, plus the STR scaling checklist to read before we talk.`;
    $('#d-mon').textContent = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short' });
    $('#d-day').textContent = s.getDate();
    $('#d-time').textContent = `${t(s)}–${t(e)} · ${tz.replace(/_/g, ' ')}`;
    $('#d-units').textContent = `About your ${noUnits ? 'first unit' : units + ' units'}${city ? ' in ' + city : ''}`;
    const f = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = 'Flex Academy strategy call', det = 'A 20–30 minute call with the team behind The Flex and Base360. Bring your unit list, recent revenue and your biggest bottleneck.';
    $('#d-gcal').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(det)}`;
    $('#d-ocal').href = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${s.toISOString()}&enddt=${e.toISOString()}&body=${encodeURIComponent(det)}`;
    show('done');
  }

  setUnits(units, false);
})();
