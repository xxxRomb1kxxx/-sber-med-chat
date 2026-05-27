const _qpool = [];

function quickQ(t) { el('msgInput').value = t; sendMsg(); }
function _qClick(i) { quickQ(_qpool[i]); }
function onKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }
function autoResize(el2) { el2.style.height = 'auto'; el2.style.height = Math.min(el2.scrollHeight, 96) + 'px'; }

function getContextHints(dkey, qCount) {
  const hints = HINTS[dkey] || HINTS.diabetes;
  const start = Math.min(qCount, hints.length - 4);
  return hints.slice(start, start + 4);
}

function updateProg() {
  S.qCount++;
  el('ppQ').textContent = S.qCount;
  el('ppFill').style.width = Math.min(10 + S.qCount * 9, 95) + '%';
  updateQbtns();
}

function updateQbtns() {
  if (!S.disease || !S.active) return;
  const hints = getContextHints(S.disease.key, S.qCount);
  _qpool.length = 0;
  hints.forEach(([, q]) => _qpool.push(q));
  const finBtn = S.mode === 'control'
    ? `<button class="qbtn fin" onclick="showDiagnosisStep()">🔍 Поставить диагноз</button>`
    : `<button class="qbtn fin" onclick="finishCase()">✅ Завершить</button>`;
  el('qbtns').innerHTML = hints.map(([label], i) =>
    `<button class="qbtn" onclick="_qClick(${i})">${label}</button>`
  ).join('') + finBtn + `<button class="qbtn red" onclick="abortCase()">✕ Прервать</button>`;
}

function addMsg(txt, role) {
  const msgs = el('msgs'), tr = el('typingRow'), t = nowT();
  let html = '';
  if (role === 'user') html = `<div class="mrow user"><div class="mav u">ВЫ</div><div><div class="bbl">${esc(txt)}</div><div class="mtime">${t} <span class="tick">✓</span></div></div></div>`;
  else if (role === 'bot')  html = `<div class="mrow bot"><div class="mav b">${S.displayIcon || S.disease?.icon || '🧑'}</div><div><div class="bbl">${esc(txt)}</div><div class="mtime">${t}</div></div></div>`;
  else if (role === 'sys')  html = `<div class="mrow sys"><div class="bbl">${esc(txt)}</div></div>`;
  else if (role === 'html') html = `<div class="mrow bot" style="max-width:92%"><div class="mav b">🏥</div><div>${txt}</div></div>`;
  const d = document.createElement('div'); d.innerHTML = html;
  msgs.insertBefore(d.firstElementChild, tr); scrollB();
  if (S.currentCaseId && (role === 'user' || role === 'bot' || role === 'sys')) {
    if (!MSGS_STORE[S.currentCaseId]) MSGS_STORE[S.currentCaseId] = [];
    MSGS_STORE[S.currentCaseId].push({ role, txt, time: t, icon: S.disease?.icon });
    saveMsgs();
  }
}

async function showTyping(ms) {
  const t = el('typingRow'); t.classList.add('on'); scrollB();
  if (ms > 0) await sleep(ms);
}

function hideTyping() { el('typingRow').classList.remove('on'); }

function setQbtns(ph) {
  const b = el('qbtns');
  if (ph === 'start') {
    b.innerHTML = `
      <button class="qbtn" onclick="quickQ('Добрый день! Присаживайтесь, пожалуйста. На что жалуетесь?')">Приветствие</button>
      <button class="qbtn" onclick="quickQ('Расскажите, что именно вас беспокоит?')">Жалобы</button>
      <button class="qbtn" onclick="quickQ('Как давно появились симптомы?')">Давность</button>
      ${S.mode === 'control' ? `<button class="qbtn fin" onclick="showDiagnosisStep()">🔍 Поставить диагноз</button>` : `<button class="qbtn fin" onclick="finishCase()">✅ Завершить</button>`}
      <button class="qbtn red" onclick="abortCase()">✕ Прервать</button>`;
  } else if (ph === 'done') {
    b.innerHTML = `
      <button class="qbtn" onclick="openModal()">🎯 Новый кейс</button>
      <button class="qbtn" onclick="goPage('stats',null)">📊 Статистика</button>`;
  }
}

async function sendMsg() {
  const inp = el('msgInput');
  const txt = inp.value.trim();
  if (!txt || !S.active) return;
  if (S.diagMode) { inp.value = ''; inp.style.height = ''; await submitDiag(txt); return; }
  inp.value = ''; inp.style.height = ''; el('sendBtn').disabled = true;
  const sb = el('sendBtn');
  sb.classList.add('sending');
  sb.addEventListener('animationend', () => sb.classList.remove('sending'), { once: true });
  addMsg(txt, 'user'); updateProg();
  showTyping(0);
  let reply;
  try {
    if (S.sid && S.apiOk) {
      try {
        const raw = await apiMsg(S.sid, txt);
        reply = (typeof raw === 'string') ? raw : (raw && (raw.patient_reply || raw.reply || raw.text));
      } catch (e) {
        if (e.status === 422) {
          addMsg(e.detail || 'Вопрос не относится к медицинской консультации. Задайте профессиональный вопрос пациенту.', 'sys');
          return;
        }
        console.error('apiMsg failed:', e);
        S.apiOk = false; el('errBanner').classList.remove('hidden');
      }
    }
    if (!reply) {
      if (S.sid && S.apiOk) { S.apiOk = false; el('errBanner').classList.remove('hidden'); }
    }
  } catch (e) {
    console.error('sendMsg error:', e);
  } finally {
    hideTyping();
    el('sendBtn').disabled = false;
  }
  if (reply) { S.lastBotMsgs.push(reply); addMsg(reply, 'bot'); }
  else { addMsg('Сервис временно недоступен. Попробуйте позже.', 'sys'); }
}
