import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_STYLE, CATEGORY_ORDER } from '../palette.js';

/**
 * "Extracted Entities" panel: a running summary of every translated term,
 * symptom, and location the middleware has surfaced so far.
 */
export default function EntitiesSidebar({ entities, onLocate }) {
  const total = Object.values(entities).reduce((n, list) => n + list.length, 0);

  return (
    <div className="flex h-full flex-col border-l border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Extracted Entities
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{total} surfaced</p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {CATEGORY_ORDER.map((cat) => {
          const list = entities[cat] || [];
          if (list.length === 0) return null;
          const style = CATEGORY_STYLE[cat];
          return (
            <div key={cat}>
              <div className={`mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${style.text}`}>
                <span className={`h-2 w-2 rounded-full ${style.dot}`} />
                {style.label}
              </div>
              <div className="space-y-1.5">
                <AnimatePresence>
                  {list.map((e) => (
                    <motion.button
                      key={`${cat}-${e.phrase}`}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => e.lat != null && onLocate(e)}
                      className={`w-full rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-left ${
                        e.lat != null ? 'cursor-pointer hover:border-blue-500/50' : 'cursor-default'
                      }`}
                    >
                      <div className="text-[13px] font-medium text-slate-100">
                        “{e.phrase}”{e.lat != null && <span className="ml-1 text-[10px]">📍</span>}
                      </div>
                      <div className="text-[11px] leading-snug text-slate-400">{e.meaning}</div>
                    </motion.button>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          );
        })}

        {total === 0 && (
          <p className="mt-8 text-center text-xs text-slate-500">
            Entities appear here as the call streams in.
          </p>
        )}
      </div>
    </div>
  );
}
