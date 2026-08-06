import React, { useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useSessionStore, type AppPhase } from '@/store/sessionStore';
import { LoginPhase } from '@/components/phases/LoginPhase';
import { GreetingPhase } from '@/components/phases/GreetingPhase';
import { SelectPhase } from '@/components/phases/SelectPhase';
import { QuizPhase } from '@/components/phases/QuizPhase';
import { CustomPromptPhase } from '@/components/phases/CustomPromptPhase';
import { ExportPhase } from '@/components/phases/ExportPhase';
import { PublicViewer } from '@/components/phases/PublicViewer';

// Forward order of the build journey — determines whether a phase change
// should feel like moving deeper into the forge (slide up) or stepping back
// (slide down), instead of a flat, directionless crossfade.
const PHASE_ORDER: AppPhase[] = ['login', 'greeting', 'select', 'quiz', 'export'];

function rankOf(phase: AppPhase) {
  if (phase === 'custom') return PHASE_ORDER.indexOf('quiz');
  const idx = PHASE_ORDER.indexOf(phase);
  return idx === -1 ? 0 : idx;
}

const phaseVariants = {
  enter: (dir: number) => ({
    opacity: 0,
    y: dir >= 0 ? 26 : -26,
    scale: 0.985,
    filter: 'blur(6px)',
  }),
  center: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: (dir: number) => ({
    opacity: 0,
    y: dir >= 0 ? -18 : 18,
    scale: 0.99,
    filter: 'blur(4px)',
  }),
};

function App() {
  const phase = useSessionStore((s) => s.phase);
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);

  const viewId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view');
  }, []);

  const active = !isAuthenticated ? 'login' : phase;
  const prevRank = useRef(rankOf(active));
  const dir = rankOf(active) - prevRank.current >= 0 ? 1 : -1;
  prevRank.current = rankOf(active);

  if (viewId) {
    return <PublicViewer buildId={viewId} />;
  }

  return (
    <div className="app-root">
      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={active}
          custom={dir}
          variants={phaseVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="phase-motion"
        >
          {active === 'login' && <LoginPhase />}
          {active === 'greeting' && <GreetingPhase />}
          {active === 'select' && <SelectPhase />}
          {active === 'quiz' && <QuizPhase />}
          {active === 'custom' && <CustomPromptPhase />}
          {active === 'export' && <ExportPhase />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default App;
