function enterApp() {
  el('welcome').classList.add('hidden');
  el('app').classList.remove('hidden');
  renderCases(); renderKB(); renderStats();
}

function goPage(pg, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.add('hidden'));
  el('p-' + pg).classList.remove('hidden');
  document.querySelectorAll('.nav-btn,.bnav').forEach(b => b.classList.remove('active'));
  document.querySelectorAll(`[data-pg="${pg}"]`).forEach(b => b.classList.add('active'));
  if (pg === 'stats') renderStats();
  closeSB();
}

function toggleSB() { el('sidebar').classList.toggle('on'); el('sbOverlay').classList.toggle('on'); }
function closeSB()   { el('sidebar').classList.remove('on'); el('sbOverlay').classList.remove('on'); }

function togglePanel() {
  el('patPanel').classList.toggle('on');
  if (window.innerWidth <= 768) el('ppOverlay').classList.toggle('on');
}
function closePP() { el('patPanel').classList.remove('on'); el('ppOverlay').classList.remove('on'); }

function renderStats() {
  const done = CASES.filter(c => c.score != null), sc = done.map(c => c.score);
  const avg  = sc.length ? Math.round(sc.reduce((a, b) => a + b, 0) / sc.length) : null;
  const best = sc.length ? Math.max(...sc) : null;
  countUp(el('stTotal'), CASES.length, '', 600);
  countUp(el('stDone'), done.length, '', 600);
  if (avg  != null) { el('stAvg').textContent  = '0%'; setTimeout(() => countUp(el('stAvg'),  avg,  '%', 800), 120); }
  else el('stAvg').textContent = '—';
  if (best != null) { el('stBest').textContent = '0%'; setTimeout(() => countUp(el('stBest'), best, '%', 800), 200); }
  else el('stBest').textContent = '—';
  const lst = el('histList');
  if (!done.length) {
    lst.innerHTML = '<div class="no-hist"><div class="no-hist-icon">📋</div><div>Нет завершённых кейсов.<br>Начните тренировку!</div></div>';
    return;
  }
  lst.innerHTML = done.slice().reverse().map((c, i) => {
    const cls = c.score >= 80 ? 'sg-good' : c.score >= 60 ? 'sg-mid' : 'sg-low';
    return `<div class="hi" style="animation-delay:${i * 55}ms"><div class="hi-icon">${c.patientIcon || c.icon}</div><div class="hi-inf"><div class="hi-name">${esc(c.name)}</div><div class="hi-meta">${c.date} · ${c.mode === 'training' ? 'Тренировка' : 'Контроль'}</div></div><div class="hi-sc ${cls}">${c.score}%</div></div>`;
  }).join('');
}

function renderKB() {
  el('kbGrid').innerHTML = DISEASES.map((d, i) => `
    <div class="kb-card" style="animation-delay:${i * 60}ms" onclick="toggleKB(this)">
      <div class="kb-hdr"><div class="kb-icon">${d.icon}</div><div><div class="kb-n">${d.name}</div><div class="kb-c">${d.desc}</div></div><span class="kb-arrow">▼</span></div>
      <div class="kb-tags">${d.syms.map(s => `<span class="kb-tag">${s}</span>`).join('')}</div>
      ${d.kb ? `<div class="kb-body">${esc(d.kb)}</div>` : ''}
    </div>`).join('');
}

function toggleKB(c) {
  c.classList.toggle('open');
  const body = c.querySelector('.kb-body');
  if (body && c.classList.contains('open')) body.style.animation = 'wlFadeUp .22s ease-out';
}
