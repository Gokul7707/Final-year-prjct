import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForgeStore } from '../store';

export const PipelinePage: React.FC = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const job = useForgeStore((s) => s.job);
  const loadJob = useForgeStore((s) => s.loadJob);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = async () => {
      const j = await loadJob(jobId);
      if (stop) return;
      setLoading(false);
      if (!j) {
        setMissing(true);
        if (timer) clearInterval(timer);
        return;
      }
      setMissing(false);
      if (j.status === 'done') {
        if (timer) clearInterval(timer);
        setTimeout(() => !stop && navigate(`/forge/results/${jobId}`), 600);
        return;
      }
      if (j.status === 'failed' && timer) clearInterval(timer);
    };
    setLoading(true);
    tick();
    timer = setInterval(tick, 700);
    return () => {
      stop = true;
      if (timer) clearInterval(timer);
    };
  }, [jobId, loadJob, navigate]);

  if (loading && (!job || job.id !== jobId)) {
    return (
      <div className="forge-empty">
        <p>Loading CAD loop…</p>
      </div>
    );
  }

  if (missing || !job || job.id !== jobId) {
    return (
      <div className="forge-empty">
        <p>Job not found.</p>
        <Link to="/forge" className="forge-btn">
          New brief
        </Link>
      </div>
    );
  }

  const done = job.steps.filter((s) => s.status === 'done').length;
  const pct = Math.round((done / job.steps.length) * 100);
  const designGenerated = job.status === 'done' && job.alternatives.some((a) => !!a.stlUrl);
  const cadRunning = job.steps.some((s) => s.id === 'cad' && s.status === 'running');
  const headline = useMemo(() => {
    if (designGenerated) return 'Design generated';
    if (job.status === 'failed') return 'Job failed';
    return 'CAD loop running';
  }, [designGenerated, job.status]);

  return (
    <div className="forge-pipeline-shell">
      <motion.section
        className="forge-hero-card"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="forge-hero-copy">
          <div className="forge-eyebrow">Genesis Forge · AI-native CAD loop</div>
          <h1 className="forge-h1">{headline}</h1>
          <p className="forge-sub">
            Job <strong>{job.id}</strong>
            {job.error ? ` — ${job.error}` : ''}
          </p>
          <div className="forge-progress">
            <span style={{ width: `${Math.max(6, pct)}%` }} />
          </div>
          {cadRunning && (
            <p style={{ margin: '0.75rem 0 0', fontSize: '0.9rem', color: '#2563eb', fontWeight: 600 }}>
              OpenSCAD is meshing the whoop frame — usually 20–60 seconds. Keep this tab open.
            </p>
          )}
          <div className="forge-hero-actions">
            {designGenerated ? (
              <Link to={`/forge/results/${job.id}`} className="forge-btn">
                Review {job.alternatives.length} alternatives →
              </Link>
            ) : (
              <Link to="/forge" className="forge-btn secondary">
                Revise brief
              </Link>
            )}
          </div>
        </div>
        <div className="forge-hero-visual" aria-hidden="true">
          <div className="forge-orb" />
          <div className="forge-ring" />
          <div className="forge-panel">
            <div className="forge-panel-dot" />
            <div className="forge-panel-dot" />
            <div className="forge-panel-dot" />
          </div>
        </div>
      </motion.section>

      <motion.ul
        className="forge-step-list"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
      >
        {job.steps.map((step) => (
          <motion.li key={step.id} className={step.status} whileHover={{ y: -2, scale: 1.01 }}>
            <span className="forge-dot">{step.status === 'done' ? '✓' : step.status === 'failed' ? '✕' : ''}</span>
            <div>
              <strong>{step.label}</strong>
              {step.detail && (
                <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#6b7280' }}>{step.detail}</p>
              )}
            </div>
          </motion.li>
        ))}
      </motion.ul>
    </div>
  );
};
