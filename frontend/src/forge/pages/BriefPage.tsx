import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForgeStore } from '../store';
import type { DesignBrief } from '../types';
import type { AssemblyPartId } from '@/data/quizFlow';
import { CadAssemblyBay } from '../CadAssemblyBay';
import {
  BUILD_TASKS,
  LAYOUT_FRAME_ID,
  parseChassisLayout,
  type ChassisLayout,
} from '../cadParts';

type Stage = 'prompt' | 'quiz' | 'assemble' | 'ready';

type QuizOption = { id: string; label: string; hint?: string };
type QuizQuestion = {
  id: string;
  question: string;
  subtext: string;
  part: AssemblyPartId;
  options: QuizOption[];
};

const APP_FROM_CLASS: Record<string, DesignBrief['application']> = {
  'racing-fpv': 'racing',
  cinewhoop: 'cinema',
  photography: 'cinema',
  'heavy-lift': 'heavy-lift',
  industrial: 'industrial',
  custom: 'freestyle',
};

const PROMPT_SEEDS = [
  'Quiet indoor whoop for apartment freestyle, soft crashes, 3–5 min hops',
  'Cinema hex with GoPro payload, stable hover, long battery, under ₹80k',
  'Aggressive 5″ racing quad, 6S punch, light carbon, no HD cam',
  'Industrial octa for rooftop inspection, redundant motors, RTK-ready bay',
];

function localQuizFromPrompt(prompt: string): { summary: string; questions: QuizQuestion[]; application: DesignBrief['application'] } {
  const p = prompt.toLowerCase();
  let application: DesignBrief['application'] = 'freestyle';
  if (p.includes('race') || p.includes('fpv')) application = 'racing';
  else if (p.includes('cinema') || p.includes('film') || p.includes('gopro') || p.includes('photo')) application = 'cinema';
  else if (p.includes('long range') || p.includes('endurance') || p.includes('cruise')) application = 'long-range';
  else if (p.includes('heavy') || p.includes('lift') || p.includes('cargo')) application = 'heavy-lift';
  else if (p.includes('inspect') || p.includes('industrial') || p.includes('survey')) application = 'industrial';

  const questions: QuizQuestion[] = [
    {
      id: 'chassis',
      part: 'chassis',
      question: 'Which chassis layout should we forge first?',
      subtext: 'Motor count locks the airframe topology — Genesis caps at octa.',
      options: [
        { id: 'tri', label: 'Tricopter (3)', hint: 'Yaw servo / agile' },
        { id: 'quad', label: 'Quadcopter (4)', hint: 'Default FPV / whoop' },
        { id: 'hexa', label: 'Hexacopter (6)', hint: 'Lift + redundancy' },
        { id: 'octa', label: 'Octocopter (8)', hint: 'Max redundancy' },
      ],
    },
    {
      id: 'material',
      part: 'chassis',
      question: 'What primary frame material?',
      subtext: 'Stiffness, crash energy, and print path for the chassis plates.',
      options: [
        { id: 'carbon', label: 'Carbon fiber', hint: 'Stiff & light' },
        { id: 'hybrid', label: 'Carbon + aluminum', hint: 'Serviceable' },
        { id: 'tpu', label: 'TPU whoop body', hint: 'Indoor soft' },
        { id: 'titanium', label: 'Carbon + titanium', hint: 'Field duty' },
      ],
    },
    {
      id: 'voltage',
      part: 'battery',
      question: 'Which pack voltage fits the mission?',
      subtext: 'Cell count drives motor KV and ESC headroom.',
      options: [
        { id: '4s', label: '4S (~14.8V)', hint: 'Classic punch' },
        { id: '6s', label: '6S (~22.2V)', hint: 'Modern efficiency' },
        { id: '6s-endurance', label: '6S high capacity', hint: 'Long sortie' },
        { id: '12s', label: 'High-voltage lift', hint: 'Heavy platforms' },
      ],
    },
    {
      id: 'optics',
      part: 'optics',
      question: 'What vision stack mounts on the nose?',
      subtext: 'Latency vs recording fidelity for this brief.',
      options: [
        { id: 'none', label: 'No camera', hint: 'LOS only' },
        { id: 'fpv', label: 'Low-latency FPV', hint: 'Pilot first' },
        { id: 'hd', label: 'Stabilized HD / 4K', hint: 'Imaging' },
        { id: 'dual', label: 'FPV + HD dual', hint: 'Pro film' },
      ],
    },
  ];

  // Prompt-aware nudges / extra mission questions
  if (p.includes('whoop') || p.includes('indoor') || p.includes('quiet')) {
    questions.splice(2, 0, {
      id: 'ducts',
      part: 'shell',
      question: 'How protected should the props be?',
      subtext: 'Whoops and indoor craft usually want ducts or soft armor.',
      options: [
        { id: 'ducts', label: 'Full prop ducts', hint: 'Indoor safe' },
        { id: 'canopy', label: 'Electronics canopy', hint: 'Splash' },
        { id: 'open', label: 'Open frame', hint: 'Max cooling' },
        { id: 'armor', label: 'Armored shell', hint: 'Field abuse' },
      ],
    });
  } else if (application === 'heavy-lift' || application === 'industrial') {
    questions.splice(2, 0, {
      id: 'payload',
      part: 'avionics',
      question: 'How heavy is the mission payload?',
      subtext: 'Locks thrust margin and battery class before CAD generation.',
      options: [
        { id: 'light', label: 'Under 500 g', hint: 'Sensors' },
        { id: 'mid', label: '0.5–2 kg', hint: 'Camera / radio' },
        { id: 'heavy', label: '2–5 kg', hint: 'Cargo' },
        { id: 'max', label: '5 kg+', hint: 'Industrial' },
      ],
    });
  } else {
    questions.splice(2, 0, {
      id: 'role',
      part: 'motors',
      question: 'What flight character should the motors favor?',
      subtext: 'KV / torque profile before we dock propulsion CAD.',
      options: [
        { id: 'snap', label: 'Snap / race', hint: 'High KV' },
        { id: 'freestyle', label: 'Freestyle balance', hint: 'Mid KV' },
        { id: 'cine', label: 'Smooth cinema', hint: 'Low KV' },
        { id: 'lift', label: 'Torque / lift', hint: 'Ultra-low KV' },
      ],
    });
  }

  return {
    application,
    summary: `Mission brief locked — asking ${questions.length} forge questions tailored to your prompt.`,
    questions,
  };
}

async function fetchDynamicQuiz(prompt: string): Promise<{
  summary: string;
  questions: QuizQuestion[];
  application: DesignBrief['application'];
  source: string;
} | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 14000);
    const res = await fetch('/api/brief-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.questions) || data.questions.length < 3) return null;
    return {
      summary: String(data.summary || 'Dynamic quiz ready.'),
      questions: data.questions,
      application: (data.application || 'freestyle') as DesignBrief['application'],
      source: String(data.source || 'ai'),
    };
  } catch {
    return null;
  }
}

function answersToBrief(
  prompt: string,
  answers: Record<string, string>,
  application: DesignBrief['application']
): Partial<DesignBrief> {
  const layout = parseChassisLayout(answers.chassis);
  const material = (['carbon', 'hybrid', 'tpu', 'titanium'].includes(answers.material)
    ? answers.material
    : 'carbon') as DesignBrief['material'];

  let payloadG = 0;
  let flightTimeMin = 5;
  let budgetInr = 30000;
  if (answers.payload === 'mid') payloadG = 1200;
  if (answers.payload === 'heavy') payloadG = 3500;
  if (answers.payload === 'max') payloadG = 6000;
  if (answers.voltage === '6s-endurance') flightTimeMin = 12;
  if (application === 'cinema') budgetInr = 80000;
  if (application === 'heavy-lift' || application === 'industrial') budgetInr = 150000;

  const notes = [
    prompt.trim(),
    `chassis:${layout}`,
    `frame:${LAYOUT_FRAME_ID[layout]}`,
    ...Object.entries(answers).map(([k, v]) => `${k}=${v}`),
  ].join(' | ');

  return {
    application,
    material,
    manufacturing: material === 'tpu' ? '3d-print' : 'hybrid',
    payloadG,
    flightTimeMin,
    budgetInr,
    missionPrompt: prompt.trim(),
    chassisLayout: layout,
    quizAnswers: answers,
    notes,
  };
}

export const BriefPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const setBrief = useForgeStore((s) => s.setBrief);
  const submitBrief = useForgeStore((s) => s.submitBrief);

  const [stage, setStage] = useState<Stage>('prompt');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [summary, setSummary] = useState('');
  const [quizSource, setQuizSource] = useState('');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [application, setApplication] = useState<DesignBrief['application']>('freestyle');
  const [visibleParts, setVisibleParts] = useState<AssemblyPartId[]>([]);
  const [activePart, setActivePart] = useState<AssemblyPartId | null>(null);
  const [assembleStatus, setAssembleStatus] = useState('');
  const [buildLog, setBuildLog] = useState<string[]>([]);
  const [planFeatures, setPlanFeatures] = useState<string[]>([]);
  const [pythonUrl, setPythonUrl] = useState<string | null>(null);
  const [scadUrl, setScadUrl] = useState<string | null>(null);
  const [planSummary, setPlanSummary] = useState('');

  React.useEffect(() => {
    const cls = params.get('class');
    if (cls && APP_FROM_CLASS[cls]) {
      setApplication(APP_FROM_CLASS[cls]);
      setBrief({ application: APP_FROM_CLASS[cls] });
    }
  }, [params, setBrief]);

  const layout: ChassisLayout = useMemo(
    () => parseChassisLayout(answers.chassis),
    [answers.chassis]
  );

  const progress = stage === 'prompt' ? 8 : stage === 'quiz' ? 20 + (qIndex / Math.max(questions.length, 1)) * 45 : stage === 'assemble' ? 78 : 100;

  const startQuiz = async () => {
    if (prompt.trim().length < 12) return;
    setBusy(true);
    setErr('');
    setSummary('Gemini + Groq are reading your mission…');
    const ai = await fetchDynamicQuiz(prompt.trim());
    const local = localQuizFromPrompt(prompt.trim());
    const pack = ai || { ...local, source: 'local' };
    setQuestions(pack.questions);
    setApplication(pack.application);
    setSummary(pack.summary);
    setQuizSource(pack.source);
    setQIndex(0);
    setAnswers({});
    setVisibleParts([]);
    setActivePart(null);
    setStage('quiz');
    setBusy(false);
  };

  const pickOption = async (optionId: string) => {
    const q = questions[qIndex];
    if (!q) return;
    const nextAnswers = { ...answers, [q.id]: optionId };
    setAnswers(nextAnswers);

    // Soft preview: chassis docks as soon as layout is chosen
    if (q.id === 'chassis') {
      setVisibleParts(['chassis']);
      setActivePart('chassis');
      setAssembleStatus(`Locking ${optionId} chassis CAD…`);
    }

    if (qIndex < questions.length - 1) {
      setQIndex((i) => i + 1);
      return;
    }

    // Quiz complete → tokenize + assemble part by part
    const patch = answersToBrief(prompt, nextAnswers, application);
    setBrief(patch);
    setStage('assemble');
    await runAssembly(nextAnswers);
  };

  const runAssembly = async (finalAnswers: Record<string, string>) => {
    setBuildLog([]);
    setBusy(true);
    setAssembleStatus('AI converting mission → accurate CAD plan + Blender Python…');

    let partOrder = BUILD_TASKS.map((t) => t.id);
    let features: string[] = [];
    try {
      const res = await fetch('/api/build-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), answers: finalAnswers, application }),
      });
      if (res.ok) {
        const plan = await res.json();
        if (Array.isArray(plan.parts) && plan.parts.length) partOrder = plan.parts;
        features = Array.isArray(plan.features) ? plan.features : [];
        setPlanFeatures(features);
        setPlanSummary(String(plan.summary || ''));
        setPythonUrl(plan.pythonUrl || null);
        setScadUrl(plan.scadUrl || null);
        if (plan.layout) setAnswers((a) => ({ ...a, chassis: plan.layout }));
        setBuildLog((log) => [
          ...log,
          `▸ PLAN  ${plan.motorCount}-motor ${plan.layout} @ ${plan.wheelbaseMm}mm`,
          `▸ PY    Blender script ready`,
          `▸ SCAD  OpenSCAD snippet ready`,
        ]);
      }
    } catch {
      setBuildLog((log) => [...log, '▸ PLAN  offline — using local assembly order']);
    }

    const docked: AssemblyPartId[] = [];
    for (let i = 0; i < partOrder.length; i++) {
      const id = partOrder[i] as AssemblyPartId;
      const task = BUILD_TASKS.find((t) => t.id === id) || {
        id,
        title: id,
        token: id.toUpperCase(),
      };
      setActivePart(id);
      setAssembleStatus(`Docking ${task.token} — ${task.title} (rotors spin on PROPS)`);
      setBuildLog((log) => [...log, `▸ ${task.token}  ${task.title}`]);
      await new Promise((r) => setTimeout(r, 700));
      docked.push(id);
      setVisibleParts([...docked]);
      await new Promise((r) => setTimeout(r, 450));
    }

    setAssembleStatus(
      planSummary ||
        `${parseChassisLayout(finalAnswers.chassis).toUpperCase()} airframe — real STLs docked, props spinning`
    );
    setActivePart(null);
    setStage('ready');
    setBusy(false);
  };

  const launch = async () => {
    setBusy(true);
    setErr('');
    try {
      const patch = answersToBrief(prompt, answers, application);
      setBrief(patch);
      const id = await submitBrief();
      navigate(`/forge/pipeline/${id}`);
    } catch (e: any) {
      setErr(e?.message || 'Could not start job. Is the backend running on the proxy port?');
      setBusy(false);
    }
  };

  const currentQ = questions[qIndex];
  const pathProgress = questions.length
    ? ((qIndex + (stage === 'quiz' ? 0.35 : 1)) / questions.length) * 100
    : 0;

  return (
    <div className="brief-sky">
      <div className="brief-sky-glow" aria-hidden />
      <div className="brief-sky-grid" aria-hidden />

      <header className="brief-sky-hero">
        <p className="brief-sky-brand">GENESIS · MISSION PROMPT</p>
        <h1>Speak the sortie. Forge the airframe.</h1>
        <p className="brief-sky-lede">
          Mission in → dual AI asks chassis-first questions → every answered feature docks as real printable CAD
          (CogniFly, toothpick, JeNo). Rotors spin on attach. Gemini/Groq also emit accurate Blender Python + OpenSCAD.
        </p>
        <div className="brief-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>

      <div className="brief-sky-layout">
        <div className="brief-sky-main">
          <AnimatePresence mode="wait">
            {stage === 'prompt' && (
              <motion.section
                key="prompt"
                className="brief-prompt-bay"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
              >
                <label className="brief-prompt-label" htmlFor="mission-prompt">
                  Mission prompt
                </label>
                <textarea
                  id="mission-prompt"
                  className="brief-prompt-input"
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the drone you need — indoor whoop, cinema hex, racing quad, inspection octa…"
                />
                <div className="brief-seed-row">
                  {PROMPT_SEEDS.map((seed) => (
                    <button key={seed} type="button" className="brief-seed" onClick={() => setPrompt(seed)}>
                      {seed}
                    </button>
                  ))}
                </div>
                <div className="brief-prompt-actions">
                  <button
                    type="button"
                    className="brief-cta"
                    disabled={busy || prompt.trim().length < 12}
                    onClick={startQuiz}
                  >
                    {busy ? 'Reading mission…' : 'Launch dynamic quiz →'}
                  </button>
                  <span>{prompt.trim().length} chars</span>
                </div>
              </motion.section>
            )}

            {stage === 'quiz' && currentQ && (
              <motion.section
                key={`quiz-${currentQ.id}`}
                className="brief-quiz-bay"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
              >
                <div className="brief-flow-path" aria-hidden>
                  <svg viewBox="0 0 120 320" preserveAspectRatio="none">
                    <path
                      d="M60 8 C 20 60, 100 100, 60 150 S 20 240, 60 310"
                      fill="none"
                      stroke="rgba(14,165,233,0.25)"
                      strokeWidth="6"
                      strokeLinecap="round"
                    />
                    <path
                      d="M60 8 C 20 60, 100 100, 60 150 S 20 240, 60 310"
                      fill="none"
                      stroke="#0ea5e9"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray="320"
                      strokeDashoffset={320 - (320 * pathProgress) / 100}
                    />
                  </svg>
                  <ol>
                    {questions.map((q, i) => (
                      <li key={q.id} className={i < qIndex ? 'is-done' : i === qIndex ? 'is-now' : ''}>
                        {i + 1}
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="brief-quiz-copy">
                  <p className="brief-quiz-meta">
                    Question {qIndex + 1}/{questions.length}
                    {quizSource ? ` · ${quizSource}` : ''}
                  </p>
                  <h2>{currentQ.question}</h2>
                  <p>{currentQ.subtext}</p>
                  <div className="brief-option-stack">
                    {currentQ.options.map((opt, idx) => (
                      <motion.button
                        key={opt.id}
                        type="button"
                        className="brief-option"
                        style={{ ['--i' as string]: idx }}
                        whileHover={{ x: 6 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => pickOption(opt.id)}
                      >
                        <span className="brief-option-id">{opt.id}</span>
                        <span>
                          <strong>{opt.label}</strong>
                          {opt.hint ? <em>{opt.hint}</em> : null}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                  {summary && <p className="brief-quiz-summary">{summary}</p>}
                </div>
              </motion.section>
            )}

            {(stage === 'assemble' || stage === 'ready') && (
              <motion.section
                key="assemble"
                className="brief-assemble-bay"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <p className="brief-quiz-meta">Tokenized build · {layout.toUpperCase()}</p>
                <h2>{stage === 'ready' ? 'Airframe locked' : 'Assembling on the bay'}</h2>
                <p>
                  Prompt tokens fire in build order — chassis first, then propulsion, power, spinning rotors,
                  avionics, optics, armor. Meshes are printable CAD (not generative fakes). AI also writes Blender
                  Python that matches your motor count, camera, and ducts.
                </p>
                <ul className="brief-token-log">
                  {buildLog.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                {planFeatures.length > 0 && (
                  <ul className="brief-feature-chips">
                    {planFeatures.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                )}
                {stage === 'ready' && (
                  <div className="brief-prompt-actions">
                    <button type="button" className="brief-cta" disabled={busy} onClick={launch}>
                      {busy ? 'Starting CAD job…' : 'Generate OpenSCAD STL →'}
                    </button>
                    {pythonUrl && (
                      <a className="brief-ghost" href={pythonUrl} download>
                        Download Blender .py
                      </a>
                    )}
                    {scadUrl && (
                      <a className="brief-ghost" href={scadUrl} download>
                        Download .scad
                      </a>
                    )}
                    <button
                      type="button"
                      className="brief-ghost"
                      disabled={busy}
                      onClick={() => {
                        setStage('prompt');
                        setVisibleParts([]);
                        setBuildLog([]);
                        setPlanFeatures([]);
                        setPythonUrl(null);
                      }}
                    >
                      New prompt
                    </button>
                  </div>
                )}
                {err && <p className="brief-err">{err}</p>}
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        <aside className="brief-sky-aside">
          <CadAssemblyBay
            layout={layout}
            visibleParts={visibleParts}
            activePart={activePart || (visibleParts[visibleParts.length - 1] ?? null)}
            status={assembleStatus || (stage === 'prompt' ? 'Waiting for mission prompt…' : '')}
            features={planFeatures}
          />
          <div className="brief-aside-note">
            <strong>CAD sources</strong>
            <span>
              <a href="https://github.com/thecognifly/CogniFly-STL" target="_blank" rel="noreferrer">
                CogniFly-STL
              </a>
              {' · '}
              <a href="https://github.com/vsergeev/3d-parametric-toothpick" target="_blank" rel="noreferrer">
                Parametric toothpick
              </a>
              {' · '}
              <a href="https://github.com/WE-are-FPV/JeNo-5.1" target="_blank" rel="noreferrer">
                JeNo 5.1 TPU
              </a>
              {' · '}
              <a href="https://github.com/km5es/Drone-Project-CAD" target="_blank" rel="noreferrer">
                Drone-Project-CAD
              </a>
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
};
