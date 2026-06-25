import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CATEGORY_STYLE, AAVE_DECORATION } from '../palette.js';

/**
 * A non-destructive interpretive tag rendered over a verbatim phrase.
 * Click to reveal a popover with the meaning. Location tags additionally
 * trigger a map flyTo via `onLocate`. AAVE / dialect markers get a dotted
 * underline so they read as "flagged for interpretation".
 */
export default function Tag({ tag, onLocate }) {
  const [open, setOpen] = useState(false);
  const style = CATEGORY_STYLE[tag.category] || CATEGORY_STYLE.medical;
  const hasCoords = tag.lat != null && tag.lng != null;

  const handleClick = () => {
    setOpen((v) => !v);
    if (hasCoords) onLocate(tag);
  };

  return (
    <span className="relative inline-block">
      <button
        onClick={handleClick}
        className={`mx-0.5 rounded px-1 font-medium transition-colors ${style.pill} ${
          tag.aave ? `${AAVE_DECORATION} decoration-amber-400/70` : ''
        }`}
      >
        {tag.phrase}
        {tag.aave && <span className="ml-1 align-top text-[8px] font-bold text-amber-300/90">AAVE</span>}
        {hasCoords && <span className="ml-1 text-[10px]">📍</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-lg border border-slate-700 bg-slate-800 p-3 text-left shadow-xl"
          >
            <div className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${style.text}`}>
              <span className={`h-2 w-2 rounded-full ${style.dot}`} />
              {style.label}
            </div>
            {tag.aave && tag.type && (
              <div className="mb-1.5 inline-block rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                Dialect · {tag.type}
              </div>
            )}
            <p className="text-xs leading-snug text-slate-200">
              <span className="text-slate-400">Meaning: </span>
              {tag.meaning}
            </p>
            {hasCoords && (
              <p className="mt-1.5 text-[11px] text-blue-300">→ Map flown to location</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
