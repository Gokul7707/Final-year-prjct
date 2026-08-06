import React, { Suspense, lazy, useState } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/store/sessionStore';
import { SilentErrorBoundary } from '@/components/ui/SilentErrorBoundary';

const RotatingDroneRig = lazy(() =>
  import('@/components/3d/RotatingDroneRig').then((m) => ({ default: m.RotatingDroneRig }))
);

export const LoginPhase: React.FC = () => {
  const login = useSessionStore((s) => s.login);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    window.setTimeout(() => {
      const result = login(username, password);
      if (!result.ok) setError(result.error || 'Access denied');
      setLoading(false);
    }, 650);
  };

  return (
    <div className="forge-shell login-forge">
      <div className="forge-frame" aria-hidden />
      <div className="forge-flecks" aria-hidden />

      <h1 className="forge-wordmark" aria-hidden>
        GENESIS
      </h1>

      <div className="login-forge-drone">
        <SilentErrorBoundary>
          <Suspense fallback={<div className="commercial-drone-fallback" />}>
            <RotatingDroneRig mode="idle" span={2.2} />
          </Suspense>
        </SilentErrorBoundary>
      </div>

      <motion.div
        className="login-forge-card"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.25, 1, 0.3, 1] }}
      >
        <div className="login-forge-brand">
          <span className="login-forge-mark">G</span>
          <div>
            <strong>GENESIS</strong>
            <em>chassis forge</em>
          </div>
        </div>

        <p className="login-forge-lead">
          Sign in with your callsign — then scroll the hangar as the chassis travels through each mission.
        </p>

        <form onSubmit={submit} className="login-forge-form">
          <label>
            <span>Callsign</span>
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. ApexAudio"
              autoComplete="username"
            />
          </label>
          <label>
            <span>Access code</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <motion.button
            type="submit"
            className="commercial-cta"
            disabled={loading}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? 'Authenticating…' : 'Enter Hangar →'}
          </motion.button>
        </form>

        <p className="login-forge-hint">Demo — any callsign + 4+ character code.</p>
      </motion.div>
    </div>
  );
};
