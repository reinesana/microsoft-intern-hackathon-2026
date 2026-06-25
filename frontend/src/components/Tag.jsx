import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

/**
 * A non-destructive interpretive tag rendered over a verbatim phrase.
 * Monochrome by design — flagged phrases get a subtle dotted underline so the
 * verbatim text stays the focus. Click to reveal a popover with the meaning.
 * Location tags additionally trigger a map flyTo via `onLocate`.
 */
export default function Tag({ tag, onLocate }) {
  const [open, setOpen] = useState(false);
  const hasCoords = tag.lat != null && tag.lng != null;

  const handleClick = () => {
    setOpen((v) => !v);
    if (hasCoords) onLocate(tag);
  };

  return (
    <span className="relative inline-block">
      <button
        onClick={handleClick}
        className="mx-0.5 rounded px-0.5 font-medium text-zinc-900 underline decoration-dotted decoration-2 underline-offset-[3px] transition-colors hover:bg-zinc-100"
      >
        {tag.phrase}
        {tag.aave && (
          <span className="ml-1 align-top text-[8px] font-bold uppercase text-zinc-500">AAVE</span>
        )}
        {hasCoords && <span className="ml-1 text-[10px]">📍</span>}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-1/2 z-30 mb-2 w-60 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 text-left shadow-xl"
          >
            {tag.aave && tag.type && (
              <div className="mb-1.5 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                Dialect · {tag.type}
              </div>
            )}
            <p className="text-xs leading-snug text-zinc-700">
              <span className="text-zinc-400">Meaning: </span>
              {tag.meaning}
            </p>
            {hasCoords && (
              <p className="mt-1.5 text-[11px] text-blue-600">→ Map flown to location</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
}
