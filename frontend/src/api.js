// API client for the TrueVoice backend. Vite proxies /api -> :8000.

const BASE = '/api';

export async function getScenario(demo) {
  const qs = demo ? `?demo=${encodeURIComponent(demo)}` : '';
  const res = await fetch(`${BASE}/scenario${qs}`);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export async function getExport(demo) {
  const qs = demo ? `?demo=${encodeURIComponent(demo)}` : '';
  const res = await fetch(`${BASE}/export${qs}`);
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

// Agent-generated structured incident report from the revealed transcript.
// `lines` is an array of { speaker, text }. Returns the structured fields.
export async function getReport(lines) {
  const res = await fetch(`${BASE}/report`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lines }),
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

// Forward-geocode a free-text address to coordinates via OpenStreetMap's
// public Nominatim service. Returns { lat, lng, label } or null if not found.
export async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
    query,
  )}`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`geocode ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name,
  };
}
