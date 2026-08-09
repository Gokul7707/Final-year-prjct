import React, { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useForgeStore } from '../store';

export const PipelinePage: React.FC = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const job = useForgeStore((s) => s.job);
  const loadJob = useForgeStore((s) => s.loadJob);

  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    let timer: ReturnType<typeof setInterval> | undefined;
    const tick = async () => {
      const j = await loadJob(jobId);
      if (stop || !j) return;
      if (j.status === 'done') {
        if (timer) clearInterval(timer);
        setTimeout(() => !stop && navigate(`/forge/results/${jobId}`), 700);
        return;
      }
      if (j.status === 'failed' && timer) clearInterval(timer);
    };
    tick();
    timer = setInterval(tick, 700);
    return () => {
      stop = true;
      if (timer) clearInterval(timer);
    };
  }, [jobId, loadJob, navigate]);

  if (!job || job.id !== jobId) {
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

  return (
    <>
      <h1 className="forge-h1">{job.status === 'done' ? 'Designs ready' : 'Agents working'}</h1>
      <p className="forge-sub">
        Job <code>{job.id}</code>
        {job.error ? ` — ${job.error}` : ''}
      </p>
      <div className="forge-progress">
        <span style={{ width: `${Math.max(4, pct)}%` }} />
      </div>

      <ul className="forge-step-list">
        {job.steps.map((step) => (
          <li key={step.id} className={step.status}>
            <span className="forge-dot">{step.status === 'done' ? '✓' : step.status === 'failed' ? '✕' : ''}</span>
            <div>
              <strong>{step.label}</strong>
              {step.detail && <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#6b7280' }}>{step.detail}</p>}
            </div>
          </li>
        ))}
      </ul>

      {job.status === 'done' && (
        <div style={{ marginTop: '1.5rem' }}>
          <Link to={`/forge/results/${job.id}`} className="forge-btn">
            Review {job.alternatives.length} alternatives →
          </Link>
        </div>
      )}
      {job.status === 'failed' && (
        <div style={{ marginTop: '1.5rem' }}>
          <Link to="/forge" className="forge-btn secondary">
            Revise brief
          </Link>
        </div>
      )}
    </>
  );
};
