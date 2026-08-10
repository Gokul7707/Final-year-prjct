import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/store/sessionStore';

export const LoginPhase: React.FC = () => {
  const login = useSessionStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<'callsign' | 'code' | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    window.setTimeout(() => {
      const result = login(username, password);
      if (!result.ok) setError(result.error || 'Access denied');
      setLoading(false);
    }, 520);
  };

  return (
    <div className="login-access">
      <div className="login-access-frame" aria-hidden />
      <div className="login-access-flecks" aria-hidden />
      <div className="login-access-runway" aria-hidden />
      <div className="login-access-orbit login-access-orbit--a" aria-hidden />
      <div className="login-access-orbit login-access-orbit--b" aria-hidden />

      <motion.h1
        className="login-access-wordmark"
        aria-hidden
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        GENESIS
      </motion.h1>

      <header className="login-access-top">
        <div className="login-access-badge">
          <span className="login-access-g">G</span>
          <p>GENESIS · FORGE · BUILD</p>
        </div>
        <p className="login-access-gate">HANGAR GATE 01</p>
      </header>

      <aside className="login-access-rail" aria-hidden>
        <span className="is-on" />
        <span />
        <span />
        <span />
      </aside>

      <motion.section
        className={`login-access-bay ${focused ? 'is-lit' : ''}`}
        initial={{ opacity: 0, y: 40, rotateX: 8 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.75, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="login-access-bay-glow" aria-hidden />
        <div className="login-access-bay-head">
          <em>chassis forge</em>
          <h2>Clear for hangar entry</h2>
          <p>Identify with your callsign. The bay unlocks the mission scroll — no models on the gate.</p>
        </div>

        <form onSubmit={submit} className="login-access-form">
          <label className={focused === 'callsign' ? 'is-focus' : ''}>
            <span>Callsign</span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onFocus={() => setFocused('callsign')}
              onBlur={() => setFocused(null)}
              placeholder="ApexAudio"
              autoComplete="username"
            />
            <i />
          </label>

          <label className={focused === 'code' ? 'is-focus' : ''}>
            <span>Access code</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused('code')}
              onBlur={() => setFocused(null)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
            <i />
          </label>

          {error && (
            <p className="login-access-error" role="alert">
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            className="login-access-cta"
            disabled={loading}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>{loading ? 'Opening bay…' : 'Enter Hangar'}</span>
            <svg viewBox="0 0 24 24" aria-hidden>
              <path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.button>
        </form>

        <footer className="login-access-foot">
          <span>DEMO CLEARANCE</span>
          <span>any callsign · 4+ char code</span>
        </footer>
      </motion.section>

      <p className="login-access-scroll" aria-hidden>
        SCROLL — AFTER ENTRY
      </p>
    </div>
  );
};
