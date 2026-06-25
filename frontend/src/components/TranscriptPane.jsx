import React, { useEffect, useRef } from 'react';
import TranscriptLine from './TranscriptLine.jsx';

/**
 * The "Aegis Live Transcript" — an auto-scrolling feed of revealed lines.
 */
export default function TranscriptPane({ lines, onLocate }) {
  const endRef = useRef(null);

  // Keep the latest line in view as the call streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
          Aegis Live Transcript
        </h2>
        <span className="flex items-center gap-1.5 text-xs text-emerald-400">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
          Live
        </span>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {lines.length === 0 && (
          <p className="mt-10 text-center text-sm text-slate-500">
            Press play to begin the simulated 911 call.
          </p>
        )}
        {lines.map((line) => (
          <TranscriptLine key={line.id} line={line} onLocate={onLocate} />
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
}
