import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getScenario, getExport, tagText, getReport } from './api.js';
import MapPane from './components/MapPane.jsx';
import TranscriptPane from './components/TranscriptPane.jsx';
import ReportPopup from './components/ReportPopup.jsx';
import PlaybackControls from './components/PlaybackControls.jsx';
import { CATEGORY_ORDER } from './palette.js';

// Seconds of audio to skip before the call content begins (e.g. an automated
// redaction disclaimer). The current clip starts at the conversation, so 0.
const AUDIO_OFFSET = 0;

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
  const [autoReport, setAutoReport] = useState(null); // agent-extracted incident report
  const audioRef = useRef(null);
  const playClock = useRef(0); // seconds elapsed in the current playback

  useEffect(() => {
    getScenario().then(setScenario).catch((e) => setError(e.message));
  }, []);

  const lines = scenario?.lines || [];
  const revealedLines = useMemo(() => {
    const slice = lines.slice(0, revealed);
    if (!aiMode) return slice;
    return slice.map((line) => (aiTags[line.id] ? { ...line, tags: aiTags[line.id] } : line));
  }, [lines, revealed, aiMode, aiTags]);

  // Live playback: a steady timer reveals each line at its real timestamp, and
  // the 911 audio is played best-effort alongside it. The clock follows the
  // audio position when the audio actually plays, but keeps advancing on its own
  // if the browser blocks/stalls playback — so the transcript always runs.
  // We use setInterval (not requestAnimationFrame) so the reveal keeps firing
  // even when this tab is in the background; rAF is paused for hidden tabs,
  // which would freeze the transcript while the audio kept going.
  useEffect(() => {
    if (!playing) return undefined;
    const audio = audioRef.current;
    if (audio) {
      if (audio.currentTime < AUDIO_OFFSET) audio.currentTime = AUDIO_OFFSET; // skip intro
      audio.play().catch(() => {});
    }
    let last = performance.now();
    const interval = setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000;
      last = now;
      if (audio && !audio.paused && audio.currentTime > AUDIO_OFFSET) {
        playClock.current = audio.currentTime - AUDIO_OFFSET; // trust real audio when it plays
      } else {
        playClock.current += dt; // otherwise advance on our own
      }
      const t = playClock.current;
      const count = lines.filter((l) => l.t <= t).length;
      setRevealed(count);
      if (count >= lines.length) {
        setPlaying(false);
      }
    }, 200);
    return () => {
      clearInterval(interval);
      if (audio) audio.pause();
    };
  }, [playing, lines]);

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

  // Live incident report: the agent re-reads the revealed transcript and fills
  // out the structured report fields. Refreshed every few new lines (and once
  // more at the end of the call) so it visibly fills in as the call streams.
  const reportInFlight = useRef(false);
  const lastReportAt = useRef(0);
  useEffect(() => {
    if (revealed === 0) {
      setAutoReport(null);
      lastReportAt.current = 0;
      return;
    }
    const done = revealed >= lines.length;
    if (reportInFlight.current) return;
    if (!done && revealed - lastReportAt.current < 3) return;
    reportInFlight.current = true;
    lastReportAt.current = revealed;
    const payload = lines.slice(0, revealed).map((l) => ({ speaker: l.speaker, text: l.text }));
    getReport(payload)
      .then(setAutoReport)
      .catch(() => {})
      .finally(() => {
        reportInFlight.current = false;
      });
  }, [revealed, lines]);

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

  // Suggest a risk level: prefer the agent's priority, else infer from medical entities.
  const suggestedRisk = useMemo(() => {
    const fromAgent = autoReport?.priority?.toLowerCase();
    if (['low', 'moderate', 'high', 'critical'].includes(fromAgent)) return fromAgent;
    const med = entities.medical || [];
    if (med.length === 0) return '';
    const text = med.map((e) => `${e.phrase} ${e.meaning}`.toLowerCase()).join(' ');
    if (/uncon|cpr|breath|syncope|collapse|fainted|out\b/.test(text)) return 'critical';
    return 'high';
  }, [entities, autoReport]);

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
    const audio = audioRef.current;
    if (revealed >= lines.length) {
      playClock.current = 0;
      setRevealed(0);
      if (audio) audio.currentTime = AUDIO_OFFSET;
    }
    setPlaying((p) => !p);
  };

  const restart = () => {
    setPlaying(false);
    setRevealed(0);
    playClock.current = 0;
    setFlyTarget(null);
    setCallerLocation(null);
    riskTouched.current = false;
    setRisk('');
    if (audioRef.current) audioRef.current.currentTime = AUDIO_OFFSET;
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
      <div className="flex h-screen items-center justify-center bg-[#f6f7f9] text-rose-600">
        Backend unreachable: {error}
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f6f7f9] text-zinc-400">
        Connecting to Aegis Dispatch…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f6f7f9] text-zinc-900">
      <audio ref={audioRef} src="/api/audio" preload="auto" />
      {/* Top command bar */}
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="h-5 w-5"
            >
              <path d="M4 12h2M9 7v10M14 4v16M19 9v6" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-semibold tracking-tight text-zinc-900">Decode</h1>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
                911
              </span>
            </div>
            <p className="text-[11px] text-zinc-500">{scenario.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setReportOpen((v) => !v)}
            className="rounded-lg border border-zinc-200 bg-white px-3.5 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            {reportOpen ? 'Hide report' : 'Show report'}
          </button>
          <button
            onClick={() => setAiMode((v) => !v)}
            className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-50"
          >
            <span
              className={`relative h-4 w-7 rounded-full transition-colors ${
                aiMode ? 'bg-blue-600' : 'bg-zinc-300'
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow-sm transition-all ${
                  aiMode ? 'left-[14px]' : 'left-0.5'
                }`}
              />
            </span>
            Interpretation
          </button>
          <div className="ml-1 flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-[12px] font-medium text-rose-600">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
            Live call
          </div>
        </div>
      </header>

      {/* Split panes: map + large live transcript + docked report column */}
      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        <div className="col-span-4 border-r border-zinc-200">
          <MapPane
            center={scenario.center}
            emsUnits={scenario.ems_units}
            callerLocation={callerLocation}
            flyTarget={flyTarget}
          />
        </div>

        <div className={`${reportOpen ? 'col-span-5' : 'col-span-8'} flex min-w-0 flex-col`}>
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

        {reportOpen && (
          <div className="col-span-3 min-w-0 border-l border-zinc-200">
            <ReportPopup
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              entities={entities}
              callerLocation={callerLocation}
              auto={autoReport}
              risk={risk}
              onRiskChange={setRiskManual}
              suggestedRisk={suggestedRisk}
              report={report}
              onReportChange={setReport}
              onExport={exportLog}
            />
          </div>
        )}
      </div>
    </div>
  );
}
