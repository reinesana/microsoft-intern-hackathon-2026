// Lightweight, transcript-based estimate of the caller's emotional state.
// This stands in for the Hume API for now — when a real HUME_API_KEY is wired
// up, replace `analyzeSentiment` with a call to a `/api/sentiment` endpoint and
// keep the same return shape so the navbar indicator doesn't have to change.

const PANIC =
  /\b(help|please|hurry|oh my god|oh god|dying|die|can'?t breathe|not breathing|ain'?t breathin'?|bleeding|blood|gun|shot|stabbed|unconscious|won'?t (?:wake|come to)|passed out|fell out|overdose|fire|burning|drowning|hurry up)\b/gi;
const STRESS =
  /\b(scared|afraid|hurt|pain|sick|emergency|quick|fast|right now|come (?:quick|now)|won'?t|isn'?t|can'?t|nobody|alone)\b/gi;

const LEVELS = [
  { max: 18, label: 'Calm', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  { max: 42, label: 'Elevated', dot: 'bg-amber-400', text: 'text-amber-300' },
  { max: 68, label: 'Distressed', dot: 'bg-orange-400', text: 'text-orange-300' },
  { max: 101, label: 'Panicked', dot: 'bg-rose-400', text: 'text-rose-300' },
];

/**
 * Estimate caller sentiment from the revealed caller lines.
 * Returns { label, score, dot, text } — dot/text are Tailwind classes.
 */
export function analyzeSentiment(callerLines) {
  const text = (callerLines || []).map((l) => l.text || '').join(' ');
  if (!text.trim()) {
    return { label: 'Awaiting caller', score: 0, dot: 'bg-zinc-500', text: 'text-zinc-400' };
  }

  const words = Math.max(text.split(/\s+/).length, 1);
  const panic = (text.match(PANIC) || []).length;
  const stress = (text.match(STRESS) || []).length;
  const exclaim = (text.match(/!/g) || []).length;

  // Weight the markers and normalise per ~30 words so a long, mostly-calm call
  // isn't inflated just by length.
  const raw = (panic * 3 + stress * 1.4 + exclaim) / (words / 30);
  const score = Math.min(100, Math.round(raw * 20));

  const level = LEVELS.find((l) => score < l.max) || LEVELS[LEVELS.length - 1];
  return { label: level.label, score, dot: level.dot, text: level.text };
}
