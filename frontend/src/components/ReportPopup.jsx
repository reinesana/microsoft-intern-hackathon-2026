import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RISK_LEVELS = [
  { key: 'low', label: 'Low', active: 'bg-emerald-500 text-white', ring: 'ring-emerald-300 text-emerald-600' },
  { key: 'moderate', label: 'Moderate', active: 'bg-amber-500 text-white', ring: 'ring-amber-300 text-amber-600' },
  { key: 'high', label: 'High', active: 'bg-orange-500 text-white', ring: 'ring-orange-300 text-orange-600' },
  { key: 'critical', label: 'Critical', active: 'bg-rose-600 text-white', ring: 'ring-rose-300 text-rose-600' },
];

function Field({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2">
      <span className="shrink-0 text-[11px] font-medium text-zinc-400">{label}</span>
      <span
        className={`text-right text-[12.5px] leading-snug ${
          value ? 'text-zinc-800' : 'text-zinc-300'
        }`}
      >
        {value || '—'}
      </span>
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
  auto,
  risk,
  onRiskChange,
  suggestedRisk,
  report,
  onReportChange,
  onExport,
}) {
  const a = auto || {};
  const location =
    a.location || callerLocation?.label || (entities.location || [])[0]?.phrase || '';
  const patient = a.patient || (entities.medical || []).map((e) => e.meaning).join('; ');
  const action = a.caller_action || (entities.intent || []).map((e) => e.meaning).join('; ');
  const hazard = a.hazards || (entities.vehicle || []).map((e) => e.meaning).join('; ');
  const flags = ['location', 'medical', 'intent', 'vehicle']
    .flatMap((c) => entities[c] || [])
    .filter((e) => e.aave);

  const caseId = React.useMemo(
    () => `CAD-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
    [],
  );
  const openedAt = React.useMemo(
    () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    [],
  );
  const suggestedLabel = RISK_LEVELS.find((l) => l.key === suggestedRisk)?.label;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.2 }}
          className="flex h-full w-full flex-col overflow-hidden bg-white"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-zinc-200 px-4 py-3">
            <div>
              <h2 className="text-[13px] font-semibold text-zinc-900">Incident Report</h2>
              <p className="mt-0.5 font-mono text-[10px] tracking-tight text-zinc-400">
                {caseId} · {openedAt}
              </p>
            </div>
            <button
              onClick={onClose}
              className="-mr-1 rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              title="Close"
            >
              ✕
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {/* Agent summary */}
            {a.summary && (
              <div className="rounded-xl bg-blue-50/70 px-3 py-2 text-[12px] leading-snug text-blue-900 ring-1 ring-blue-100">
                {a.summary}
              </div>
            )}

            {/* Priority */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-500">Priority</span>
                {suggestedRisk && suggestedRisk !== risk && (
                  <button
                    onClick={() => onRiskChange(suggestedRisk)}
                    className="text-[11px] font-medium text-blue-600 hover:text-blue-500"
                  >
                    Suggested: {suggestedLabel}
                  </button>
                )}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {RISK_LEVELS.map((lvl) => (
                  <button
                    key={lvl.key}
                    onClick={() => onRiskChange(lvl.key)}
                    className={`rounded-lg px-1 py-2 text-[11px] font-semibold ring-1 transition ${
                      risk === lvl.key ? `${lvl.active} ring-transparent` : `bg-white ${lvl.ring}`
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Auto-filled structured fields */}
            <div>
              <div className="mb-1.5 text-[11px] font-medium text-zinc-500">Details</div>
              <div className="divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                <Field label="Location" value={location} />
                <Field label="Patient" value={patient} />
                <Field label="Caller action" value={action} />
                <Field label="On scene / hazard" value={hazard} />
              </div>
            </div>

            {/* Dialect flags */}
            {flags.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-zinc-500">Dialect flags</div>
                <div className="flex flex-wrap gap-1.5">
                  {flags.map((f) => (
                    <span
                      key={f.phrase}
                      title={f.meaning}
                      className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600"
                    >
                      “{f.phrase}”
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Free-text notes */}
            <div>
              <div className="mb-1.5 text-[11px] font-medium text-zinc-500">Notes</div>
              <textarea
                value={report}
                onChange={(e) => onReportChange(e.target.value)}
                placeholder="Add dispatcher notes…"
                className="min-h-[64px] w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-[13px] leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/15"
              />
            </div>
          </div>

          <div className="border-t border-zinc-200 px-4 py-3">
            <button
              onClick={onExport}
              className="w-full rounded-lg bg-blue-600 py-2 text-[12px] font-semibold text-white transition hover:bg-blue-500"
            >
              Export Dispatch Log
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
