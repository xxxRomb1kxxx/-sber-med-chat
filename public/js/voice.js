let _recognition = null;
let _recActive = false;
let _recTimerInterval = null;
let _recSeconds = 0;

const _MIC_ERRORS = {
  'not-allowed': 'Доступ к микрофону запрещён. Разрешите доступ в настройках браузера.',
  'device-not-found': 'Микрофон не обнаружен.',
  'network': 'Сетевая ошибка при распознавании речи.',
  'service-not-allowed': 'Сервис распознавания речи недоступен.',
};

(function _initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    const mb = document.getElementById('micBtn');
    if (mb) mb.style.display = 'none';
    return;
  }
  _recognition = new SR();
  _recognition.lang = 'ru-RU';
  _recognition.interimResults = true;
  _recognition.continuous = false;
  _recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    const inp = el('msgInput');
    inp.value = transcript;
    autoResize(inp);
  };
  _recognition.onend = () => {
    const txt = el('msgInput').value.trim();
    _stopRec(false);
    if (txt && S.active && !el('msgInput').disabled) sendMsg();
  };
  _recognition.onerror = (e) => {
    if (e.error === 'no-speech') { _stopRec(false); showToast('Речь не обнаружена — попробуйте ещё раз'); return; }
    if (e.error === 'aborted') { _stopRec(false); return; }
    _stopRec(false);
    showToast(_MIC_ERRORS[e.error] || ('Ошибка микрофона: ' + e.error));
  };
})();

function toggleVoice() {
  if (!_recognition) return;
  if (!S.active) { showToast('Начните кейс для голосового ввода'); return; }
  if (_recActive) { _recognition.stop(); return; }
  _recActive = true;
  _recSeconds = 0;
  el('micBtn').classList.add('recording');
  const inp = el('msgInput');
  const prevText = inp.value;
  inp.value = '';
  inp.placeholder = 'Говорите… 0:00';
  autoResize(inp);
  _recTimerInterval = setInterval(() => {
    _recSeconds++;
    const m = Math.floor(_recSeconds / 60), s = _recSeconds % 60;
    const inp2 = el('msgInput');
    if (inp2 && !inp2.disabled) inp2.placeholder = `Говорите… ${m}:${String(s).padStart(2, '0')}`;
  }, 1000);
  try { _recognition.start(); } catch { inp.value = prevText; _stopRec(false); }
}

function _stopRec(abort) {
  if (!_recActive) return;
  _recActive = false;
  clearInterval(_recTimerInterval); _recTimerInterval = null;
  if (abort) { try { if (_recognition) _recognition.abort(); } catch {} }
  const mb = el('micBtn');
  if (mb) mb.classList.remove('recording');
  const inp = el('msgInput');
  if (inp && !inp.disabled) inp.placeholder = 'Задайте вопрос пациенту...';
}
