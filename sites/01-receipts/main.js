(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Nav + mobile CTA bar ---------------- */
  const nav = $('#nav');
  const mbar = $('#mbar');
  const hero = $('#top');
  const finalSec = $('#book-section');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 16);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  let heroVisible = true, finalVisible = false;
  const syncBar = () => {
    const show = !heroVisible && !finalVisible;
    mbar.classList.toggle('show', show);
    mbar.setAttribute('aria-hidden', show ? 'false' : 'true');
    $$('a,button', mbar).forEach(el => el.tabIndex = show ? 0 : -1);
  };
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; syncBar(); }, { rootMargin: '-40% 0px 0px 0px' }).observe(hero);
    new IntersectionObserver(([e]) => { finalVisible = e.isIntersecting; syncBar(); }).observe(finalSec);
  }

  /* ---------------- Hero: growth ledger ---------------- */
  const STAGES = [
    { count: '1', unit: 'flat', title: 'Raouf moved the furniture in himself.', broke: 'Nothing yet. Every guest message came to one phone.', built: 'A standard for the home: same checklist, same welcome, every stay.' },
    { count: '10', unit: 'units', title: 'The phone never stopped ringing.', broke: 'Check-ins, cleaners and pricing all ran through the founders.', built: 'Written SOPs for cleaning and check-in, and the first ops hire.' },
    { count: '30', unit: 'units', title: 'Revenue grew. Margin didn’t.', broke: 'Spreadsheet pricing, double bookings, no view of profit per unit.', built: 'Dynamic pricing, a unit-level P&L, and better landlord terms.' },
    { count: '100+', unit: 'units', title: 'New cities, new rules.', broke: 'Every city needed its own team, suppliers and regulations.', built: 'A city launch playbook and 150+ corporate housing partners.' },
    { count: '[X]', unit: 'homes', title: 'So they built the software.', broke: 'No tool on the market could run the whole operation.', built: 'Base360: channels, AI pricing, guest inbox, cleaning, finance.' }
  ];
  const ledger = $('#ledger');
  const stops = $$('.stop');
  const fill = $('#fill');
  const cities = $$('.cities span');
  const playBtn = $('#lg-play');
  let cur = 0, timer = null, playing = !reduce;

  function setStage(i) {
    cur = i;
    const s = STAGES[i];
    const apply = () => {
      $('#lg-count').innerHTML = s.count === '[X]' ? '<span class="ph">[X]</span>' : s.count;
      $('#lg-unit').textContent = s.unit;
      $('#lg-title').textContent = s.title;
      $('#lg-broke').textContent = s.broke;
      $('#lg-built').textContent = s.built;
      $('#lg-stage').textContent = `Stage ${i + 1} of ${STAGES.length}`;
      ledger.classList.remove('swap');
    };
    if (reduce) apply(); else { ledger.classList.add('swap'); setTimeout(apply, 220); }
    stops.forEach((b, k) => { b.setAttribute('aria-selected', k === i ? 'true' : 'false'); b.classList.toggle('done', k < i); });
    fill.style.width = (i / (STAGES.length - 1) * 80) + '%';
    cities.forEach(c => c.classList.toggle('on', +c.dataset.i <= i));
  }
  function tick() { setStage((cur + 1) % STAGES.length); }
  function start() { clearInterval(timer); if (playing) timer = setInterval(tick, 4200); }
  function setPlaying(p) {
    playing = p;
    playBtn.setAttribute('aria-label', p ? 'Pause the story' : 'Play the story');
    playBtn.innerHTML = `<svg><use href="#i-${p ? 'pause' : 'play'}"/></svg>`;
    start();
  }
  stops.forEach(b => b.addEventListener('click', () => { setStage(+b.dataset.s); start(); }));
  playBtn.addEventListener('click', () => setPlaying(!playing));
  // pause while the hero is off-screen or the tab is hidden
  document.addEventListener('visibilitychange', () => { if (document.hidden) clearInterval(timer); else start(); });
  setStage(0); setPlaying(playing);

  /* ---------------- Comparison toggle (mobile) ---------------- */
  const tbtns = $$('.compare-toggle button');
  tbtns.forEach(b => b.addEventListener('click', () => {
    tbtns.forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
    $$('.compare [data-col]').forEach(c => {
      const col = c.dataset.col;
      if (col !== 'us') c.classList.toggle('on', col === b.dataset.show);
    });
  }));

  /* ---------------- Email capture (checklist) ---------------- */
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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
      done.innerHTML = `<svg><use href="#i-check"/></svg><span><b>Sent to ${escapeHtml(input.value.trim())}.</b><br>Check your inbox in the next few minutes. You're on the waitlist too.</span>`;
      const help = form.parentElement.querySelector('.capture-help');
      if (help) help.remove();
      form.replaceWith(done);
    });
  });
  $$('[data-checklist]').forEach(el => el.addEventListener('click', e => {
    e.preventDefault();
    const card = $('#checklist');
    card.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    const input = $('#cap-email');
    if (input) setTimeout(() => input.focus({ preventScroll: true }), reduce ? 0 : 500);
  }));

  function escapeHtml(s) { return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  /* ---------------- Booking flow ---------------- */
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

  function show(step, push = true) {
    if (push && state.step !== step) state.history.push(state.step);
    state.step = step;
    steps.forEach(s => s.hidden = s.dataset.step !== step);
    const i = FLOW.indexOf(step);
    const terminal = step === 'done' || step === 'nofit';
    bar.style.width = terminal ? '100%' : ((i + 1) / (FLOW.length + 1) * 100) + '%';
    backBtn.hidden = i <= 0 || terminal;
    meta.textContent = i >= 0 && i < 4 ? `Question ${i + 1} of 4 · about a minute` : step === 'contact' ? 'We never share your details' : step === 'slot' ? 'Free · no obligation' : '';
    nextBtn.innerHTML = step === 'slot' ? 'Confirm call <span class="arr" aria-hidden="true">→</span>'
      : terminal ? 'Done' : 'Continue <span class="arr" aria-hidden="true">→</span>';
    if (step === 'contact') renderSummary();
    if (step === 'slot') renderDays();
    const body = form; body.scrollTop = 0;
    // focus: first control, or the heading on terminal screens
    const cur = steps.find(s => s.dataset.step === step);
    const target = terminal ? $('h2', cur) : ($('input:checked', cur) || $('input', cur) || $('button', cur));
    if (target) setTimeout(() => target.focus({ preventScroll: true }), 30);
  }

  function validate(step) {
    const hide = id => { const e = $('#' + id); if (e) e.hidden = true; };
    const fail = (id, input) => { const e = $('#' + id); if (e) e.hidden = false; if (input) { input.setAttribute('aria-invalid', 'true'); input.focus(); } return false; };
    if (['units', 'target', 'budget'].includes(step)) {
      if (!val(step)) { const first = $(`[data-step="${step}"] input`); first && first.focus(); shake(); return false; }
      return true;
    }
    if (step === 'city') {
      const c = $('#b-city');
      if (!c.value.trim()) return fail('err-city', c);
      c.removeAttribute('aria-invalid'); hide('err-city'); return true;
    }
    if (step === 'contact') {
      const n = $('#b-name'), m = $('#b-email');
      n.removeAttribute('aria-invalid'); m.removeAttribute('aria-invalid'); hide('err-name'); hide('err-email');
      if (!n.value.trim()) return fail('err-name', n);
      if (!EMAIL.test(m.value.trim())) return fail('err-email', m);
      return true;
    }
    if (step === 'slot') {
      if (!state.day || !state.time) return fail('err-slot');
      hide('err-slot'); return true;
    }
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
  function back() {
    const prev = state.history.pop();
    if (prev) show(prev, false);
  }

  // auto-advance when a single-choice answer is picked
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
    $('#b-summary').innerHTML = chips.map(c => `<span>${escapeHtml(c)}</span>`).join('');
  }

  /* calendar */
  const TIMES = ['09:30', '10:30', '12:00', '14:00', '15:30', '17:00'];
  const tz = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'your time zone'; } catch (e) { return 'your time zone'; } })();
  function workdays(n) {
    const out = []; const d = new Date(); d.setHours(12, 0, 0, 0);
    while (out.length < n) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 0 && w !== 6) out.push(new Date(d)); }
    return out;
  }
  function renderDays() {
    $('#b-hi').textContent = val('name') || 'there';
    const days = workdays(10);
    const wrap = $('#b-days');
    wrap.innerHTML = days.map((d, i) => {
      const iso = d.toISOString().slice(0, 10);
      const pressed = state.day === iso || (!state.day && i === 0);
      const free = TIMES.length - taken(i).length;
      return `<button type="button" class="day" data-day="${iso}" data-i="${i}" aria-pressed="${pressed}">
        <small>${d.toLocaleDateString(undefined, { weekday: 'short' })}</small><b>${d.getDate()}</b><span>${free} slots</span></button>`;
    }).join('');
    if (!state.day) state.day = days[0].toISOString().slice(0, 10);
    $$('.day', wrap).forEach(b => b.addEventListener('click', () => {
      state.day = b.dataset.day; state.time = null;
      $$('.day', wrap).forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
      renderSlots(+b.dataset.i);
    }));
    const sel = $('.day[aria-pressed="true"]', wrap);
    renderSlots(sel ? +sel.dataset.i : 0);
    $('#b-tz').textContent = `Times shown in ${tz.replace(/_/g, ' ')}.`;
  }
  function taken(i) { return TIMES.filter((_, k) => (i * 7 + k * 3) % 5 === 0); } // deterministic "busy" slots for the prototype
  function renderSlots(i) {
    const busy = taken(i);
    const wrap = $('#b-slots');
    wrap.innerHTML = TIMES.map(t => `<button type="button" class="slot" data-t="${t}" aria-pressed="${state.time === t}" ${busy.includes(t) ? 'disabled aria-label="' + t + ', unavailable"' : ''}>${t}</button>`).join('');
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
    const name = val('name');
    $('#d-title').textContent = `You're booked, ${name}.`;
    $('#d-sub').textContent = `We've sent the invite and a video link to ${val('email')}, plus the STR scaling checklist to read before we talk.`;
    $('#d-mon').textContent = startD.toLocaleDateString(undefined, { weekday: 'short', month: 'short' });
    $('#d-day').textContent = startD.getDate();
    $('#d-time').textContent = `${startD.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}–${endD.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} · ${tz.replace(/_/g, ' ')} · Video call`;
    const fmt = dt => dt.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const title = 'Flex Academy strategy call';
    const details = 'A 20–30 minute call with the team behind The Flex and Base360. Bring your unit list, recent revenue and your biggest bottleneck.';
    $('#d-gcal').href = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(startD)}/${fmt(endD)}&details=${encodeURIComponent(details)}`;
    $('#d-ocal').href = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(title)}&startdt=${startD.toISOString()}&enddt=${endD.toISOString()}&body=${encodeURIComponent(details)}`;
    show('done');
  }
})();
