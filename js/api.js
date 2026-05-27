const BASE = () => '/api/v1';

async function apiStart(dkey, mode) {
  const r = await fetch(`${BASE()}/cases/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: uid, disease_type: dkey === 'random' ? null : dkey, mode }),
  });
  if (!r.ok) {
    const body = await r.text();
    const err = new Error(body);
    err.status = r.status;
    try { const p = JSON.parse(body); err.detail = typeof p.detail === 'string' ? p.detail : null; } catch {}
    throw err;
  }
  return r.json();
}

async function apiMsg(sid, text) {
  const r = await fetch(`${BASE()}/cases/${sid}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!r.ok) {
    const body = await r.text();
    const err = new Error(body);
    err.status = r.status;
    try { const p = JSON.parse(body); err.detail = typeof p.detail === 'string' ? p.detail : null; } catch {}
    throw err;
  }
  const d = await r.json();
  if (d.message_id) return poll(sid, d.message_id);
  return d.patient_reply || d.reply || d.text;
}

async function poll(sid, mid) {
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    try {
      const r = await fetch(`${BASE()}/cases/${sid}/messages/${mid}`);
      if (!r.ok) continue;
      const d = await r.json();
      if (d.status === 'done') return d.reply;
      if (d.status === 'error') throw new Error(d.error);
    } catch {}
  }
  throw new Error('Timeout');
}

async function apiFinish(sid) {
  const r = await fetch(`${BASE()}/cases/${sid}/finish-consultation`, { method: 'POST' });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

async function apiDiagnosis(sid, diagnosis) {
  const r = await fetch(`${BASE()}/cases/${sid}/diagnosis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosis }),
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

function _diagMatch(userText, actualName) {
  const u = userText.toLowerCase().trim();
  const a = actualName.toLowerCase().trim();
  if (u === a) return true;
  const aWords = a.split(/\s+/).filter(w => w.length > 3);
  if (aWords.some(w => u.includes(w))) return true;
  const uWords = u.split(/\s+/).filter(w => w.length > 3);
  if (uWords.some(w => a.includes(w))) return true;
  return false;
}

async function apiDel(sid) {
  try {
    await fetch(`${BASE()}/cases/${sid}`, { method: 'DELETE' });
    if (localStorage.getItem('smii_sid') === sid) localStorage.removeItem('smii_sid');
  } catch {}
}
