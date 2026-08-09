import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForgeStore } from '../store';
import { ChassisViewer } from '../ChassisViewer';

export const InspectPage: React.FC = () => {
  const { jobId, altId } = useParams();
  const job = useForgeStore((s) => s.job);
  const loadJob = useForgeStore((s) => s.loadJob);

  useEffect(() => {
    if (jobId && (!job || job.id !== jobId)) loadJob(jobId);
  }, [jobId, job, loadJob]);

  const alt = job?.alternatives.find((a) => a.id === altId);

  if (!job || !alt) {
    return (
      <div className="forge-empty">
        <p>Design not found.</p>
        <Link to="/forge" className="forge-btn">
          New brief
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="forge-h1">{alt.name}</h1>
      <p className="forge-sub">
        Generated chassis · {alt.chassisParams.wheelbaseMm}mm wheelbase · {alt.chassisParams.material} ·{' '}
        {alt.chassisParams.manufacturing}
      </p>

      <div className="forge-inspect">
        <div className="forge-stage">
          <div className="forge-stage-label">
            <span className="live-dot" style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#059669', marginRight: 8 }} />
            Drag to orbit · OpenSCAD STL
          </div>
          <ChassisViewer stlUrl={alt.stlUrl} />
          <p className="forge-stage-note">
            {alt.stlUrl ? alt.stlUrl : 'CAD did not produce an STL for this alternative.'}
          </p>
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="forge-card">
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Live specs
            </h3>
            <dl className="forge-specs">
              <dt>Weight</dt>
              <dd>{alt.specs.totalWeight} g</dd>
              <dt>Max thrust</dt>
              <dd>{alt.specs.maxThrust} g</dd>
              <dt>T/W</dt>
              <dd>{alt.specs.thrustToWeight}</dd>
              <dt>Hover</dt>
              <dd>{alt.specs.estimatedFlightTime} min</dd>
              <dt>Speed</dt>
              <dd>{alt.specs.maxSpeed} km/h</dd>
              <dt>Cost</dt>
              <dd>₹{alt.specs.buildCost.toLocaleString('en-IN')}</dd>
            </dl>
          </div>

          <div className="forge-card">
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Safety
            </h3>
            <div className="forge-safety">
              {alt.safety.map((s) => (
                <p key={s.title} className={s.severity}>
                  <strong>{s.title}</strong> — {s.detail}
                </p>
              ))}
            </div>
          </div>

          <div className="forge-card">
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Bill of materials
            </h3>
            {alt.bom.map((line) => (
              <div key={line.label} className="forge-bom-line">
                <span>{line.label}</span>
                <span style={{ color: '#2563eb' }}>{line.detail}</span>
                <span>₹{line.price.toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>

          <Link to={`/forge/export/${job.id}/${alt.id}`} className="forge-btn">
            Export STL + report →
          </Link>
          <Link to={`/forge/results/${job.id}`} className="forge-btn linkish">
            ← Back to alternatives
          </Link>
        </aside>
      </div>
    </>
  );
};
