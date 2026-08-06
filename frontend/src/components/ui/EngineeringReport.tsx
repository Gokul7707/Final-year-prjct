import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import type { DroneConfig } from '@/shared/types';
import { evaluateBuild } from '@/shared/constraints';

const STATUS_META = {
  ok: { label: 'All systems compatible', color: '#4ade80' },
  warnings: { label: 'Flyable with cautions', color: '#fbbf24' },
  critical: { label: 'Compatibility faults', color: '#f87171' },
} as const;

const SEVERITY_ICON = { pass: '✓', warn: '!', fail: '✕' } as const;
const SEVERITY_COLOR = { pass: '#4ade80', warn: '#fbbf24', fail: '#f87171' } as const;

interface BomLine {
  label: string;
  detail: string;
  price: number;
}

function bomLines(config: DroneConfig): BomLine[] {
  const lines: BomLine[] = [];
  const motorCount = config.motors.filter((m) => m && m.thrustMax > 0).length;
  if (config.frame?.price) lines.push({ label: 'Frame', detail: config.frame.name, price: config.frame.price });
  if (motorCount > 0 && config.motors[0])
    lines.push({
      label: `Motors ×${motorCount}`,
      detail: config.motors[0].name,
      price: config.motors.reduce((s, m) => s + (m?.price || 0), 0),
    });
  if (config.battery?.price) lines.push({ label: 'Battery', detail: config.battery.name, price: config.battery.price });
  const propPrice = config.propellers.reduce((s, p) => s + (p?.price || 0), 0) * 2;
  if (propPrice > 0 && config.propellers[0])
    lines.push({ label: 'Props (2 sets)', detail: config.propellers[0].name, price: propPrice });
  const escPrice = config.escs.reduce((s, e) => s + (e?.price || 0), 0);
  if (escPrice > 0 && config.escs[0])
    lines.push({ label: `ESC ×${config.escs.filter((e) => e && e.ampRating > 0).length}`, detail: config.escs[0].name, price: escPrice });
  if (config.camera?.price) lines.push({ label: 'Camera', detail: config.camera.name, price: config.camera.price });
  if (config.canopy?.price) lines.push({ label: 'Canopy', detail: config.canopy.name, price: config.canopy.price });
  if (config.cameraHarness?.price)
    lines.push({ label: 'Harness', detail: config.cameraHarness.name, price: config.cameraHarness.price });
  if (config.whoop?.price) lines.push({ label: 'Guards', detail: config.whoop.name, price: config.whoop.price });
  return lines;
}

export const EngineeringReport: React.FC<{ config: DroneConfig }> = ({ config }) => {
  const report = useMemo(() => evaluateBuild(config), [config]);
  const bom = useMemo(() => bomLines(config), [config]);
  const total = bom.reduce((s, l) => s + l.price, 0);
  const [showPasses, setShowPasses] = useState(false);

  const meta = STATUS_META[report.status];
  const flagged = report.checks.filter((c) => c.severity !== 'pass');
  const passes = report.checks.filter((c) => c.severity === 'pass');
  const visible = showPasses ? report.checks : flagged.length > 0 ? flagged : report.checks.slice(0, 3);

  return (
    <motion.div
      className="eng-report"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <div className="eng-report-head">
        <span className="eng-status-dot" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
        <div>
          <h3>Engineering report</h3>
          <p style={{ color: meta.color }}>{meta.label}</p>
        </div>
        {passes.length > 0 && flagged.length > 0 && (
          <button type="button" className="eng-toggle" onClick={() => setShowPasses((v) => !v)}>
            {showPasses ? 'Issues only' : `+${passes.length} passed`}
          </button>
        )}
      </div>

      <ul className="eng-checks">
        {visible.map((check) => (
          <li key={check.id} className={`eng-check eng-check--${check.severity}`}>
            <span className="eng-check-icon" style={{ color: SEVERITY_COLOR[check.severity] }}>
              {SEVERITY_ICON[check.severity]}
            </span>
            <div>
              <strong>{check.title}</strong>
              <p>{check.detail}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="eng-bom">
        <h4>Bill of materials</h4>
        {bom.map((line) => (
          <div key={line.label} className="eng-bom-line">
            <span className="eng-bom-label">{line.label}</span>
            <span className="eng-bom-detail">{line.detail}</span>
            <span className="eng-bom-price">₹{line.price.toLocaleString('en-IN')}</span>
          </div>
        ))}
        <div className="eng-bom-line eng-bom-total">
          <span className="eng-bom-label">Total</span>
          <span className="eng-bom-detail" />
          <span className="eng-bom-price">₹{total.toLocaleString('en-IN')}</span>
        </div>
      </div>
    </motion.div>
  );
};
