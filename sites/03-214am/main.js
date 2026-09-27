(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* =========================================================
     The night: one scroll timeline drives clock, panels, phone
     ========================================================= */
  const story = $('#story');
  const stack = $('#stack');
  const device = $('#device');
  // segment start points along the story (0..1): call, stall, 4 chapters, morning
  const SEG = [0, .1, .26, .42, .58, .74, .9];
  const HOUSE = '<svg><use href="#mark"/></svg>';
  const N = {
    c1: { cat: 'guest', ic: '✉', c: '#E0654B', app: 'Guest inbox', t: 'Flat 4 · Guest', b: 'We’re outside and the door code isn’t working.' },
    c2: { cat: 'clean', ic: 'C', c: '#C8984A', app: 'Cleaning', t: 'Maria (cleaner)', b: 'Can’t do Hackney at 11. Can someone else?' },
    c3: { cat: 'channel', ic: '!', c: '#B4492F', app: 'Channels', t: 'Double booking', b: 'Flat 9 is booked twice for 12–14 Oct.' },
    c4: { cat: 'money', ic: '£', c: '#2F6F55', app: 'Sheets', t: 'pricing_v7_FINAL(2).xlsx', b: 'Weekend rates not updated since March.' },
    c5: { cat: 'landlord', ic: 'L', c: '#5A5A7A', app: 'Messages', t: 'Landlord · Mr Okafor', b: 'Rent for October? Also the boiler is making a noise.' },
    c6: { cat: 'guest', ic: '✉', c: '#E0654B', app: 'Guest inbox', t: 'Flat 12 · Guest', b: 'No hot water. We want a refund.' },
    c7: { cat: 'money', ic: '£', c: '#2F6F55', app: 'Bank', t: 'Payment failed', b: 'Laundry supplier invoice declined.' },
    c8: { cat: 'guest', ic: '✉', c: '#E0654B', app: 'Guest inbox', t: 'Flat 2 · Guest', b: 'Can we check in at 8am instead?' },
    r0: { calm: 1, ic: HOUSE, app: 'Unit P&L', t: 'October P&L is ready', b: '11 of 12 units profitable. Flat 7 flagged to renegotiate.' },
    r1: { calm: 1, ic: HOUSE, app: 'Base360', t: 'Overnight: handled', b: '31 guest messages answered, 4 smart-code check-ins, cleaner reassigned.' },
    r2: { calm: 1, ic: HOUSE, app: 'Deals', t: 'Agreement signed', b: 'Management agreement, Flats 13–16, 18 months.' },
    r3: { calm: 1, ic: HOUSE, app: 'Ops manager', t: 'Sam handled 6 issues', b: 'Summary in your inbox at 8:00. Nothing needs you.' },
    m0: { morning: 1, ic: HOUSE, app: 'Flex Academy', t: 'Good morning', b: 'Week 12 done. Today: plan your next city.' }
  };
  // what the lock screen shows in each segment (newest first)
  const SHOW = [
    ['c4', 'c3', 'c2', 'c1'],
    ['c8', 'c7', 'c6', 'c5', 'c4', 'c3', 'c2', 'c1'],
    ['r0', 'c8', 'c6', 'c5', 'c3', 'c2', 'c1'],
    ['r1', 'r0', 'c5'],
    ['r2', 'r1', 'r0'],
    ['r3', 'r2', 'r1', 'r0'],
    ['m0', 'r3']
  ];
  const UNREAD = [4, 47, 38, 9, 3, 0, 0];

  function notifEl(id) {
    const n = N[id];
    const li = document.createElement('li');
    li.className = 'notif' + (n.calm ? ' calm' : '') + (n.morning ? ' morning' : '');
    li.dataset.id = id;
    li.innerHTML = `<i class="n-ic" style="--c:${n.c || ''}">${n.ic}</i><div><p class="n-top"><b>${n.app}</b><span>now</span></p><p class="n-t">${n.t}</p><p class="n-b">${n.b}</p></div>`;
    return li;
  }
  let shown = [];
  function setStack(ids, animate) {
    const keep = new Set(ids);
    $$('.notif', stack).forEach(el => {
      if (!keep.has(el.dataset.id) && !el.classList.contains('leave')) {
        if (!animate || reduce) el.remove();
        else { el.classList.remove('enter'); el.classList.add('leave'); setTimeout(() => el.remove(), 430); }
      }
    });
    let arrived = 0;
    ids.slice().reverse().forEach((id, k) => { // oldest first, so the newest ends on top
      let el = $(`.notif[data-id="${id}"]:not(.leave)`, stack);
      if (!el) {
        el = notifEl(id);
        if (animate && !reduce) { el.classList.add('enter'); el.style.animationDelay = `${arrived * 110}ms`; }
        arrived++;
        stack.prepend(el);
      } else stack.prepend(el);
    });
    shown = ids;
    return arrived;
  }
  function buzz() { if (reduce) return; device.classList.remove('buzz'); void device.offsetWidth; device.classList.add('buzz'); }

  /* ---------- sky: a street of windows, lit windows fade as the night ends ---------- */
  const win = $('#windows');
  const lights = [];
  for (let i = 0; i < 48; i++) {
    const tower = document.createElement('i');
    const h = 30 + ((i * 37) % 70);
    tower.style.height = h + '%';
    const floors = Math.max(2, Math.round(h / 12));
    for (let f = 0; f < floors; f++) { const b = document.createElement('b'); tower.appendChild(b); lights.push(b); }
    win.appendChild(tower);
  }
  const litOrder = lights.map((_, i) => i).sort((a, b) => ((a * 7919) % 97) - ((b * 7919) % 97));

  /* ---------- panels, rail, clock ---------- */
  const panels = $$('.panel');
  const railBtns = $$('.rail button');
  const clock = $('#clock'), stTime = $('#st-time'), dnd = $('#dnd'), unread = $('#unread'), unreadN = $('#unread-n');
  const hint = $('#hint');
  let seg = -1, lastUnits = -1;
  const fmt = mins => `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;

  function progress() {
    const r = story.getBoundingClientRect();
    return clamp(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
  }
  function render() {
    const p = progress();
    let s = 0; SEG.forEach((b, i) => { if (p >= b) s = i; });
    // the night passes: 2:14am → 7:30am
    const mins = 134 + Math.round(Math.min(1, p / .92) * 316);
    clock.textContent = fmt(mins); stTime.textContent = fmt(mins);
    document.documentElement.style.setProperty('--dawn', clamp((p - .62) / .34, 0, 1).toFixed(3));
    const litTarget = Math.round(lights.length * (0.34 - clamp((p - .5) / .5, 0, 1) * .3));
    litOrder.forEach((idx, k) => lights[idx].classList.toggle('lit', k < litTarget));
    hint.classList.toggle('gone', p > .015);
    // the stall: units and hours climb as you scroll through it
    if (s === 1 || s === 0) {
      const local = clamp((p - SEG[1]) / (SEG[2] - SEG[1]), 0, 1);
      const u = 5 + Math.round(local * 25);
      if (u !== lastUnits) { lastUnits = u; $('#m-units').textContent = u; $('#m-hours').textContent = Math.round(2 + 3.3 * u); }
    }
    if (s !== seg) {
      const prev = seg; seg = s;
      panels.forEach((el, i) => { el.classList.toggle('is-on', i === s); el.setAttribute('aria-hidden', i === s ? 'false' : 'true'); });
      railBtns.forEach((b, i) => { b.toggleAttribute('aria-current', false); if (i === s) b.setAttribute('aria-current', 'step'); b.classList.toggle('done', i < s); });
      const arrived = setStack(SHOW[s], prev !== -1);
      if (arrived && s <= 1 && prev !== -1) buzz();
      unreadN.textContent = UNREAD[s];
      unread.classList.toggle('zero', UNREAD[s] === 0);
      dnd.style.opacity = s >= 5 ? 1 : .35;
    }
  }
  railBtns.forEach((b, i) => b.addEventListener('click', () => {
    const top = story.getBoundingClientRect().top + scrollY;
    const span = story.offsetHeight - innerHeight;
    window.scrollTo({ top: top + span * (SEG[i] + (i < 6 ? .02 : .05)), behavior: reduce ? 'auto' : 'smooth' });
  }));

  // opening: the first notifications arrive one by one, the phone buzzes
  render();
  if (!reduce && progress() < SEG[1]) {
    setStack([], false);
    ['c1', 'c2', 'c3', 'c4'].forEach((id, k) => setTimeout(() => {
      if (seg !== 0) return;
      const ids = SHOW[0].slice(SHOW[0].length - 1 - k);
      setStack(ids, true); buzz();
    }, 500 + k * 900));
  }

  /* =========================================================
     Nav, mobile bar
     ========================================================= */
  const nav = $('#nav'), mbar = $('#mbar');
  const lightSecs = [$('#apps'), $('#chat')];
  let raf = 0;
  function onScroll() {
    raf = 0;
    render();
    nav.classList.toggle('solid', scrollY > story.offsetHeight - innerHeight + 10);
    const mid = 30;
    const onLight = lightSecs.some(s => { const r = s.getBoundingClientRect(); return r.top <= mid && r.bottom >= mid; });
    nav.classList.toggle('on-light', onLight);
    const storyEnd = story.getBoundingClientRect().bottom < innerHeight * .6;
    const fin = $('#book-section').getBoundingClientRect();
    const show = storyEnd && fin.top > innerHeight * .5;
    mbar.classList.toggle('show', show);
    mbar.setAttribute('aria-hidden', show ? 'false' : 'true');
    $('button', mbar).tabIndex = show ? 0 : -1;
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(onScroll); }, { passive: true });
  addEventListener('resize', () => { if (!raf) raf = requestAnimationFrame(onScroll); });
  onScroll();

  /* =========================================================
     What you get: a home screen
     ========================================================= */
  const APPS = [
    { k: 'Live · 12 sessions', t: 'A weekly group session', p: '90 minutes, live and recorded. One topic a week, worked through on members’ real units.', l: ['Weeks 1–3 · Economics', 'Weeks 4–6 · Operations', 'Weeks 7–9 · Deals', 'Weeks 10–12 · Team & scale'] },
    { k: 'Founders · 3 calls', t: 'A monthly 1:1 with a founder', p: 'Bring your numbers. Leave with decisions on your pricing, your deals or your next hire.', l: ['Month 1 · Your unit P&L', 'Month 2 · Your next deal', 'Month 3 · Your 12-month plan'] },
    { k: 'Playbook · [40+] documents', t: 'The documents The Flex runs on', p: 'Templates and SOPs used every day in a real business, not written for a course.', l: ['Cleaning & check-in SOPs', 'Unit P&L model', 'Landlord pitch deck', 'Ops manager scorecard'] },
    { k: 'Base360 · 12 weeks', t: 'The software, set up with you', p: 'The system that runs The Flex, live on your units by week 6. Keep it after, or don’t.', l: ['Channel manager, 130+ channels', 'AI pricing', 'One guest inbox', 'Cleaning & finance'] },
    { k: 'Community · always on', t: 'Operators at your stage', p: 'A private group across cities for suppliers, landlords and what’s working. Yours to keep after the 12 weeks.', l: ['Weekly wins thread', 'Supplier directory', 'City channels'] }
  ];
  const sheet = $('#sheet');
  function openApp(i) {
    const a = APPS[i];
    $('#sh-k').innerHTML = esc(a.k).replace('[40+]', '<span class="ph">[40+]</span>');
    $('#sh-t').textContent = a.t; $('#sh-p').textContent = a.p;
    $('#sh-l').innerHTML = a.l.map(x => `<li>${esc(x)}</li>`).join('');
    $$('.app-list button').forEach(b => b.setAttribute('aria-selected', +b.dataset.app === i ? 'true' : 'false'));
    $$('.icons button').forEach(b => b.classList.toggle('on', +b.dataset.app === i));
    if (!reduce) { sheet.classList.remove('swap'); void sheet.offsetWidth; sheet.classList.add('swap'); }
  }
  $$('[data-app]').forEach(b => b.addEventListener('click', () => openApp(+b.dataset.app)));
  openApp(0);

  /* =========================================================
     Chat: messages arrive as you read
     ========================================================= */
  const msgs = $$('.msg');
  if ('IntersectionObserver' in window && !reduce) {
    msgs.forEach(m => { if (m.getBoundingClientRect().top > innerHeight) m.classList.add('pre'); });
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); e.target.classList.remove('pre'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    msgs.forEach(m => io.observe(m));
  }

  /* =========================================================
     Checklist capture
     ========================================================= */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  $$('[data-capture]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault();
    const input = $('input[type=email]', form);
    let err = form.nextElementSibling && form.nextElementSibling.classList.contains('capture-err') ? form.nextElementSibling : null;
    if (!EMAIL.test(input.value.trim())) {
      input.setAttribute('aria-invalid', 'true');
      if (!err) { err = document.createElement('p'); err.className = 'capture-err'; err.setAttribute('role', 'alert'); form.after(err); }
      err.textContent = 'Enter an email like name@company.com.';
      input.focus(); return;
    }
    if (err) err.remove();
    const done = document.createElement('div');
    done.className = 'capture-done'; done.setAttribute('role', 'status');
    done.innerHTML = `<svg><use href="#i-check"/></svg><span><b>Sent to ${esc(input.value.trim())}.</b><br>Check your inbox in a few minutes. You're on the waitlist too.</span>`;
    const help = form.parentElement.querySelector('.capture-help'); if (help) help.remove();
    form.replaceWith(done);
  }));
  $$('[data-checklist]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    $('#checklist').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    setTimeout(() => { const i = $('#cap-email'); if (i) i.focus({ preventScroll: true }); }, reduce ? 0 : 700);
  }));

  /* =========================================================
     Booking: a phone app that ends on a lock screen
     ========================================================= */
  const dlg = $('#book'), body = $('#book-form');
  const steps = $$('.step-f', body);
  const nextBtn = $('#book-next'), backBtn = $('#book-back'), bar = $('#book-bar');
  const FLOW = ['units', 'target', 'city', 'budget', 'contact', 'slot'];
  let cur = 'units', hist = [], units = 12, noUnits = false, day = null, time = null, lastFocus = null;
  const radio = n => { const r = $(`input[name="${n}"]:checked`, body); return r ? r.value : ''; };
  const BUDGET = { u5: 'Under £5k', '5-20': '£5k–£20k', '20-50': '£20k–£50k', '50+': '£50k+' };
  const setUnits = n => { units = clamp(n, 1, 200); $('#f-out').value = $('#f-out').textContent = units; };

  function show(step, push = true) {
    if (push && cur !== step) hist.push(cur);
    cur = step;
    steps.forEach(s => s.hidden = s.dataset.step !== step);
    const i = FLOW.indexOf(step), end = step === 'done' || step === 'nofit';
    dlg.classList.toggle('is-done', step === 'done');
    bar.style.width = end ? '100%' : ((i + 1) / (FLOW.length + 1) * 100) + '%';
    backBtn.hidden = !hist.length || end;
    nextBtn.innerHTML = step === 'slot' ? 'Confirm my call <span class="arr" aria-hidden="true">→</span>' : end ? 'Done' : 'Continue <span class="arr" aria-hidden="true">→</span>';
    if (step === 'contact') summary();
    if (step === 'slot') renderDays();
    body.scrollTop = 0;
    const node = steps.find(s => s.dataset.step === step);
    const f = end ? $('h2, .done-clock', node) : ($('input:checked', node) || $('input:not([type=checkbox])', node) || $('button', node));
    if (f) { if (end) f.setAttribute('tabindex', '-1'); setTimeout(() => f.focus({ preventScroll: true }), 50); }
  }
  const fail = (id, input) => { const e = $('#' + id); if (e) e.hidden = false; if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); } return false; };
  const ok = (id, input) => { const e = $('#' + id); if (e) e.hidden = true; if (input) input.removeAttribute('aria-invalid'); };
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
    if (cur === 'budget' && noUnits && radio('budget') === 'u5') return show('nofit');
    if (cur === 'slot') return confirmCall();
    show(FLOW[FLOW.indexOf(cur) + 1]);
  }
  body.addEventListener('change', e => { if (e.target.type === 'radio') setTimeout(() => { if (cur === e.target.name) next(); }, reduce ? 0 : 280); });
  body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && !['radio', 'checkbox'].includes(e.target.type) && !e.target.closest('[data-capture]')) { e.preventDefault(); next(); } });
  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', () => { const p = hist.pop(); if (p) show(p, false); });
  $('#f-minus').addEventListener('click', () => setUnits(units - 1));
  $('#f-plus').addEventListener('click', () => setUnits(units + 1));
  $('#f-none').addEventListener('change', e => { noUnits = e.target.checked; $('#f-out').style.opacity = noUnits ? .3 : 1; });
  $('#book-close').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { document.documentElement.style.overflow = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); });
  function open() {
    lastFocus = document.activeElement;
    if (cur === 'done' || cur === 'nofit') reset();
    hist = [];
    document.documentElement.style.overflow = 'hidden';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    show(cur, false);
  }
  function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  function reset() {
    $$('input', body).forEach(i => { if (i.type === 'radio' || i.type === 'checkbox') i.checked = false; else { i.value = ''; i.removeAttribute('aria-invalid'); } });
    noUnits = false; $('#f-out').style.opacity = 1; cur = 'units'; day = null; time = null; setUnits(12);
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
    wrap.innerHTML = days.map((x, i) => `<button type="button" class="day" data-d="${iso(x)}" data-i="${i}" aria-pressed="${day === iso(x)}"><small>${x.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>${x.getDate()}</b><span>${TIMES.length - busy(i).length} free</span></button>`).join('');
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
  function confirmCall() {
    const [y, m, dd] = day.split('-').map(Number), [hh, mm] = time.split(':').map(Number);
    const s = new Date(y, m - 1, dd, hh, mm), e = new Date(s.getTime() + 30 * 60000);
    const city = $('#b-city').value.trim();
    $('#d-clock').textContent = time;
    $('#d-date').textContent = s.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    $('#d-title').textContent = `Call booked, ${$('#b-name').value.trim()}`;
    $('#d-sub').textContent = `About your ${noUnits ? 'first unit' : units + ' units'}${city ? ' in ' + city : ''}. Invite, video link and the scaling checklist sent to ${$('#b-email').value.trim()}.`;
    const f = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = 'Flex Academy strategy call', det = 'A 20–30 minute call with the team behind The Flex and Base360. Bring your unit list, recent revenue and your biggest bottleneck.';
    $('#d-gcal').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(det)}`;
    $('#d-ocal').href = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${s.toISOString()}&enddt=${e.toISOString()}&body=${encodeURIComponent(det)}`;
    show('done');
  }
})();
