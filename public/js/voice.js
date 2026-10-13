let _recognition = null;
let _recActive = false;   // пользователь сейчас записывает (результаты принимаются)
let _recRunning = false;  // движок распознавания ещё не прислал onend
let _recGotSpeech = false;
let _recPrefix = '';
let _recPlaceholder = '';
let _recTimerInterval = null;
let _recSeconds = 0;
let _hold = null;         // удержание кнопки микрофона: { id, x, t, stopOnUp }

const _HOLD_MS = 350;       // дольше — режим «удерживай и говори», короче — тап с фиксацией записи
const _CANCEL_ARM_PX = 45;  // сдвиг влево, при котором подсвечивается отмена
const _CANCEL_PX = 90;      // сдвиг влево, при котором запись отменяется

const _MIC_ERRORS = {
  'not-allowed': 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.',
  'audio-capture': 'Микрофон не обнаружен.',
  'network': 'Сетевая ошибка при распознавании речи.',
  'service-not-allowed': 'Сервис распознавания речи недоступен.',
  'language-not-supported': 'Русский язык не поддерживается распознаванием в этом браузере.',
};

(function _initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const mb = document.getElementById('micBtn');
  if (!SR) {
    if (mb) mb.style.display = 'none';
    return;
  }
  _recognition = new SR();
  _recognition.lang = 'ru-RU';
  _recognition.interimResults = true;
  _recognition.continuous = false;
  _recognition.onresult = (e) => {
    if (!_recActive) return;
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('').trim();
    if (!transcript) return;
    _recGotSpeech = true;
    const inp = el('msgInput');
    inp.value = _recPrefix ? _recPrefix + ' ' + transcript : transcript;
    autoResize(inp);
  };
  _recognition.onend = () => {
    _recRunning = false;
    // Автоотправка только при штатном завершении записи (не после отмены/ошибки)
    const shouldSend = _recActive && _recGotSpeech;
    _stopRec(false);
    const inp = el('msgInput');
    if (shouldSend && inp.value.trim() && S.active && !inp.disabled) sendMsg();
  };
  _recognition.onerror = (e) => {
    if (e.error === 'aborted') { _stopRec(false); return; }
    _stopRec(false);
    if (e.error === 'no-speech') { showToast('Речь не обнаружена — попробуйте ещё раз'); return; }
    showToast(_MIC_ERRORS[e.error] || ('Ошибка микрофона: ' + e.error));
  };

  if (!mb) return;
  mb.addEventListener('pointerdown', _onMicDown);
  mb.addEventListener('pointermove', _onMicMove);
  mb.addEventListener('pointerup', _onMicUp);
  mb.addEventListener('pointercancel', () => { if (_hold && !_hold.stopOnUp) cancelVoice(); _hold = null; });
  mb.addEventListener('contextmenu', (e) => e.preventDefault());
  // Клавиатура (Enter/Space на кнопке) — обычный тап
  mb.addEventListener('click', (e) => { if (e.detail === 0) toggleVoice(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && _recActive) { e.preventDefault(); cancelVoice(); }
  });
})();

function _onMicDown(e) {
  if (e.button !== 0 || e.currentTarget.disabled) return;
  e.preventDefault();
  if (_recActive) {
    // Запись зафиксирована тапом — следующий тап её завершает
    _hold = { id: e.pointerId, stopOnUp: true };
    return;
  }
  toggleVoice();
  if (!_recActive) return;
  _hold = { id: e.pointerId, x: e.clientX, t: Date.now(), stopOnUp: false };
  try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
  el('micBtn').closest('.iwrap').classList.add('hold');
  _setRecHint('‹ Влево — отмена');
}

function _onMicMove(e) {
  if (!_hold || _hold.stopOnUp || e.pointerId !== _hold.id) return;
  const dx = Math.max(0, _hold.x - e.clientX);
  const wrap = el('micBtn').closest('.iwrap');
  const rc = el('recCancel');
  rc.style.transform = `translateX(${-Math.min(dx, _CANCEL_PX)}px)`;
  rc.style.opacity = String(1 - Math.min(dx / _CANCEL_PX, 1) * 0.5);
  wrap.classList.toggle('cancel-armed', dx >= _CANCEL_ARM_PX);
  if (dx >= _CANCEL_PX) { _hold = null; cancelVoice(); }
}

function _onMicUp(e) {
  if (!_hold || e.pointerId !== _hold.id) return;
  const h = _hold;
  _hold = null;
  if (!_recActive) return;
  if (h.stopOnUp || Date.now() - h.t >= _HOLD_MS) {
    _recognition.stop();
    return;
  }
  // Короткий тап — запись продолжается без удержания, отменить можно кнопкой или Esc
  _resetHoldUi();
  el('micBtn').closest('.iwrap').classList.remove('hold');
  _setRecHint('✕ Отмена');
}

function _setRecHint(text) {
  const h = el('recHint');
  if (h) h.textContent = text;
}

function _resetHoldUi() {
  const rc = el('recCancel');
  if (rc) { rc.style.transform = ''; rc.style.opacity = ''; }
  const mb = el('micBtn');
  const wrap = mb && mb.closest('.iwrap');
  if (wrap) wrap.classList.remove('cancel-armed');
}

function toggleVoice() {
  if (!_recognition) return;
  if (!S.active) { showToast('Начните кейс для голосового ввода'); return; }
  if (_recActive) { _recognition.stop(); return; }
  if (_recRunning) return; // предыдущая сессия распознавания ещё завершается
  const inp = el('msgInput');
  if (inp.disabled) return;
  _recPrefix = inp.value.trim();
  _recPlaceholder = inp.placeholder;
  _recGotSpeech = false;
  try {
    _recognition.start();
  } catch (e) {
    console.error('SpeechRecognition.start failed:', e);
    showToast('Не удалось запустить микрофон — попробуйте ещё раз');
    return;
  }
  _recRunning = true;
  _recActive = true;
  _recSeconds = 0;
  const mb = el('micBtn');
  mb.classList.add('recording');
  mb.closest('.iwrap').classList.add('rec');
  el('recTime').textContent = '0:00';
  _setRecHint('✕ Отмена');
  inp.placeholder = 'Говорите…';
  _recTimerInterval = setInterval(() => {
    _recSeconds++;
    const m = Math.floor(_recSeconds / 60), s = _recSeconds % 60;
    el('recTime').textContent = `${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

function cancelVoice() {
  if (!_recActive) return;
  const prefix = _recPrefix;
  _stopRec(true);
  const inp = el('msgInput');
  if (inp && !inp.disabled) { inp.value = prefix; autoResize(inp); }
  showToast('Запись отменена');
}

function _stopRec(abort) {
  if (!_recActive) return;
  _recActive = false;
  _hold = null;
  clearInterval(_recTimerInterval); _recTimerInterval = null;
  if (abort) { try { if (_recognition) _recognition.abort(); } catch {} }
  _resetHoldUi();
  const mb = el('micBtn');
  if (mb) {
    mb.classList.remove('recording');
    const wrap = mb.closest('.iwrap');
    if (wrap) wrap.classList.remove('rec', 'hold');
  }
  const inp = el('msgInput');
  if (inp && !inp.disabled && inp.placeholder.startsWith('Говорите')) inp.placeholder = _recPlaceholder || 'Задайте вопрос пациенту...';
}
