const HAS_BACKEND = window.__API_URL__ === 'proxy';

const S = {
  sid: null, active: false, disease: null, mode: null,
  qCount: 0, t0: null, tmr: null, apiOk: true,
  patientName: null, lastBotMsgs: [],
  currentCaseId: null, selectedCaseId: null,
  displayIcon: null, diagMode: false,
};

const CASES = (() => {
  try { return JSON.parse(localStorage.getItem('smii_cases') || '[]'); } catch { return []; }
})();

const saveC = () => {
  try { localStorage.setItem('smii_cases', JSON.stringify(CASES)); }
  catch { showToast('⚠️ Данные не сохранены: память браузера заполнена'); }
};

const MSGS_STORE = (() => {
  try { return JSON.parse(localStorage.getItem('smii_msgs') || '{}'); } catch { return {}; }
})();

const saveMsgs = () => {
  try { localStorage.setItem('smii_msgs', JSON.stringify(MSGS_STORE)); }
  catch { showToast('⚠️ История не сохранена: память браузера заполнена'); }
};

let uid = localStorage.getItem('smii_uid') || ('u' + Math.random().toString(36).slice(2, 8));
localStorage.setItem('smii_uid', uid);

let mockIdx = 0;

function mockReply(txt) {
  const t = txt.toLowerCase();
  if (t.includes('сахар') || t.includes('глюкоз') || t.includes('кровь')) return MOCK.sugar[0];
  if (t.includes('вес') || t.includes('рост') || t.includes('масс')) return MOCK.weight[0];
  if (t.includes('давлен')) return MOCK.pressure[0];
  if (t.includes('аллерг')) return MOCK.allergy[0];
  if (t.includes('препарат') || t.includes('лекарств') || t.includes('таблет')) return MOCK.meds[0];
  return MOCK._[mockIdx++ % MOCK._.length];
}
