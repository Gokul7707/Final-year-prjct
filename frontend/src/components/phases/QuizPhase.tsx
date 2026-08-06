import React, { Suspense, lazy, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DRONE_TYPES } from '@/data/droneTypes';
import { getQuizForClass, resolvePartsFromAnswers, ASSEMBLY_ORDER } from '@/data/quizFlow';
import { useSessionStore } from '@/store/sessionStore';
import { useDroneStore } from '@/store/droneStore';
import { SilentErrorBoundary } from '@/components/ui/SilentErrorBoundary';

const RotatingDroneRig = lazy(() =>
  import('@/components/3d/RotatingDroneRig').then((m) => ({ default: m.RotatingDroneRig }))
);

export const QuizPhase: React.FC = () => {
  const selectedClass = useSessionStore((s) => s.selectedClass);
  const selectedFrameId = useSessionStore((s) => s.selectedFrameId);
  const answers = useSessionStore((s) => s.answers);
  const attachedParts = useSessionStore((s) => s.attachedParts);
  const quizIndex = useSessionStore((s) => s.quizIndex);
  const answerQuiz = useSessionStore((s) => s.answerQuiz);
  const attachPart = useSessionStore((s) => s.attachPart);
  const setQuizIndex = useSessionStore((s) => s.setQuizIndex);
  const setPhase = useSessionStore((s) => s.setPhase);
  const finalizeBuild = useSessionStore((s) => s.finalizeBuild);

  const {
    updateFrame,
    updateMotor,
    updateBattery,
    updatePropeller,
    updateESC,
    updateCamera,
    updateCanopy,
    updateWhoop,
  } = useDroneStore();

  const drone = DRONE_TYPES.find((d) => d.id === selectedClass);
  const quiz = useMemo(() => getQuizForClass(selectedClass), [selectedClass]);
  const step = quiz[quizIndex];
  const accent = drone?.accent || '#ff6b1a';
  const assemblyProgress = attachedParts.length / Math.max(1, ASSEMBLY_ORDER.length);

  useEffect(() => {
    const resolved = resolvePartsFromAnswers(answers, selectedFrameId || drone?.frameId || 'frame-quad-250');
    updateFrame(resolved.frameId);
    updateMotor(resolved.motorId, 0);
    updateBattery(resolved.batteryId);
    updatePropeller(resolved.propellerId, 0);
    updateESC(resolved.escId, 0);
    updateCamera(resolved.cameraId);
    updateCanopy(resolved.canopyId);
    updateWhoop(resolved.whoopId);
  }, [answers, selectedFrameId, drone?.frameId]);

  const pick = (optionId: string) => {
    if (!step) return;
    answerQuiz(step.id, optionId, step.part);
    window.setTimeout(() => {
      if (quizIndex >= quiz.length - 1) {
        ASSEMBLY_ORDER.forEach((p) => attachPart(p.id));
        finalizeBuild();
      } else {
        setQuizIndex(quizIndex + 1);
      }
    }, 480);
  };

  if (!step) return null;

  return (
    <div className="forge-shell quiz-forge">
      <div className="forge-frame" aria-hidden />
      <div className="forge-flecks" aria-hidden />

      <header className="quiz-forge-header">
        <button type="button" className="forge-ghost" onClick={() => setPhase('select')}>
          ← Hangar
        </button>
        <div className="quiz-forge-title">
          <p className="eyebrow" style={{ color: accent }}>
            {drone?.mission || 'Mission brief'}
          </p>
          <h2>
            {drone?.name || 'Airframe'} · Guided Forge
          </h2>
        </div>
        <div className="quiz-forge-progress">
          <div className="quiz-bar">
            <motion.div
              className="quiz-bar-fill"
              style={{ background: accent }}
              initial={false}
              animate={{ width: `${((quizIndex + (answers[step.id] ? 1 : 0)) / quiz.length) * 100}%` }}
            />
          </div>
          <span>
            {quizIndex + 1}/{quiz.length}
          </span>
        </div>
      </header>

      <div className="quiz-forge-layout">
        <div className="quiz-forge-panel">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 18, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -14, filter: 'blur(4px)' }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.3, 1] }}
            >
              <p className="part-chip" style={{ color: accent, borderColor: accent }}>
                Docking: {step.partLabel}
              </p>
              <h3 className="quiz-q">{step.question}</h3>
              <p className="quiz-sub">{step.subtext}</p>

              <div className="quiz-options">
                {step.options.map((opt, i) => (
                  <motion.button
                    key={opt.id}
                    type="button"
                    className={`quiz-option ${answers[step.id] === opt.id ? 'selected' : ''}`}
                    style={{ ['--accent' as string]: accent }}
                    onClick={() => pick(opt.id)}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * i }}
                    whileHover={{ x: 6 }}
                  >
                    <span className="opt-label">{opt.label}</span>
                    {opt.hint && <span className="opt-hint">{opt.hint}</span>}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="quiz-forge-bay">
          <div className="quiz-forge-bay-head">
            <span>Assembly bay</span>
            <strong style={{ color: accent }}>
              {attachedParts.length}/{ASSEMBLY_ORDER.length} locked
            </strong>
          </div>

          <div className="quiz-forge-drone">
            <h1 className="quiz-forge-word" aria-hidden>
              FORGE
            </h1>
            <SilentErrorBoundary>
              <Suspense fallback={<div className="commercial-drone-fallback" />}>
                <RotatingDroneRig mode="scroll" progress={assemblyProgress} span={1.45} />
              </Suspense>
            </SilentErrorBoundary>
          </div>

          <ul className="quiz-forge-rail">
            {ASSEMBLY_ORDER.map((part) => {
              const on = attachedParts.includes(part.id);
              const active = step.part === part.id;
              return (
                <li key={part.id} className={`${on ? 'on' : ''} ${active ? 'active' : ''}`}>
                  <span className="rail-dot" style={{ background: on || active ? accent : undefined }} />
                  {part.label}
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
};
