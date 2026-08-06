import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/store/sessionStore';

const LINES = [
  (name: string) => `Hey ${name} —`,
  () => `what's the mission today?`,
  () => `Walk the hangar. Pick a real airframe. We'll assemble it piece by piece.`,
];

export const GreetingPhase: React.FC = () => {
  const username = useSessionStore((s) => s.username);
  const completeGreeting = useSessionStore((s) => s.completeGreeting);
  const [line, setLine] = useState(0);

  const texts = useMemo(() => LINES.map((fn) => fn(username)), [username]);

  useEffect(() => {
    if (line >= texts.length) {
      const t = window.setTimeout(completeGreeting, 700);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(() => setLine((l) => l + 1), line === 0 ? 1100 : 1400);
    return () => clearTimeout(t);
  }, [line, texts.length, completeGreeting]);

  return (
    <div className="phase-shell greeting-shell" onClick={() => line < texts.length && setLine(texts.length)}>
      <div className="greeting-orbit" aria-hidden />
      <div className="greeting-content">
        <AnimatePresence mode="wait">
          {line < texts.length ? (
            <motion.h2
              key={line}
              className="greeting-line"
              initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {texts[line]}
            </motion.h2>
          ) : (
            <motion.p
              key="go"
              className="greeting-skip"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Opening hangar…
            </motion.p>
          )}
        </AnimatePresence>
        <motion.button
          className="greeting-continue"
          onClick={(e) => {
            e.stopPropagation();
            completeGreeting();
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
        >
          Skip intro
        </motion.button>
      </div>
    </div>
  );
};
