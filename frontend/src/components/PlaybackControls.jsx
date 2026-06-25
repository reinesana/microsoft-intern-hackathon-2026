import React from 'react';

/**
 * Playback controls for the simulated 911 audio/transcript feed.
 */
export default function PlaybackControls({
  playing,
  onTogglePlay,
  onRestart,
  onExport,
  progress,
  total,
}) {
  const pct = total ? Math.round((progress / total) * 100) : 0;

  return (
    <div className="flex items-center gap-4 border-t border-slate-800 bg-slate-900/80 px-5 py-3">
      <button
        onClick={onTogglePlay}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-500"
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button
        onClick={onRestart}
        className="text-xs font-medium text-slate-400 hover:text-slate-200"
        title="Restart"
      >
        ⟲ Restart
      </button>

      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
          <div
            className="h-full rounded-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] tabular-nums text-slate-500">
        {progress}/{total}
      </span>

      <button
        onClick={onExport}
        className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-indigo-500 hover:text-indigo-300"
      >
        ⤓ Export Log
      </button>
    </div>
  );
}
