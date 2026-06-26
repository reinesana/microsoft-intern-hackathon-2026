import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Non-destructive interpretive tag over a verbatim phrase. Click to see the
// meaning; location tags trigger a map flyTo via `onLocate`.
export default function Tag({ tag, onLocate }) {
  const [open, setOpen] = useState(false);
  const hasCoords = tag.lat != null && tag.lng != null;

  const handleClick = () => {
    setOpen((v) => !v);
    if (hasCoords) onLocate(tag);
  };

  // Low-confidence word (agent OFF): the raw transcription is unsure here.
  if (tag.uncertain) {
    return (
      <span className="relative inline-block">
        <button
          onClick={() => setOpen((v) => !v)}
          className="mx-0.5 rounded px-0.5 italic text-zinc-400 transition-colors hover:bg-rose-50"
          style={{ textDecoration: 'underline wavy', textDecorationColor: '#fb7185' }}
          title="Unclear audio — low confidence"
        >
          {tag.phrase}
          <span className="ml-0.5 align-top text-[8px] font-bold text-rose-400">?</span>
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-2.5 text-left shadow-xl"
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-rose-500">
                Low confidence
              </div>
              <p className="text-xs leading-snug text-zinc-600">
                Audio unclear — the system isn’t sure of this word. Turn on Interpretation to
                recover it.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </span>
    );
  }

  // Agent correction (agent ON): the recovered word, with what it was misheard as.
  if (tag.correction) {
    return (
      <span className="relative inline-block">
        <button
          onClick={() => setOpen((v) => !v)}
          className="mx-0.5 rounded bg-emerald-100 px-1 font-semibold text-emerald-900 underline decoration-emerald-400 decoration-2 underline-offset-[3px] transition-colors hover:bg-emerald-200"
        >
          {tag.phrase}
        </button>
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-2.5 text-left shadow-xl"
            >
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Agent correction
              </div>
              {tag.heard && (
                <p className="text-[11px] text-zinc-500">
                  Heard as “<span className="font-medium text-rose-500 line-through">{tag.heard}</span>”
                </p>
              )}
              <p className="mt-0.5 text-xs leading-snug text-zinc-700">{tag.meaning}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </span>
    );
  }

  return (
    <span className="relative inline-block">
      <button
        onClick={handleClick}
        className="mx-0.5 rounded px-0.5 font-medium text-zinc-900 underline decoration-dotted decoration-2 underline-offset-[3px] transition-colors hover:bg-zinc-100"
        title={tag.meaning}
      >
        {tag.phrase}
        {hasCoords && <span className="ml-1 text-[10px]">📍</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-30 mb-2 w-56 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-2.5 text-left shadow-xl"
          >
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
              Meaning
            </div>
            <p className="text-xs leading-snug text-zinc-700">{tag.meaning}</p>
            {hasCoords && (
              <p className="mt-1.5 text-[11px] text-blue-600">→ Map flown to location</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}

