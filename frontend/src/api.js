// Thin client for the Aegis Dispatch FastAPI backend.
// Vite proxies /api -> http://localhost:8000 (see vite.config.js).

const BASE = '/api';

export async function getScenario() {
  const res = await fetch(`${BASE}/scenario`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function getExport() {
  const res = await fetch(`${BASE}/export`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Live OpenAI tagging for a single transcript line. Returns { text, tags }.
export async function tagText(text) {
  const res = await fetch(`${BASE}/tag`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}
