function renderCases(f = 'all') {
  const lst = el('caseList');
  const cc = f === 'all' ? CASES : CASES.filter(c => c.mode === f);
  if (!cc.length) { lst.innerHTML = '<div class="sb-empty">Нет кейсов.<br>Нажмите «Новый кейс»</div>'; return; }
  const activeId = S.selectedCaseId ?? S.currentCaseId;
  lst.innerHTML = cc.slice().reverse().map(c => {
    const hiddenControl = c.mode === 'control' && c.score == null && c.active;
    const displayName = hiddenControl ? '❓ Контрольный кейс' : esc(c.name);
    const displayIcon = hiddenControl ? (c.patientIcon || '👤') : (c.patientIcon || c.icon);
    return `
    <div class="case-row ${c.id === activeId ? 'active' : ''}" data-t="${c.mode}" onclick="selectCase(${c.id})" style="cursor:pointer">
      <div class="case-ico">${displayIcon}</div>
      <div class="case-inf">
        <div class="case-name">${displayName}</div>
        <div class="case-meta">${c.date}${c.score != null ? ' · <b>' + c.score + '%</b>' : c.active ? ' · в процессе' : ''}</div>
      </div>
      <span class="case-badge ${c.mode === 'training' ? 'bt' : 'bc'}">${c.mode === 'training' ? 'Тренировка' : 'Контроль'}</span>
    </div>`;
  }).join('');
}

function selectCase(id) {
  const c = CASES.find(x => x.id === id);
  if (!c) return;
  S.selectedCaseId = id;
  closeSB();
  goPage('chat', null);
  if (c.active && id === S.currentCaseId) { backToActive(); return; }
  viewCase(c);
  renderCases();
}

function viewCase(c) {
  const rawMsgs = MSGS_STORE[c.id];
  const msgs = rawMsgs || [];
  const hasNoHistory = rawMsgs === undefined;
  el('chatEmpty').classList.add('hidden');
  el('chatActive').classList.remove('hidden');
  el('errBanner').classList.add('hidden');
  const viewIcon = c.patientIcon || c.icon;
  el('pAvatar').textContent = viewIcon;
  el('pName').textContent = c.patientName || c.name;
  el('pStatus').textContent = c.score != null ? `Завершён · ${c.score}%` : (c.active ? 'Прерван (прошлая сессия)' : 'Прерван');
  const emptyNote = hasNoHistory
    ? '<div class="mrow sys"><div class="bbl" style="opacity:.6">💾 История недоступна — кейс создан до сохранения диалогов</div></div>'
    : (msgs.length === 0 ? '<div class="mrow sys"><div class="bbl" style="opacity:.6">Сообщения не найдены</div></div>' : '');
  el('msgs').innerHTML = `
    <div class="mrow sys"><div class="bbl">📂 История: ${esc(c.name)} · ${c.date}</div></div>
    ${emptyNote}
    ${msgs.map(m => {
      if (m.role === 'user') return `<div class="mrow user"><div class="mav u">ВЫ</div><div><div class="bbl">${esc(m.txt)}</div><div class="mtime">${m.time}</div></div></div>`;
      if (m.role === 'bot')  return `<div class="mrow bot"><div class="mav b">${viewIcon}</div><div><div class="bbl">${esc(m.txt)}</div><div class="mtime">${m.time}</div></div></div>`;
      return `<div class="mrow sys"><div class="bbl">${esc(m.txt)}</div></div>`;
    }).join('')}
    <div class="typing-row" id="typingRow"></div>`;
  const backLabel = S.active ? '← Текущий кейс' : '← Назад';
  const isOrphan = c.active && c.id !== S.currentCaseId;
  el('qbtns').innerHTML = `
    <button class="qbtn fin" onclick="backToActive()">${backLabel}</button>
    ${isOrphan
      ? `<button class="qbtn" style="background:#c0392b;border-color:#c0392b;color:#fff" onclick="abortOrphan(${c.id})">🗑 Прервать сессию</button>`
      : `<button class="qbtn" onclick="openModal()">🎯 Новый кейс</button>`}`;
  _stopRec(true);
  el('msgInput').placeholder = 'Режим просмотра истории';
  scrollB();
}

async function abortOrphan(id) {
  const c = CASES.find(x => x.id === id);
  if (!c) return;
  if (!confirm('Прервать эту сессию? Это освободит бэкенд для нового кейса.')) return;
  if (c.sid) await apiDel(c.sid);
  c.active = false; saveC(); renderCases();
  showToast('Сессия прервана — теперь можно начать новый кейс');
  viewCase(c);
}

function backToActive() {
  S.selectedCaseId = S.currentCaseId;
  el('msgInput').placeholder = 'Задайте вопрос пациенту...';
  if (!S.active) {
    el('chatEmpty').classList.remove('hidden');
    el('chatActive').classList.add('hidden');
    return;
  }
  el('pName').textContent = S.patientName || S.disease?.patient || '';
  el('pStatus').textContent = S.mode === 'control'
    ? 'Ожидает вопроса · Диагноз неизвестен'
    : `Ожидает вопроса · ${S.disease?.name || ''}`;
  const msgs = MSGS_STORE[S.currentCaseId] || [];
  const icon = S.displayIcon || S.disease?.icon || '🧑';
  el('msgs').innerHTML = `
    ${msgs.map(m => {
      if (m.role === 'user') return `<div class="mrow user"><div class="mav u">ВЫ</div><div><div class="bbl">${esc(m.txt)}</div><div class="mtime">${m.time}</div></div></div>`;
      if (m.role === 'bot')  return `<div class="mrow bot"><div class="mav b">${icon}</div><div><div class="bbl">${esc(m.txt)}</div><div class="mtime">${m.time}</div></div></div>`;
      return `<div class="mrow sys"><div class="bbl">${esc(m.txt)}</div></div>`;
    }).join('')}
    <div class="typing-row" id="typingRow"><div class="mav b" id="typingAv">${icon}</div><div class="typing-bbl"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div></div>`;
  setQbtns(S.qCount === 0 ? 'start' : '');
  if (S.qCount > 0) updateQbtns();
  scrollB();
  renderCases();
}

function filterCases(f, btn) {
  document.querySelectorAll('.sb-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  const lst = el('caseList');
  lst.classList.add('fading');
  setTimeout(() => {
    renderCases(f);
    lst.classList.remove('fading');
    lst.querySelectorAll('.case-row').forEach((row, i) => {
      row.classList.add('animating');
      row.style.animationDelay = `${i * 40}ms`;
      row.addEventListener('animationend', () => row.classList.remove('animating'), { once: true });
    });
  }, 170);
}

async function clearHistory() {
  if (!confirm('Очистить всю историю кейсов?')) return;
  if (S.active) {
    clearInterval(S.tmr); _stopRec(true);
    if (S.sid) await apiDel(S.sid);
    S.active = false; S.sid = null; S.currentCaseId = null; S.selectedCaseId = null;
    localStorage.removeItem('smii_sid');
    el('chatEmpty').classList.remove('hidden');
    el('chatActive').classList.add('hidden');
  }
  CASES.length = 0; saveC();
  for (const k in MSGS_STORE) delete MSGS_STORE[k];
  saveMsgs();
  renderCases(); renderStats();
}
