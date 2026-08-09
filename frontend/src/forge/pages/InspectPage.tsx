import React, { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { batteries, cameras, cameraHarnesses, canopies, droneFrames, escs, motors, propellers, whoops } from '@/shared/database';
import type { DroneConfig } from '@/shared/types';
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

  const droneConfig = useMemo<DroneConfig | undefined>(() => {
    if (!alt) return undefined;

    const frame = droneFrames.find((item) => item.id === alt.partIds.frameId) ?? droneFrames[1];
    const motor = motors.find((item) => item.id === alt.partIds.motorId) ?? motors[4];
    const battery = batteries.find((item) => item.id === alt.partIds.batteryId) ?? batteries[4];
    const propeller = propellers.find((item) => item.id === alt.partIds.propellerId) ?? propellers[10];
    const esc = escs.find((item) => item.id === alt.partIds.escId) ?? escs[4];
    const camera = cameras.find((item) => item.id === alt.partIds.cameraId) ?? cameras[2];
    const canopy = canopies.find((item) => item.id === alt.partIds.canopyId) ?? canopies[3];
    const cameraHarness = cameraHarnesses.find((item) => item.id === 'harness-standard') ?? cameraHarnesses[1];
    const whoop = whoops.find((item) => item.id === alt.partIds.whoopId) ?? whoops[1];

    return {
      frame,
      motors: [motor],
      battery,
      propellers: [propeller],
      escs: [esc],
      camera,
      canopy,
      cameraHarness,
      whoop,
      frameColorId: 'frame-blue',
      motorColorId: 'motor-gold',
      propellerColorId: 'prop-cobalt',
      batteryColorId: 'bat-aqua',
      escColorId: 'esc-neon',
      cameraHarnessColorId: 'harness-graphite',
    };
  }, [alt]);

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
      <section className="forge-card forge-card--elevated forge-hero-card forge-hero-card--brief" style={{ marginBottom: '1rem' }}>
        <div>
          <div className="forge-eyebrow">Inspector</div>
          <h1 className="forge-h1">{alt.name}</h1>
          <p className="forge-sub">
            {alt.stlUrl ? 'Design generated' : 'CAD pending'} · {alt.chassisParams.wheelbaseMm}mm whoop ·{' '}
            {alt.chassisParams.material} · {alt.chassisParams.manufacturing}
          </p>
          <div className="forge-pill-row">
            <span className="forge-pill">Live assembly</span>
            <span className="forge-pill">Configured parts</span>
            <span className="forge-pill">Export ready</span>
          </div>
        </div>
        <div className="forge-hero-visual forge-hero-visual--brief">
          <div className="forge-orb" />
          <div className="forge-ring" />
        </div>
      </section>

      <div className="forge-inspect">
        <div className="forge-stage">
          <div className="forge-stage-label">
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: alt.stlUrl ? '#059669' : '#d97706',
                marginRight: 8,
              }}
            />
            Drag to orbit · configured drone assembly
          </div>
          <ChassisViewer
            droneConfig={droneConfig}
            stlUrl={alt.stlUrl}
            wheelbaseMm={alt.chassisParams.wheelbaseMm}
            motorCount={alt.chassisParams.motorMounts}
          />
        </div>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="forge-card">
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Specs
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
