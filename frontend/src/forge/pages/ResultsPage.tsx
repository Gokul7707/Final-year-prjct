import React, { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useForgeStore } from '../store';

export const ResultsPage: React.FC = () => {
  const { jobId } = useParams();
  const job = useForgeStore((s) => s.job);
  const loadJob = useForgeStore((s) => s.loadJob);
  const selectAlternative = useForgeStore((s) => s.selectAlternative);

  useEffect(() => {
    if (jobId && (!job || job.id !== jobId)) loadJob(jobId);
  }, [jobId, job, loadJob]);

  if (!job || job.id !== jobId || job.alternatives.length === 0) {
    return (
      <div className="forge-empty">
        <p>No alternatives yet.</p>
        <Link to="/forge" className="forge-btn">
          New brief
        </Link>
      </div>
    );
  }

  return (
    <>
      <h1 className="forge-h1">Design alternatives</h1>
      <p className="forge-sub">
        Compare scored chassis for <strong>{job.brief.application}</strong>. Specs and BOM update from the
        catalog + physics solver; STL comes from OpenSCAD.
      </p>

      <div className="forge-compare">
        {job.alternatives.map((alt, i) => {
          const flagged = alt.safety.filter((s) => s.severity !== 'pass');
          const bomTotal = alt.bom.reduce((s, l) => s + l.price, 0);
          return (
            <article key={alt.id} className={`forge-alt ${i === 0 ? 'is-top' : ''}`}>
              <header className="forge-alt-head">
                <div>
                  <div className="forge-price-line">
                    <span className="forge-price">₹{alt.specs.buildCost.toLocaleString('en-IN')}</span>
                    <span className="forge-eta">{alt.specs.estimatedFlightTime} min hover</span>
                  </div>
                  <h2>
                    {i === 0 ? '★ ' : ''}
                    {alt.name}
                  </h2>
                  <p>{alt.tagline}</p>
                </div>
                <div
                  className="forge-score"
                  style={{
                    color: alt.score >= 80 ? '#059669' : alt.score >= 60 ? '#d97706' : '#dc2626',
                  }}
                >
                  {alt.score}
                  <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>/100</span>
                </div>
              </header>

              <dl className="forge-specs forge-specs-dense">
                <dt>Axis</dt>
                <dd>{alt.chassisParams.motorMounts}</dd>
                <dt>Wheelbase</dt>
                <dd>{alt.chassisParams.wheelbaseMm} mm</dd>
                <dt>Cage Ø</dt>
                <dd>{alt.chassisParams.motorCageDiameter} mm</dd>
                <dt>Wall</dt>
                <dd>{alt.chassisParams.wallThickness} mm</dd>
                <dt>Weight</dt>
                <dd>{alt.specs.totalWeight} g</dd>
                <dt>Thrust</dt>
                <dd>{alt.specs.maxThrust} g</dd>
                <dt>T/W</dt>
                <dd>{alt.specs.thrustToWeight}</dd>
                <dt>Max speed</dt>
                <dd>{alt.specs.maxSpeed} km/h</dd>
                <dt>Hover</dt>
                <dd>{alt.specs.estimatedFlightTime} min</dd>
                <dt>STL</dt>
                <dd className={alt.stlUrl ? 'ok-text' : 'fail-text'}>{alt.stlUrl ? 'Ready' : 'Missing'}</dd>
              </dl>

              <div className="forge-bom-block">
                <h3>Bill of materials</h3>
                {alt.bom.map((line) => (
                  <div key={line.label} className="forge-bom-line">
                    <span>{line.label}</span>
                    <span className="forge-bom-name">{line.detail}</span>
                    <span>₹{line.price.toLocaleString('en-IN')}</span>
                  </div>
                ))}
                <div className="forge-bom-line forge-bom-total">
                  <span>Total</span>
                  <span />
                  <span>₹{bomTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="forge-safety">
                {flagged.length === 0 ? (
                  <p className="ok">✓ All compatibility checks pass</p>
                ) : (
                  flagged.slice(0, 3).map((s) => (
                    <p key={s.title} className={s.severity}>
                      {s.severity === 'fail' ? '✕' : '!'} {s.title}
                    </p>
                  ))
                )}
              </div>

              <p className="forge-why">{alt.justification}</p>

              <footer className="forge-alt-actions">
                <Link
                  to={`/forge/inspect/${job.id}/${alt.id}`}
                  className="forge-btn"
                  onClick={() => selectAlternative(alt.id)}
                >
                  Inspect STL →
                </Link>
                <Link
                  to={`/forge/export/${job.id}/${alt.id}`}
                  className="forge-btn linkish"
                  onClick={() => selectAlternative(alt.id)}
                >
                  Export
                </Link>
              </footer>
            </article>
          );
        })}
      </div>
    </>
  );
};
