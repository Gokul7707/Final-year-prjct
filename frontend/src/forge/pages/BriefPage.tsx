import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForgeStore } from '../store';
import type { DesignBrief } from '../types';

const APPS: { id: DesignBrief['application']; label: string }[] = [
  { id: 'racing', label: 'Racing' },
  { id: 'freestyle', label: 'Freestyle' },
  { id: 'cinema', label: 'Cinema' },
  { id: 'long-range', label: 'Long range' },
  { id: 'heavy-lift', label: 'Heavy lift' },
  { id: 'industrial', label: 'Industrial' },
];

const MATERIALS: DesignBrief['material'][] = ['carbon', 'hybrid', 'tpu', 'titanium'];
const MFG: DesignBrief['manufacturing'][] = ['3d-print', 'cnc', 'hybrid'];

const APP_FROM_CLASS: Record<string, DesignBrief['application']> = {
  'racing-fpv': 'racing',
  cinewhoop: 'cinema',
  photography: 'cinema',
  'heavy-lift': 'heavy-lift',
  industrial: 'industrial',
  custom: 'freestyle',
};

export const BriefPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const brief = useForgeStore((s) => s.brief);
  const setBrief = useForgeStore((s) => s.setBrief);
  const submitBrief = useForgeStore((s) => s.submitBrief);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  React.useEffect(() => {
    const cls = params.get('class');
    if (cls && APP_FROM_CLASS[cls]) setBrief({ application: APP_FROM_CLASS[cls] });
  }, [params, setBrief]);

  const launch = async () => {
    setBusy(true);
    setErr('');
    try {
      const id = await submitBrief();
      navigate(`/forge/pipeline/${id}`);
    } catch (e: any) {
      setErr(e?.message || 'Could not start job. Is the backend running?');
      setBusy(false);
    }
  };

  return (
    <>
      <h1 className="forge-h1">Design brief</h1>
      <p className="forge-sub">
        Phase 1: state mission constraints. The job planner scores whoop chassis options and OpenSCAD generates a
        real STL you can inspect and export.
      </p>

      <div className="forge-grid-2">
        <div className="forge-card">
          <span className="forge-label">Application</span>
          <div className="forge-chip-row">
            {APPS.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`forge-chip ${brief.application === a.id ? 'is-on' : ''}`}
                onClick={() => setBrief({ application: a.id })}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="forge-field-row">
            <label>
              <span className="forge-label">Payload (g)</span>
              <input
                className="forge-input"
                type="number"
                min={0}
                value={brief.payloadG}
                onChange={(e) => setBrief({ payloadG: Number(e.target.value) || 0 })}
              />
            </label>
            <label>
              <span className="forge-label">Flight time (min)</span>
              <input
                className="forge-input"
                type="number"
                min={1}
                value={brief.flightTimeMin}
                onChange={(e) => setBrief({ flightTimeMin: Number(e.target.value) || 1 })}
              />
            </label>
            <label>
              <span className="forge-label">Budget (₹)</span>
              <input
                className="forge-input"
                type="number"
                min={0}
                step={1000}
                value={brief.budgetInr}
                onChange={(e) => setBrief({ budgetInr: Number(e.target.value) || 0 })}
              />
            </label>
          </div>

          <span className="forge-label">Material</span>
          <div className="forge-chip-row">
            {MATERIALS.map((m) => (
              <button
                key={m}
                type="button"
                className={`forge-chip ${brief.material === m ? 'is-on' : ''}`}
                onClick={() => setBrief({ material: m })}
              >
                {m}
              </button>
            ))}
          </div>

          <span className="forge-label">Manufacturing</span>
          <div className="forge-chip-row">
            {MFG.map((m) => (
              <button
                key={m}
                type="button"
                className={`forge-chip ${brief.manufacturing === m ? 'is-on' : ''}`}
                onClick={() => setBrief({ manufacturing: m })}
              >
                {m}
              </button>
            ))}
          </div>

          <label>
            <span className="forge-label">Notes (optional)</span>
            <textarea
              className="forge-textarea"
              value={brief.notes}
              onChange={(e) => setBrief({ notes: e.target.value })}
              placeholder="Quiet ducts, crash durability…"
            />
          </label>

          {err && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{err}</p>}

          <button type="button" className="forge-btn" disabled={busy} onClick={launch}>
            {busy ? 'Starting job…' : 'Generate design →'}
          </button>
        </div>

        <aside className="forge-card">
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Phase 1 CAD loop</h2>
          <ol style={{ margin: 0, paddingLeft: '1.1rem', color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.7 }}>
            <li>Brief is stored on a typed job.</li>
            <li>Planner scores 2–3 whoop chassis options.</li>
            <li>OpenSCAD writes a real STL from brief params.</li>
            <li>Inspect loads the STL — success = “Design generated”.</li>
          </ol>
        </aside>
      </div>
    </>
  );
};
