import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getScenario, getExport, tagText } from './api.js';
import MapPane from './components/MapPane.jsx';
import TranscriptPane from './components/TranscriptPane.jsx';
import ReportPopup from './components/ReportPopup.jsx';
import PlaybackControls from './components/PlaybackControls.jsx';
import { CATEGORY_ORDER } from './palette.js';

const STEP_MS = 4200; // pace at which lines stream in

export default function App() {
  const [scenario, setScenario] = useState(null);
  const [revealed, setRevealed] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [callerLocation, setCallerLocation] = useState(null);
  const [error, setError] = useState(null);
  const [aiMode, setAiMode] = useState(false);
  const [aiTags, setAiTags] = useState({}); // line id -> tags from OpenAI
  const [report, setReport] = useState('');
  const [risk, setRisk] = useState('');
  const [reportOpen, setReportOpen] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    getScenario().then(setScenario).catch((e) => setError(e.message));
  }, []);

  const lines = scenario?.lines || [];
  const revealedLines = useMemo(() => {
    const slice = lines.slice(0, revealed);
    if (!aiMode) return slice;
    return slice.map((line) => (aiTags[line.id] ? { ...line, tags: aiTags[line.id] } : line));
  }, [lines, revealed, aiMode, aiTags]);

  // Streaming playback loop.
  useEffect(() => {
    if (!playing) return undefined;
    timer.current = setInterval(() => {
      setRevealed((n) => {
        if (n >= lines.length) {
          setPlaying(false);
          return n;
        }
        return n + 1;
      });
    }, STEP_MS);
    return () => clearInterval(timer.current);
  }, [playing, lines.length]);

  // Live AI tagging: when enabled, re-tag any revealed line not yet tagged by OpenAI.
  useEffect(() => {
    if (!aiMode) return;
    for (const line of lines.slice(0, revealed)) {
      if (aiTags[line.id]) continue;
      tagText(line.text)
        .then((res) => setAiTags((prev) => ({ ...prev, [line.id]: res.tags })))
        .catch(() => {});
    }
  }, [aiMode, revealed, lines, aiTags]);

  // Live map syncing: auto-fly when a newly revealed line carries a location.
  useEffect(() => {
    const last = revealedLines[revealedLines.length - 1];
    if (!last) return;
    const loc = (last.tags || []).find((t) => t.lat != null);
    if (loc) {
      setFlyTarget({ lat: loc.lat, lng: loc.lng });
      setCallerLocation({ lat: loc.lat, lng: loc.lng, label: loc.label || last.text });
    }
  }, [revealedLines]);

  // Entities surfaced so far, grouped by category and de-duplicated.
  const entities = useMemo(() => {
    const grouped = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, []]));
    const seen = new Set();
    for (const line of revealedLines) {
      for (const tag of line.tags || []) {
        const key = `${tag.category}|${tag.phrase.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        grouped[tag.category].push({
          phrase: tag.phrase,
          meaning: tag.meaning,
          aave: tag.aave,
          type: tag.type,
          lat: tag.lat,
          lng: tag.lng,
          label: tag.label,
        });
      }
    }
    return grouped;
  }, [revealedLines]);

  const handleLocate = (item) => {
    if (item.lat == null) return;
    setFlyTarget({ lat: item.lat, lng: item.lng });
    setCallerLocation({ lat: item.lat, lng: item.lng, label: item.label || item.phrase });
  };

  // Suggest a risk level from what the call has surfaced so far.
  const suggestedRisk = useMemo(() => {
    const med = entities.medical || [];
    if (med.length === 0) return '';
    const text = med.map((e) => `${e.phrase} ${e.meaning}`.toLowerCase()).join(' ');
    if (/uncon|cpr|breath|syncope|collapse|fainted|out\b/.test(text)) return 'critical';
    return 'high';
  }, [entities]);

  // Auto-fill the risk level as the call unfolds, until the dispatcher overrides it.
  const riskTouched = useRef(false);
  useEffect(() => {
    if (!riskTouched.current && suggestedRisk) setRisk(suggestedRisk);
  }, [suggestedRisk]);

  const setRiskManual = (value) => {
    riskTouched.current = true;
    setRisk(value);
  };

  const togglePlay = () => {
    if (revealed >= lines.length) setRevealed(0);
    setPlaying((p) => !p);
  };

  const restart = () => {
    setPlaying(false);
    setRevealed(0);
    setFlyTarget(null);
    setCallerLocation(null);
    riskTouched.current = false;
    setRisk('');
  };

  const exportLog = async () => {
    const data = await getExport();
    const enriched = { ...data, dispatcher_report: report, risk_category: risk || 'unassigned' };
    const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'aegis-dispatch-log.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-rose-300">
        Backend unreachable: {error}
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-400">
        Connecting to Aegis Dispatch…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-950 text-slate-100">
      {/* Top command bar */}
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold">
            ◆
          </span>
          <div>
            <h1 className="text-sm font-bold tracking-wide">AEGIS DISPATCH</h1>
            <p className="text-[11px] text-slate-400">911 Command View · {scenario.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <button
            onClick={() => setReportOpen((v) => !v)}
            className={`rounded-md px-2.5 py-1 font-semibold tracking-wide transition ${
              reportOpen
                ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                : 'bg-indigo-600 text-white shadow-[0_0_8px] shadow-indigo-500/50'
            }`}
          >
            {reportOpen ? 'HIDE REPORT' : 'SHOW REPORT'}
          </button>
          <button
            onClick={() => setAiMode((v) => !v)}
            className={`rounded-md px-2.5 py-1 font-semibold tracking-wide transition ${
              aiMode
                ? 'bg-indigo-600 text-white shadow-[0_0_8px] shadow-indigo-500/50'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {aiMode ? 'LIVE AI · ON' : 'LIVE AI · OFF'}
          </button>
          <span className="h-2 w-2 rounded-full bg-rose-500 shadow-[0_0_8px] shadow-rose-500" />
          ACTIVE CALL
        </div>
      </header>

      {/* Split panes: map + large live transcript, with a floating report popup */}
      <div className="relative grid flex-1 grid-cols-12 overflow-hidden">
        <div className="col-span-5 border-r border-slate-800">
          <MapPane
            center={scenario.center}
            emsUnits={scenario.ems_units}
            callerLocation={callerLocation}
            flyTarget={flyTarget}
          />
        </div>

        <div className="col-span-7 flex flex-col">
          <div className="flex-1 overflow-hidden">
            <TranscriptPane lines={revealedLines} onLocate={handleLocate} />
          </div>
          <PlaybackControls
            playing={playing}
            onTogglePlay={togglePlay}
            onRestart={restart}
            onExport={exportLog}
            progress={revealed}
            total={lines.length}
          />
        </div>

        <ReportPopup
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          entities={entities}
          callerLocation={callerLocation}
          risk={risk}
          onRiskChange={setRiskManual}
          suggestedRisk={suggestedRisk}
          report={report}
          onReportChange={setReport}
          onExport={exportLog}
        />
      </div>
    </div>
  );
}
