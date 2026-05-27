async function startCase() {
  const mEl = document.querySelector('.m-card.sel');
  if (!mEl) return;
  const mode = mEl.dataset.mode;
  let dkey;
  if (mode === 'control') {
    dkey = DISEASES[Math.floor(Math.random() * DISEASES.length)].key;
  } else {
    const dEl = document.querySelector('.d-card.sel');
    if (!dEl) return;
    dkey = dEl.dataset.key;
  }
  const d = DM[dkey] || DISEASES[0];

  const btn = el('startBtn');
  btn.innerHTML = '<span class="spin"></span>';
  btn.disabled = true;

  const prevSid = S.sid || localStorage.getItem('smii_sid');
  if (prevSid) { await apiDel(prevSid); S.sid = null; }

  let sid = null, greet = d.greet, patientName = d.patient, patientAge = d.age, patientGender = d.gender;
  if (HAS_BACKEND) {
    try {
      const r = await apiStart(dkey, mode);
      sid = r.session_id || r.id;
      if (sid) localStorage.setItem('smii_sid', sid);
      if (r.greeting) greet = r.greeting;
      const p = r.patient || {};
      if (p.fio)    patientName   = p.fio;
      if (p.age)    patientAge    = p.age;
      if (p.gender) patientGender = p.gender === 'Ж' ? 'Женщина' : p.gender === 'М' ? 'Мужчина' : p.gender;
      S.apiOk = true;
    } catch (e) {
      if (e.status === 409) {
        btn.innerHTML = 'Начать кейс →'; btn.disabled = false;
        closeModal();
        const orphan = CASES.find(x => x.active && x.id !== S.currentCaseId);
        if (orphan) {
          selectCase(orphan.id);
          showToast('Активная сессия найдена — нажмите «Прервать сессию» чтобы освободить место для нового кейса');
        } else {
          showToast(e.detail || 'Предыдущая сессия ещё активна — подождите секунду и попробуйте снова.');
        }
        return;
      }
      console.error('apiStart failed:', e); S.apiOk = false;
    }
  } else { S.apiOk = false; }
  S.patientName = patientName;

  btn.innerHTML = 'Начать кейс →'; btn.disabled = false; closeModal();
  el('msgInput').disabled = false; el('sendBtn').disabled = false; el('micBtn').disabled = false;
  el('msgInput').placeholder = 'Задайте вопрос пациенту...';

  S.sid = sid; S.active = true; S.disease = d; S.mode = mode; S.qCount = 0; S.t0 = Date.now(); mockIdx = 0;
  S.displayIcon = mode === 'control' ? patientEmoji(patientAge, patientGender) : d.icon;
  clearInterval(S.tmr);
  S.tmr = setInterval(() => {
    const sec = Math.floor((Date.now() - S.t0) / 1000);
    const m = Math.floor(sec / 60), s = sec % 60;
    el('ppDur').textContent = m > 0 ? `${m} мин${s > 0 ? ' ' + s + ' сек' : ''}` : `${s} сек`;
  }, 1000);

  el('chatEmpty').classList.add('hidden');
  el('chatActive').classList.remove('hidden');
  const isControl = mode === 'control';
  const dispIcon = S.displayIcon;
  el('pAvatar').textContent = dispIcon; el('pName').textContent = patientName;
  el('pStatus').textContent = isControl ? 'Ожидает вопроса · Диагноз неизвестен' : `Ожидает вопроса · ${d.name}`;
  el('ppAv').textContent = dispIcon; el('ppName').textContent = patientName;
  el('ppMeta').textContent = patientAge ? `${patientAge} лет · ${patientGender}` : '—';
  el('ppDisease').textContent = isControl ? '❓ Поставьте диагноз' : `${d.icon} ${d.name}`;
  el('ppMode').textContent = isControl ? 'Контроль' : 'Тренировка';
  el('ppQ').textContent = '0'; el('ppDur').textContent = '0 сек'; el('ppFill').style.width = '0%';

  el('msgs').innerHTML = `<div class="typing-row" id="typingRow">
    <div class="mav b" id="typingAv">${dispIcon}</div>
    <div class="typing-bbl"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>
  </div>`;

  setQbtns('start');

  const entry = {
    id: Date.now(), key: dkey, name: d.name, icon: d.icon, patientIcon: dispIcon,
    mode, date: new Date().toLocaleDateString('ru', { day: 'numeric', month: 'short' }),
    active: true, score: null, patientName, sid: sid || null,
  };
  S.currentCaseId = entry.id;
  S.selectedCaseId = entry.id;
  MSGS_STORE[entry.id] = [];
  CASES.push(entry); saveC(); renderCases();

  goPage('chat', null);
  await showTyping(1300);
  hideTyping();
  addMsg(greet, 'bot');
}

function showDiagnosisStep() {
  if (!S.active) return;
  _stopRec(true);
  S.diagMode = true;
  addMsg('Консультация завершена. Поставьте ваш диагноз — какое заболевание у пациента?', 'sys');
  el('qbtns').innerHTML = `<span style="font-size:13px;color:var(--gray-t);padding:4px 2px">⬆ Введите диагноз в строке выше и нажмите отправить</span>`;
  const inp = el('msgInput');
  inp.disabled = false; inp.value = '';
  inp.placeholder = 'Введите диагноз пациента...';
  el('sendBtn').disabled = false; el('micBtn').disabled = false;
  inp.focus();
  scrollB();
}

async function submitDiag(text) {
  S.diagMode = false;
  el('msgInput').placeholder = 'Задайте вопрос пациенту...';
  addMsg(text, 'user');
  const actual = S.disease?.name || '';
  const isCorrect = _diagMatch(text, actual);
  if (S.sid && S.apiOk) { try { await apiDiagnosis(S.sid, text); } catch {} }
  await finishCase(isCorrect, actual);
}

async function finishCase(diagCorrect = null, actualDisease = null) {
  if (!S.active) return; S.active = false;
  _stopRec(true);
  if (diagCorrect === null) addMsg('✅ Завершить консультацию и получить отчёт', 'user');
  await showTyping(2200);
  let data = null;
  if (S.sid && S.apiOk) try { data = await apiFinish(S.sid); } catch {}

  const pct   = data?.coverage != null ? Math.round(data.coverage * 100) : Math.min(10 + S.qCount * 9, 95);
  const lang  = data?.language_quality?.score != null ? Math.round(data.language_quality.score * 100) : 74 + Math.round(Math.random() * 21);
  const total = data?.total_score != null ? Math.round(data.total_score * 100) : Math.round(pct * .7 + lang * .3);

  const [sc, sb] = total >= 80 ? ['var(--green)', 'var(--green-l)']
                 : total >= 60 ? ['#F59E0B', '#FFF8E1']
                 :               ['#EF5350', '#FFEBEE'];

  const attrs = data?.attributes?.length
    ? data.attributes.map(a => ({ n: a.label || a.name || a.n || String(a), ok: !!(a.collected ?? a.found ?? a.ok) }))
    : [
        { n: 'Основные жалобы',       ok: S.qCount >= 1 },
        { n: 'Анамнез заболевания',   ok: S.qCount >= 2 },
        { n: 'Семейный анамнез',      ok: S.qCount >= 3 },
        { n: 'Динамика симптомов',    ok: S.qCount >= 4 },
        { n: 'Текущие препараты',     ok: S.qCount >= 5 },
        { n: 'Гликемический профиль', ok: S.qCount >= 7 },
      ];

  const langComment = data?.language_quality?.comment || (lang >= 80 ? 'Терминология использована хорошо.' : 'Требуется улучшение стилистики.');
  const langErrors  = data?.language_quality?.errors  || [];

  hideTyping();
  const repId = 'rep_' + Date.now();
  addMsg(`<div class="rep-card" id="${repId}">
    <div class="rep-tabs">
      <button class="rep-tab active" onclick="showTab(this,'t')">🏆 Итог</button>
      <button class="rep-tab" onclick="showTab(this,'a')">📋 Анамнез</button>
      <button class="rep-tab" onclick="showTab(this,'l')">📝 Язык</button>
    </div>
    <div class="rep-body" id="rt">
      ${buildScoreCircle(total, sc, sb, 'итог')}
      <div class="arow"><span>Охват анамнеза (70%)</span><span style="font-weight:600">${pct}%</span></div>
      <div class="arow"><span>Качество языка (30%)</span><span style="font-weight:600">${lang}%</span></div>
      ${diagCorrect !== null ? `<div class="arow"><span>Диагноз</span><span class="${diagCorrect ? 'ok' : 'no'}" style="font-weight:600">${diagCorrect ? '✓ Верно' : '✗ Неверно'}</span></div>${diagCorrect === false ? `<div style="font-size:12px;color:var(--gray-t);padding:2px 0 6px 4px">Правильный ответ: ${esc(actualDisease || '')}</div>` : ''}` : ''}
      <div style="margin-top:10px;padding:10px;background:${sb};border-radius:10px;font-size:13px;color:${sc}">
        ${total >= 80 ? '🏆 Отлично! Так держать!' : total >= 60 ? '👍 Неплохо! Уточняйте анамнез подробнее.' : '📚 Нужно больше практики. Задавайте больше вопросов.'}
      </div>
    </div>
    <div class="rep-body" id="ra" style="display:none">
      ${buildScoreCircle(pct, sc, sb, 'охват')}
      ${attrs.map(a => `<div class="arow" style="animation:hiIn .25s ease-out both"><span>${esc(a.n)}</span><span class="${a.ok ? 'ok' : 'no'}">${a.ok ? '✓' : '✗'}</span></div>`).join('')}
    </div>
    <div class="rep-body" id="rl" style="display:none">
      ${buildScoreCircle(lang, '#1565C0', '#E3F2FD', 'язык')}
      <div style="font-size:13px;color:var(--gray-t);margin-bottom:8px">${esc(langComment)}</div>
      ${langErrors.length ? `<div style="font-size:13px;padding:8px;background:var(--gray);border-radius:8px">${langErrors.map(e => `💡 ${esc(e)}`).join('<br>')}</div>` : ''}
    </div>
  </div>`, 'html');

  setTimeout(() => {
    const repEl = document.getElementById(repId);
    if (repEl) activateRings(repEl.querySelector('#rt'));
  }, 80);

  const diagBonus = diagCorrect === true ? ' · Диагноз верный ✓' : diagCorrect === false ? ' · Диагноз неверный ✗' : '';
  if (total >= 80) {
    setTimeout(() => { launchConfetti(120); showToast(`🏆 Отличный результат — ${total}%!${diagBonus}`); }, 400);
  } else if (total >= 60) {
    showToast(`👍 Кейс завершён — ${total}%${diagBonus}`);
  } else if (diagCorrect !== null) {
    showToast(`📋 Кейс завершён — ${total}%${diagBonus}`);
  }

  const last = CASES.find(c => c.id === S.currentCaseId) || CASES[CASES.length - 1];
  if (last) { last.score = total; last.active = false; saveC(); }
  setQbtns('done'); clearInterval(S.tmr); renderCases();
}

function showTab(btn, t) {
  const card = btn.closest('.rep-card');
  card.querySelectorAll('.rep-tab').forEach(b => b.classList.remove('active')); btn.classList.add('active');
  ['ra', 'rl', 'rt'].forEach(id => { const e = card.querySelector('#' + id); if (e) e.style.display = 'none'; });
  const m = { a: 'ra', l: 'rl', t: 'rt' };
  const target = card.querySelector('#' + m[t]);
  if (target) { target.style.display = 'block'; activateRings(target); }
}

async function abortCase() {
  if (!confirm('Прервать текущий кейс?')) return;
  S.active = false; _stopRec(true);
  if (S.sid) await apiDel(S.sid); S.sid = null; clearInterval(S.tmr);
  addMsg('❌ Кейс прерван', 'sys'); setQbtns('done');
  const last = CASES.find(c => c.id === S.currentCaseId) || CASES[CASES.length - 1];
  if (last && last.active) { last.active = false; saveC(); } renderCases();
}
