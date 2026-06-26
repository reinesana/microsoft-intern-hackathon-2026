import React, { useEffect, useMemo, useRef, useState } from 'react';
import { getScenario, getExport, tagText, getReport, geocode } from './api.js';
import MapPane from './components/MapPane.jsx';
import TranscriptPane from './components/TranscriptPane.jsx';
import ReportPopup from './components/ReportPopup.jsx';
import PlaybackControls from './components/PlaybackControls.jsx';
import { CATEGORY_ORDER } from './palette.js';
import { analyzeSentiment } from './sentiment.js';

// Seconds of audio to skip before the call begins.
const AUDIO_OFFSET = 0;

// Hold each transcript line back so it lags slightly behind the audio.
const TRANSCRIPT_DELAY = 1.5;

const DEMO_LABELS = { kenneth: 'Kenneth Walker', wav2: '3 year old' };
const DEMO_SUBTITLES = { kenneth: 'Shooting reported', wav2: 'Possible coercion' };
// City bias for geocoding the spoken address.
const DEMO_CITY = { kenneth: 'Louisville, KY', wav2: 'Atlanta, GA' };

// Scripted mishearing demo: how a naive transcription stumbles on the caller's
// distressed / AAVE speech. `find` anchors in the real transcript; `off` shows
// with the agent off (low-confidence), `on` shows the corrected reading.
const MISHEARINGS = {
  kenneth: [
    {
      find: 'Bring it',
      off: 'Bring it',
      on: 'Bre',
      note: "He's calling the victim's name — “Bre” (Breonna). His distressed speech was misheard as “bring it”.",
    },
    {
      find: 'Hell',
      off: 'Hell',
      on: 'Help',
      note: 'A cry for “help” — clipped, accented delivery misheard as “hell”.',
    },
    {
      find: 'going to go',
      off: 'going to go',
      on: 'finna go',
      note: 'AAVE “finna” = “fixing to / about to” — misheard as “going to”.',
    },
    {
      find: "She's on the ground",
      off: "She's on the ground",
      on: 'She on the ground',
      note: 'AAVE copula absence — “she on the ground” = “she IS on the ground”.',
    },
    {
      find: "she's not",
      off: "she's not",
      on: "she ain't",
      note: 'AAVE negation — “she ain’t” = “she isn’t”.',
    },
    {
      find: 'shot my girlfriend',
      off: 'shot my girlfriend',
      on: 'shot my girl',
      note: '“My girl” = his girlfriend (AAVE / colloquial).',
    },
  ],
  wav2: [
    {
      find: "I be subbin'",
      off: "I be somethin'",
      on: "I be subbin'",
      note: 'AAVE habitual “be” — she works as a substitute teacher (her cover story). Misheard as “somethin’”.',
    },
    {
      find: "she's three",
      off: "she's free",
      on: "she's three",
      note: 'She slips the real detail — a 3-year-old is involved. “Three” misheard as “free” (th-fronting).',
    },
    {
      find: "y'all waitin' this",
      off: "y'all wait in this",
      on: "y'all waitin' this",
      note: 'AAVE — coded stalling for whoever is in the room with her; misheard as “wait in this”.',
    },
    {
      find: "y'all have",
      off: 'yawl have',
      on: "y'all have",
      note: 'AAVE second-person plural “y’all” = “you all”.',
    },
  ],
};

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Apply the demo's mishearing script to one line: off = misheard reading,
// on = corrected reading. Falls back to normal AAVE tagging.
function buildLineView(line, aiMode, demo, aiTags) {
  const corrections = line.speaker === 'Caller' ? MISHEARINGS[demo] || [] : [];
  const hits = corrections.filter((c) =>
    line.text.toLowerCase().includes(c.find.toLowerCase()),
  );

  if (hits.length === 0) {
    if (!aiMode) return { ...line, tags: [] };
    return { ...line, tags: (aiTags[line.id] || []).filter((t) => t.aave) };
  }

  const variant = aiMode ? 'on' : 'off';
  let text = line.text;
  for (const c of hits) {
    text = text.replace(new RegExp(escapeRe(c.find), 'i'), c[variant]);
  }

  const tags = [];
  for (const c of hits) {
    const needle = c[variant];
    const idx = text.toLowerCase().indexOf(needle.toLowerCase());
    if (idx === -1) continue;
    if (aiMode) {
      tags.push({
        phrase: text.slice(idx, idx + needle.length),
        start: idx,
        end: idx + needle.length,
        meaning: c.note,
        heard: c.off !== c.on ? c.off : '',
        correction: true,
      });
    } else {
      tags.push({
        phrase: text.slice(idx, idx + needle.length),
        start: idx,
        end: idx + needle.length,
        uncertain: true,
      });
    }
  }
  tags.sort((a, b) => a.start - b.start);
  return { ...line, text, tags };
}

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
  const [demo, setDemo] = useState('kenneth'); // which call/demo is loaded
  const [demos, setDemos] = useState([]); // available demos for the selector
  const audioRef = useRef(null);
  const playClock = useRef(0); // seconds elapsed in the current playback
  const riskTouched = useRef(false); // dispatcher has manually overridden the risk
  const geocodedFor = useRef(''); // last address geocoded, to avoid repeats

  // Load the chosen demo's scenario; reset playback state when switching demos.
  useEffect(() => {
    let cancelled = false;
    setRevealed(0);
    setPlaying(false);
    setAiTags({});
    setAutoReport(null);
    setFlyTarget(null);
    setCallerLocation(null);
    setRisk('');
    riskTouched.current = false;
    playClock.current = 0;
    geocodedFor.current = '';
    getScenario(demo)
      .then((s) => {
        if (cancelled) return;
        setScenario(s);
        if (s.demos) setDemos(s.demos);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [demo]);

  const lines = scenario?.lines || [];
  const revealedLines = useMemo(() => {
    return lines.slice(0, revealed).map((line) => buildLineView(line, aiMode, demo, aiTags));
  }, [lines, revealed, aiMode, aiTags, demo]);

  // Playback: a steady timer reveals each line at its timestamp while the audio
  // plays alongside. setInterval (not rAF) keeps the reveal running in
  // background tabs; the clock follows the audio but advances on its own if
  // playback stalls.
  useEffect(() => {
    if (!playing) return undefined;
    const audio = audioRef.current;
    if (audio) {
      audio.muted = false;
      audio.volume = 1;
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
      const t = playClock.current - TRANSCRIPT_DELAY;
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

  // Live tagging: tag revealed Caller lines (dispatcher speaks standard English).
  useEffect(() => {
    if (!aiMode) return;
    for (const line of lines.slice(0, revealed)) {
      if (line.speaker !== 'Caller') continue;
      if (aiTags[line.id]) continue;
      tagText(line.text)
        .then((res) => setAiTags((prev) => ({ ...prev, [line.id]: res.tags })))
        .catch(() => {});
    }
  }, [aiMode, revealed, lines, aiTags]);

  // Live incident report: re-read the revealed transcript and fill the fields,
  // throttled to every few lines.
  const reportInFlight = useRef(false);
  const lastReportAt = useRef(0);
  useEffect(() => {
    if (revealed === 0) {
      setAutoReport(null);
      lastReportAt.current = 0;
      return undefined;
    }
    const done = revealed >= lines.length;
    if (reportInFlight.current) return undefined;
    if (!done && revealed - lastReportAt.current < 3) return undefined;
    // ~2s debounce so the report lags the transcript and the final report lands
    // after the call finishes streaming.
    const snapshot = revealed;
    const timer = setTimeout(() => {
      reportInFlight.current = true;
      lastReportAt.current = snapshot;
      const payload = lines.slice(0, snapshot).map((l) => ({ speaker: l.speaker, text: l.text }));
      getReport(payload)
        .then(setAutoReport)
        .catch(() => {})
        .finally(() => {
          reportInFlight.current = false;
        });
    }, 2000);
    return () => clearTimeout(timer);
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

  // Geocode the spoken address once the agent extracts it, then fly the map
  // there and drop the caller hotspot at the real location.
  useEffect(() => {
    const raw = (autoReport?.agent?.location || autoReport?.naive?.location || '').trim();
    if (!raw || raw === geocodedFor.current) return;
    geocodedFor.current = raw;
    const cleaned = raw.replace(/,?\s*(apt\.?|apartment|unit|#)\s*\w+/i, '');
    const query = `${cleaned}, ${DEMO_CITY[demo] || ''}`;
    geocode(query)
      .then((loc) => {
        if (!loc) return;
        setFlyTarget({ lat: loc.lat, lng: loc.lng });
        setCallerLocation({ lat: loc.lat, lng: loc.lng, label: raw });
      })
      .catch(() => {});
  }, [autoReport, demo]);

  // Entities surfaced so far, grouped by category and de-duplicated.
  const entities = useMemo(() => {
    const grouped = Object.fromEntries(CATEGORY_ORDER.map((c) => [c, []]));
    const seen = new Set();
    for (const line of revealedLines) {
      for (const tag of line.tags || []) {
        if (!grouped[tag.category]) continue; // skip correction / uncertain marks
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

  // Caller sentiment estimate for the navbar (simulated; swap for Hume later).
  const sentiment = useMemo(
    () => analyzeSentiment(revealedLines.filter((l) => l.speaker === 'Caller')),
    [revealedLines],
  );

  // The report shown depends on the toggle: the agent (AAVE-aware) report when
  // interpretation is on, the naive (standard-English) report when it's off.
  const activeReport = useMemo(
    () => (aiMode ? autoReport?.agent : autoReport?.naive) || null,
    [aiMode, autoReport],
  );

  // Suggest a risk level: prefer the active report's priority, else infer from medical entities.
  const suggestedRisk = useMemo(() => {
    const fromAgent = activeReport?.priority?.toLowerCase();
    if (['low', 'moderate', 'high', 'critical'].includes(fromAgent)) return fromAgent;
    const med = entities.medical || [];
    if (med.length === 0) return '';
    const text = med.map((e) => `${e.phrase} ${e.meaning}`.toLowerCase()).join(' ');
    if (/uncon|cpr|breath|syncope|collapse|fainted|out\b/.test(text)) return 'critical';
    return 'high';
  }, [entities, activeReport]);

  // Auto-fill the risk level as the call unfolds, until the dispatcher overrides it.
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
    setCallerLocation(null);
    setFlyTarget(
      scenario ? { lat: scenario.center.lat, lng: scenario.center.lng, zoom: 13 } : null,
    );
    riskTouched.current = false;
    setRisk('');
    geocodedFor.current = '';
    if (audioRef.current) audioRef.current.currentTime = AUDIO_OFFSET;
  };

  const exportLog = async () => {
    const data = await getExport(demo);
    const enriched = { ...data, dispatcher_report: report, risk_category: risk || 'unassigned' };
    const blob = new Blob([JSON.stringify(enriched, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `truevoice-${demo}-log.json`;
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
        Connecting to TrueVoice…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f6f7f9] text-zinc-900">
      <audio key={demo} ref={audioRef} src={`/api/audio/${demo}`} preload="auto" />
      {/* Top command bar */}
      <header className="flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-6 py-2.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center border border-zinc-700 bg-zinc-900 text-zinc-200">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-4.5 w-4.5"
            >
              <path d="M4 12h2M9 7v10M14 4v16M19 9v6" />
            </svg>
          </span>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-semibold tracking-tight text-white">TrueVoice</h1>
              <span className="border border-zinc-700 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-zinc-400">
                911 Dispatch
              </span>
            </div>
            <p className="text-[11px] font-medium text-zinc-500">Emergency Dispatch Console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportOpen((v) => !v)}
            className="border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            {reportOpen ? 'Hide report' : 'Show report'}
          </button>
          <button
            onClick={() => setAiMode((v) => !v)}
            className="flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <span
              className={`relative h-4 w-7 transition-colors ${
                aiMode ? 'bg-blue-500' : 'bg-zinc-600'
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 bg-white transition-all ${
                  aiMode ? 'left-[14px]' : 'left-0.5'
                }`}
              />
            </span>
            Interpretation
          </button>
          <div className="flex items-center gap-2 border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500">Caller</span>
            <span className={`flex items-center gap-1.5 ${sentiment.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sentiment.dot}`} />
              {sentiment.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[12px] font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live
          </div>
        </div>
      </header>

      {/* Split panes: map + large live transcript + docked report column */}
      <div className="grid flex-1 grid-cols-12 grid-rows-1 overflow-hidden">
        <div className="relative col-span-5 min-h-0 border-r border-zinc-200">
          <MapPane
            key={scenario.id}
            center={scenario.center}
            emsUnits={scenario.ems_units}
            callerLocation={callerLocation}
            flyTarget={flyTarget}
          />

          {/* Incoming calls (demo selector) */}
          <div className="absolute left-4 top-4 z-[1000] w-60 overflow-hidden rounded-lg border border-zinc-200 bg-white/95 shadow-lg backdrop-blur">
            <div className="border-b border-zinc-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Incoming Calls
            </div>
            <div className="divide-y divide-zinc-100">
              {(demos.length ? demos : [{ key: 'kenneth' }, { key: 'wav2' }]).map((d) => {
                const active = demo === d.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => setDemo(d.key)}
                    className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition ${
                      active ? 'bg-blue-50' : 'hover:bg-zinc-50'
                    }`}
                  >
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        active ? 'bg-rose-500 animate-pulse' : 'bg-zinc-300'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block truncate text-[12px] font-semibold ${
                          active ? 'text-blue-900' : 'text-zinc-800'
                        }`}
                      >
                        {DEMO_LABELS[d.key] || d.key}
                      </span>
                      <span className="block truncate text-[10px] text-zinc-500">
                        {DEMO_SUBTITLES[d.key] || ''}
                      </span>
                    </span>
                    {active && (
                      <span className="text-[9px] font-bold uppercase tracking-wide text-rose-500">
                        Live
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={`${reportOpen ? 'col-span-4' : 'col-span-7'} flex min-h-0 min-w-0 flex-col`}>
          <div className="min-h-0 flex-1 overflow-hidden">
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
          <div className="col-span-3 min-h-0 min-w-0 border-l border-zinc-200">
            <ReportPopup
              open={reportOpen}
              onClose={() => setReportOpen(false)}
              entities={entities}
              callerLocation={callerLocation}
              auto={activeReport}
              aiMode={aiMode}
              corrections={autoReport?.corrections || []}
              severity={autoReport?.severity || ''}
              underTriage={autoReport?.under_triage || ''}
              naivePriority={autoReport?.naive?.priority || ''}
              agentPriority={autoReport?.agent?.priority || ''}
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
