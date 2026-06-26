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

// Incident-report panel that auto-fills as the call streams; the dispatcher can
// override the priority and add notes.
export default function ReportPopup({
  open,
  onClose,
  entities,
  callerLocation,
  auto,
  aiMode,
  corrections = [],
  severity,
  underTriage,
  naivePriority,
  agentPriority,
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

  const order = { low: 0, moderate: 1, high: 2, critical: 3 };
  const np = (naivePriority || '').toLowerCase();
  const ap = (agentPriority || '').toLowerCase();
  const escalated = np && ap && order[ap] > order[np];
  const naiveLabel = RISK_LEVELS.find((l) => l.key === np)?.label || '—';
  const agentLabel = RISK_LEVELS.find((l) => l.key === ap)?.label || '—';

  // Dialect phrases the agent surfaced that a standard-English dispatcher would
  // miss: prefer the report's rich corrections, else fall back to the caught
  // AAVE flags so the improvement panel shows whenever the agent finds dialect.
  const dialectItems = corrections.length
    ? corrections
    : flags.map((f) => ({ phrase: f.phrase, misread: '', actual: f.meaning }));
  const showStats = aiMode && (dialectItems.length > 0 || escalated);

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

            {/* Under-triage caution: why this call could be wrongly down-prioritized */}
            {aiMode && underTriage && (
              <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[12px] leading-snug text-amber-900 ring-1 ring-amber-200">
                <span className="mt-0.5 text-amber-500">⚠</span>
                <span>
                  <span className="font-semibold">Under-triage risk: </span>
                  {underTriage}
                </span>
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
                {aiMode && <Field label="Severity" value={severity} />}
              </div>
            </div>

            {/* Agent improvement stats — only with interpretation on */}
            {showStats && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3">
                <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  Agent impact
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-blue-100">
                    <div className="text-[18px] font-bold leading-none text-blue-700">
                      {dialectItems.length}
                    </div>
                    <div className="mt-1 text-[10px] leading-tight text-zinc-500">
                      dialect phrases interpreted
                    </div>
                  </div>
                  <div className="rounded-lg bg-white px-2.5 py-2 ring-1 ring-blue-100">
                    <div className="flex items-center gap-1 text-[12px] font-semibold leading-none text-zinc-700">
                      <span className="text-zinc-400">{naiveLabel}</span>
                      <span className="text-blue-500">→</span>
                      <span className={escalated ? 'text-rose-600' : 'text-zinc-700'}>
                        {agentLabel}
                      </span>
                    </div>
                    <div className="mt-1 text-[10px] leading-tight text-zinc-500">
                      {escalated ? 'priority corrected up' : 'priority'}
                    </div>
                  </div>
                </div>

                {dialectItems.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {dialectItems.map((c, i) => (
                      <div key={i} className="rounded-lg bg-white px-2.5 py-1.5 ring-1 ring-blue-100">
                        <div className="text-[12px] font-semibold text-zinc-800">“{c.phrase}”</div>
                        <div className="mt-0.5 flex items-start gap-1.5 text-[11px] leading-snug">
                          <span className="whitespace-nowrap text-zinc-400 line-through">
                            {c.misread || 'missed'}
                          </span>
                          <span className="text-blue-500">→</span>
                          <span className="text-zinc-700">{c.actual}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interpreted phrases */}
            {flags.length > 0 && (
              <div>
                <div className="mb-1.5 text-[11px] font-medium text-zinc-500">Interpreted phrases</div>
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
              className="w-full bg-zinc-950 py-2 text-[12px] font-semibold text-white transition hover:bg-zinc-800"
            >
              Export Dispatch Log
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
