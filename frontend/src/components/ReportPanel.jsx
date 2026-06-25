import React from 'react';

const RISK_LEVELS = [
  { key: 'low', label: 'Low', active: 'bg-emerald-500 text-white', ring: 'ring-emerald-400/40 text-emerald-300' },
  { key: 'moderate', label: 'Moderate', active: 'bg-amber-500 text-slate-900', ring: 'ring-amber-400/40 text-amber-300' },
  { key: 'high', label: 'High', active: 'bg-orange-500 text-white', ring: 'ring-orange-400/40 text-orange-300' },
  { key: 'critical', label: 'Critical', active: 'bg-rose-600 text-white', ring: 'ring-rose-400/40 text-rose-300' },
];

/**
 * Dispatcher incident report: free-text notes on what's happening plus a
 * risk-category label. `suggestedRisk` is derived from the call and can be
 * applied with one click.
 */
export default function ReportPanel({ report, onReportChange, risk, onRiskChange, suggestedRisk, onAutoFill }) {
  return (
    <div className="flex h-full flex-col border-l border-t border-slate-800 bg-slate-900/60">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Incident Report
        </h2>
        <button
          onClick={onAutoFill}
          className="rounded-md bg-slate-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300 hover:bg-slate-700"
        >
          Auto-fill
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-3">
        {/* Risk category */}
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-slate-400">
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
                  risk === lvl.key ? lvl.active + ' ring-transparent' : `bg-slate-800/60 ${lvl.ring}`
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report notes */}
        <div className="flex flex-1 flex-col">
          <label className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            What's going on
          </label>
          <textarea
            value={report}
            onChange={(e) => onReportChange(e.target.value)}
            placeholder="Summarize the incident, patient state, hazards, and actions taken…"
            className="min-h-[120px] flex-1 resize-none rounded-lg border border-slate-700 bg-slate-950/60 px-3 py-2 text-[13px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
