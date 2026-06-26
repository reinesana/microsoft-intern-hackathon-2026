import React, { useEffect, useRef } from 'react';
import TranscriptLine from './TranscriptLine.jsx';

// Auto-scrolling feed of the revealed transcript lines.
export default function TranscriptPane({ lines, onLocate }) {
  const endRef = useRef(null);

  // Keep the latest line in view as the call streams in.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [lines.length]);

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-3">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Live Transcript
        </h2>
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Live
        </span>
      </div>

      <div className="flex-1 space-y-3.5 overflow-y-auto px-5 py-4">
        {lines.length === 0 && (
          <p className="mt-10 text-center text-sm text-zinc-400">
            Press play to begin the 911 call.
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
