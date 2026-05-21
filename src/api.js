/**
 * API-клиент для simulator_for_doctors_FASTAPI
 * Подставьте ваш URL в .env: VITE_API_URL=https://your-backend.com
 */

const BASE_URL = (window.__API_URL__ || 'http://localhost:8000') + '/api/v1';

export async function startCase({ userId, diseaseType, mode = 'training' }) {
  const res = await fetch(`${BASE_URL}/cases/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      disease_type: diseaseType === 'random' ? null : diseaseType,
      mode,
    }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function sendMessage(sessionId, text) {
  const res = await fetch(`${BASE_URL}/cases/${sessionId}/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw await res.json();
  const data = await res.json();
  if (data.message_id) return _pollMessage(sessionId, data.message_id);
  return data.patient_reply;
}

async function _pollMessage(sessionId, messageId) {
  for (let i = 0; i < 150; i++) {
    await new Promise(r => setTimeout(r, 500));
    const res = await fetch(`${BASE_URL}/cases/${sessionId}/messages/${messageId}`);
    if (!res.ok) continue;
    const data = await res.json();
    if (data.status === 'done') return data.reply;
    if (data.status === 'error') throw new Error(data.error);
  }
  throw new Error('Timeout waiting for patient reply');
}

export async function finishConsultation(sessionId) {
  const res = await fetch(`${BASE_URL}/cases/${sessionId}/finish-consultation`, { method: 'POST' });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function submitDiagnosis(sessionId, diagnosis) {
  const res = await fetch(`${BASE_URL}/cases/${sessionId}/diagnosis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagnosis }),
  });
  if (!res.ok) throw await res.json();
  return res.json();
}

export async function deleteSession(sessionId) {
  await fetch(`${BASE_URL}/cases/${sessionId}`, { method: 'DELETE' });
}
