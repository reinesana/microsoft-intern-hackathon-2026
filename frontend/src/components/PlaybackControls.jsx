import React from 'react';

// Play / restart / progress / export controls for the call playback.
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
    <div className="flex items-center gap-4 border-t border-zinc-800 bg-zinc-950 px-5 py-3">
      <button
        onClick={onTogglePlay}
        className="flex h-9 w-9 items-center justify-center border border-zinc-700 bg-zinc-900 text-white transition hover:bg-zinc-800"
        title={playing ? 'Pause' : 'Play'}
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <button
        onClick={onRestart}
        className="text-xs font-medium text-zinc-400 transition hover:text-white"
        title="Restart"
      >
        ⟲ Restart
      </button>

      <div className="flex-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-zinc-400 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-[11px] tabular-nums text-zinc-500">
        {progress}/{total}
      </span>

      <button
        onClick={onExport}
        className="border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
      >
        ⤓ Export Log
      </button>
    </div>
  );
}
