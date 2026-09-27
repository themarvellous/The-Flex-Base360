(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------- hero phone: before / after, flips on its own until touched ---------- */
  const phone = $('#phone');
  const segBtns = $$('.seg button');
  let auto = null;
  function view(v) {
    phone.dataset.view = v;
    segBtns.forEach(b => b.setAttribute('aria-selected', b.dataset.view === v ? 'true' : 'false'));
    // restart the notification entrance
    $$('.n', phone).forEach(n => { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; });
  }
  segBtns.forEach(b => b.addEventListener('click', () => { clearInterval(auto); auto = null; view(b.dataset.view); }));
  if (!reduce) auto = setInterval(() => { if (!document.hidden) view(phone.dataset.view === 'before' ? 'after' : 'before'); }, 4200);

  /* ---------- nav + mobile bar ---------- */
  const nav = $('#nav'), mbar = $('#mbar'), hero = $('#top'), fin = $('#book-section');
  function onScroll() {
    nav.classList.toggle('solid', hero.getBoundingClientRect().bottom < 70);
    nav.classList.toggle('scrolled', scrollY > 8);
    const show = hero.getBoundingClientRect().bottom < innerHeight * .3 && fin.getBoundingClientRect().top > innerHeight * .6;
    mbar.classList.toggle('show', show);
    mbar.setAttribute('aria-hidden', show ? 'false' : 'true');
    $('button', mbar).tabIndex = show ? 0 : -1;
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- checklist ---------- */
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

  /* ---------- booking ---------- */
  const dlg = $('#book'), body = $('#book-form');
  const steps = $$('.step-f', body);
  const nextBtn = $('#book-next'), backBtn = $('#book-back'), bar = $('#book-bar'), meta = $('#book-meta'), known = $('#known');
  const FLOW = ['units', 'target', 'city', 'budget', 'contact', 'slot'];
  const U = { none: 'No units yet', '1-4': '1–4 units', '5-10': '5–10 units', '11-30': '11–30 units', '30+': '30+ units' };
  const BUDGET = { u5: 'Under £5k', '5-20': '£5k–£20k', '20-50': '£20k–£50k', '50+': '£50k+' };
  let cur = 'units', hist = [], day = null, time = null, lastFocus = null, preset = false;
  const radio = n => { const r = $(`input[name="${n}"]:checked`, body); return r ? r.value : ''; };

  function show(step, push = true) {
    if (push && cur !== step) hist.push(cur);
    cur = step;
    steps.forEach(s => s.hidden = s.dataset.step !== step);
    const i = FLOW.indexOf(step), end = step === 'done' || step === 'nofit';
    bar.style.width = end ? '100%' : ((i + 1) / (FLOW.length + 1) * 100) + '%';
    backBtn.hidden = !hist.length || end;
    known.hidden = !(radio('units') && step !== 'units' && !end);
    $('#known-u').textContent = U[radio('units')] || '';
    meta.textContent = i >= 0 && i < 4 ? 'About a minute' : step === 'contact' ? 'We never share your details' : step === 'slot' ? 'Free · no obligation' : '';
    nextBtn.innerHTML = step === 'slot' ? 'Confirm my call <span class="arr" aria-hidden="true">→</span>' : end ? 'Done' : 'Continue <span class="arr" aria-hidden="true">→</span>';
    if (step === 'contact') summary();
    if (step === 'slot') renderDays();
    body.scrollTop = 0;
    const node = steps.find(s => s.dataset.step === step);
    const f = end ? $('h2', node) : ($('input:checked', node) || $('input', node) || $('button', node));
    if (f) setTimeout(() => f.focus({ preventScroll: true }), 50);
  }
  const fail = (id, input) => { const e = $('#' + id); if (e) e.hidden = false; if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); } return false; };
  const ok = (id, input) => { const e = $('#' + id); if (e) e.hidden = true; if (input) input.removeAttribute('aria-invalid'); };
  function validate(s) {
    if (['units', 'target', 'budget'].includes(s)) { if (!radio(s)) { nudge(); const f = $(`input[name="${s}"]`, body); if (f) f.focus(); return false; } return true; }
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
    if (cur === 'budget' && radio('units') === 'none' && radio('budget') === 'u5') return show('nofit');
    if (cur === 'slot') return confirmCall();
    show(FLOW[FLOW.indexOf(cur) + 1]);
  }
  body.addEventListener('change', e => { if (e.target.type === 'radio') setTimeout(() => { if (cur === e.target.name) next(); }, reduce ? 0 : 260); });
  body.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'radio' && !e.target.closest('[data-capture]')) { e.preventDefault(); next(); } });
  nextBtn.addEventListener('click', next);
  backBtn.addEventListener('click', () => { const p = hist.pop(); if (p) show(p, false); });
  $('#known-change').addEventListener('click', () => show('units'));
  $('#book-close').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });
  dlg.addEventListener('close', () => { document.documentElement.style.overflow = ''; if (lastFocus) lastFocus.focus({ preventScroll: true }); });

  function open(units) {
    lastFocus = document.activeElement;
    if (cur === 'done' || cur === 'nofit') reset();
    hist = [];
    if (units) { const r = $(`input[name="units"][value="${units}"]`, body); if (r) r.checked = true; }
    document.documentElement.style.overflow = 'hidden';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    // a unit count picked on the page means we start at question 2
    show(cur === 'units' && radio('units') ? 'target' : cur, false);
  }
  function close() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }
  function reset() {
    $$('input', body).forEach(i => { if (i.type === 'radio') i.checked = false; else { i.value = ''; i.removeAttribute('aria-invalid'); } });
    cur = 'units'; day = null; time = null;
  }
  $$('[data-book]').forEach(b => b.addEventListener('click', () => open()));
  $$('.qual-opts button').forEach(b => b.addEventListener('click', () => open(b.dataset.units)));

  function summary() {
    const chips = [U[radio('units')], 'Target: ' + radio('target'), $('#b-city').value.trim(), BUDGET[radio('budget')]].filter(Boolean);
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
    const t = x => x.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const city = $('#b-city').value.trim();
    $('#d-title').textContent = `You're booked, ${$('#b-name').value.trim()}.`;
    $('#d-sub').textContent = `We've sent the invite and a video link to ${$('#b-email').value.trim()}, plus the STR scaling checklist to read before we talk.`;
    $('#d-mon').textContent = s.toLocaleDateString(undefined, { weekday: 'short', month: 'short' });
    $('#d-day').textContent = s.getDate();
    $('#d-time').textContent = `${t(s)}–${t(e)} · ${tz.replace(/_/g, ' ')}`;
    $('#d-about').textContent = `About your ${(U[radio('units')] || '').toLowerCase()}${city ? ' in ' + city : ''}`;
    const f = x => x.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = 'Flex Academy strategy call', det = 'A 20–30 minute call with the team behind The Flex and Base360. Bring your unit list, recent revenue and your biggest bottleneck.';
    $('#d-gcal').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${f(s)}/${f(e)}&details=${encodeURIComponent(det)}`;
    $('#d-ocal').href = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${s.toISOString()}&enddt=${e.toISOString()}&body=${encodeURIComponent(det)}`;
    show('done');
  }
})();
