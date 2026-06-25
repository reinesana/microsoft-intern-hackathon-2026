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
    <div className="flex items-center gap-4 border-t border-zinc-200 bg-white px-5 py-3">
      <button
        onClick={onTogglePlay}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white transition hover:bg-blue-500"
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button
        onClick={onRestart}
        className="text-xs font-medium text-zinc-500 hover:text-zinc-800"
        title="Restart"
      >
        ⟲ Restart
      </button>

      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] tabular-nums text-zinc-400">
        {progress}/{total}
      </span>

      <button
        onClick={onExport}
        className="rounded-lg border border-zinc-200 bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-200 hover:text-zinc-900"
      >
        ⤓ Export Log
      </button>
    </div>
  );
}
