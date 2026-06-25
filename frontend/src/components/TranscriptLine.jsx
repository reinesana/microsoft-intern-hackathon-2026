import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Tag from './Tag.jsx';

// Split a verbatim line into plain-text and tagged segments using the tag
// character offsets. The original text is never altered.
function segmentize(text, tags) {
  const segments = [];
  let cursor = 0;
  for (const tag of tags) {
    if (tag.start > cursor) {
      segments.push({ text: text.slice(cursor, tag.start) });
    }
    segments.push({ text: text.slice(tag.start, tag.end), tag });
    cursor = tag.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

const TYPE_MS = 38; // per-character typing speed

/**
 * One line of the live transcript. The text types out first (plain), then the
 * interpretive highlights appear once the line finishes — so the screen isn't
 * flooded with highlights while it's still being "spoken".
 */
export default function TranscriptLine({ line, onLocate }) {
  const isCaller = line.speaker === 'Caller';
  const full = line.text;
  const [typed, setTyped] = useState(0);
  const done = typed >= full.length;

  const stamp = (() => {
    const t = line.t || 0;
    const m = String(Math.floor(t / 60)).padStart(2, '0');
    const s = String(t % 60).padStart(2, '0');
    return `${m}:${s}`;
  })();

  useEffect(() => {
    setTyped(0);
    const id = setInterval(() => {
      setTyped((n) => {
        if (n >= full.length) {
          clearInterval(id);
          return n;
        }
        return n + 1;
      });
    }, TYPE_MS);
    return () => clearInterval(id);
  }, [full]);

  const segments = segmentize(full, line.tags || []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isCaller ? 'justify-start' : 'justify-end'}`}
    >
      <div
        className={`max-w-[88%] rounded-2xl px-4 py-2.5 ${
          isCaller
            ? 'rounded-tl-sm bg-slate-800/80 ring-1 ring-slate-700'
            : 'rounded-tr-sm bg-indigo-950/60 ring-1 ring-indigo-800/60'
        }`}
      >
        <div
          className={`mb-0.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider ${
            isCaller ? 'text-rose-300' : 'text-indigo-300'
          }`}
        >
          <span>{line.speaker}</span>
          <span className="font-mono text-[9px] font-normal text-slate-500">{stamp}</span>
        </div>
        <div className="text-[15px] leading-relaxed text-slate-100">
          {done ? (
            segments.map((seg, i) =>
              seg.tag ? (
                <Tag key={i} tag={seg.tag} onLocate={onLocate} />
              ) : (
                <span key={i}>{seg.text}</span>
              )
            )
          ) : (
            <span>
              {full.slice(0, typed)}
              <span className="ml-0.5 inline-block w-1.5 animate-pulse text-slate-400">▋</span>
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
