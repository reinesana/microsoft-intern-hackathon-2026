import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_STYLE, CATEGORY_ORDER, AAVE_DECORATION } from '../palette.js';

/**
 * Interpretation panel. The top section surfaces every phrase the system
 * flagged as potentially misunderstood (AAVE / dialect) — each shown as a
 * mini "transcript card" with the dialect type on top and the phrase
 * highlighted. Below it, every extracted entity grouped by category.
 */
export default function InterpretationPanel({ entities, onLocate }) {
  const all = CATEGORY_ORDER.flatMap((cat) =>
    (entities[cat] || []).map((e) => ({ ...e, category: cat })),
  );
  const flagged = all.filter((e) => e.aave);
  const total = all.length;

  return (
    <div className="flex h-full flex-col border-l border-slate-800 bg-slate-900/60">
      <div className="border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Aegis Comprehension
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          {flagged.length} flagged · {total} entities
        </p>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Flagged dialect / "doesn't understand" section — on top */}
        <div>
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Needs Interpretation
          </div>

          {flagged.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-700 px-3 py-3 text-center text-[11px] text-slate-500">
              Dialect markers appear here as the call streams in.
            </p>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {flagged.map((e) => {
                  const style = CATEGORY_STYLE[e.category];
                  return (
                    <motion.button
                      key={`flag-${e.category}-${e.phrase}`}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={() => e.lat != null && onLocate(e)}
                      className={`w-full rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-left ${
                        e.lat != null ? 'cursor-pointer hover:border-amber-400/60' : 'cursor-default'
                      }`}
                    >
                      {/* error type on top */}
                      <div className="mb-1 flex items-center gap-1.5">
                        <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                          {e.type || 'Dialect'}
                        </span>
                        <span className={`text-[9px] font-semibold uppercase tracking-wide ${style.text}`}>
                          {style.label}
                        </span>
                      </div>
                      {/* highlighted phrase */}
                      <div className={`text-[13px] font-semibold text-slate-100 ${AAVE_DECORATION} decoration-amber-400/70`}>
                        “{e.phrase}”
                      </div>
                      <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{e.meaning}</div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* All extracted entities, grouped by category */}
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
                {list.map((e) => (
                  <button
                    key={`${cat}-${e.phrase}`}
                    onClick={() => e.lat != null && onLocate(e)}
                    className={`w-full rounded-lg border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-left ${
                      e.lat != null ? 'cursor-pointer hover:border-blue-500/50' : 'cursor-default'
                    }`}
                  >
                    <div className="text-[13px] font-medium text-slate-100">
                      “{e.phrase}”
                      {e.aave && <span className="ml-1 align-top text-[8px] font-bold text-amber-300">AAVE</span>}
                      {e.lat != null && <span className="ml-1 text-[10px]">📍</span>}
                    </div>
                    <div className="text-[11px] leading-snug text-slate-400">{e.meaning}</div>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
