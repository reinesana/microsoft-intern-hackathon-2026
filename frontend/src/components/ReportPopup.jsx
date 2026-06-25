import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RISK_LEVELS = [
  { key: 'low', label: 'Low', active: 'bg-emerald-500 text-white', ring: 'ring-emerald-400/40 text-emerald-300' },
  { key: 'moderate', label: 'Moderate', active: 'bg-amber-500 text-slate-900', ring: 'ring-amber-400/40 text-amber-300' },
  { key: 'high', label: 'High', active: 'bg-orange-500 text-white', ring: 'ring-orange-400/40 text-orange-300' },
  { key: 'critical', label: 'Critical', active: 'bg-rose-600 text-white', ring: 'ring-rose-400/40 text-rose-300' },
];

function Field({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`text-[13px] leading-snug ${value ? 'text-slate-100' : 'text-slate-600'}`}>
        {value || '—'}
      </div>
    </div>
  );
}

/**
 * Floating incident-report card that auto-fills as the call streams in.
 * Structured fields are derived live from the surfaced entities; the
 * dispatcher can override risk and add free-text notes.
 */
export default function ReportPopup({
  open,
  onClose,
  entities,
  callerLocation,
  risk,
  onRiskChange,
  suggestedRisk,
  report,
  onReportChange,
  onExport,
}) {
  const location = callerLocation?.label || (entities.location || [])[0]?.phrase || '';
  const patient = (entities.medical || []).map((e) => e.meaning).join('; ');
  const action = (entities.intent || []).map((e) => e.meaning).join('; ');
  const hazard = (entities.vehicle || []).map((e) => e.meaning).join('; ');
  const flags = ['location', 'medical', 'intent', 'vehicle']
    .flatMap((c) => entities[c] || [])
    .filter((e) => e.aave);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.96 }}
          transition={{ duration: 0.2 }}
          className="absolute bottom-4 right-4 z-40 flex max-h-[88%] w-80 flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 shadow-2xl backdrop-blur"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 animate-pulse rounded-full bg-indigo-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                Incident Report
              </h2>
            </div>
            <button
              onClick={onClose}
              className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-200"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {/* Risk category */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <span>Risk Category</span>
                {suggestedRisk && suggestedRisk !== risk && (
                  <button
                    onClick={() => onRiskChange(suggestedRisk)}
                    className="text-[10px] font-medium text-indigo-300 hover:text-indigo-200"
                  >
                    Suggest: {suggestedRisk}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {RISK_LEVELS.map((lvl) => (
                  <button
                    key={lvl.key}
                    onClick={() => onRiskChange(lvl.key)}
                    className={`rounded-md px-1 py-1.5 text-[11px] font-semibold ring-1 transition ${
                      risk === lvl.key ? `${lvl.active} ring-transparent` : `bg-slate-800/60 ${lvl.ring}`
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-filled structured fields */}
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-800 bg-slate-950/40 p-3">
              <Field label="Location" value={location} />
              <Field label="Patient" value={patient} />
              <Field label="Caller action" value={action} />
              <Field label="On scene / hazard" value={hazard} />
            </div>

            {/* Dialect flags */}
            {flags.length > 0 && (
              <div>
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
                  Dialect flags
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {flags.map((f) => (
                    <span
                      key={f.phrase}
                      title={f.meaning}
                      className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-200"
                    >
                      “{f.phrase}” · {f.type || 'dialect'}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Free-text notes */}
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Notes
              </div>
              <textarea
                value={report}
                onChange={(e) => onReportChange(e.target.value)}
                placeholder="Add dispatcher notes…"
                className="min-h-[64px] w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="border-t border-slate-800 px-4 py-2.5">
            <button
              onClick={onExport}
              className="w-full rounded-md bg-indigo-600 py-1.5 text-[12px] font-semibold text-white transition hover:bg-indigo-500"
            >
              ⤓ Export Dispatch Log
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
