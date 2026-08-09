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

const PROMPT_EXAMPLES = [
  'Octacopter for agricultural spraying, 2kg payload, long hover, durable arms',
  'Quiet ducted cinewhoop for indoor filming with landing gear',
  '5 inch freestyle racer under ₹25000, crash-resistant walls',
  'Long-range mapping quad, 450 class, 20+ minutes endurance',
];

export const BriefPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const brief = useForgeStore((s) => s.brief);
  const setBrief = useForgeStore((s) => s.setBrief);
  const submitBrief = useForgeStore((s) => s.submitBrief);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  React.useEffect(() => {
    const cls = params.get('class');
    if (cls && APP_FROM_CLASS[cls]) setBrief({ application: APP_FROM_CLASS[cls] });
  }, [params, setBrief]);

  const launch = async () => {
    if (!(brief.notes || '').trim()) {
      setErr('Write a mission prompt first — Gemini uses it to set motor count, layout, and CAD intent.');
      return;
    }
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
      <h1 className="forge-h1">Mission prompt</h1>
      <p className="forge-sub">
        Describe the aircraft you need. Gemini turns your words into CAD intent; headless Blender builds the
        mesh and the forge viewer shows it — no motor dropdowns first.
      </p>

      <div className="forge-grid-2">
        <div className="forge-card">
          <span className="forge-label">What should we build?</span>
          <textarea
            className="forge-textarea forge-prompt"
            value={brief.notes}
            onChange={(e) => setBrief({ notes: e.target.value })}
            placeholder="e.g. Octacopter for agriculture with 2kg spray payload, titanium-hybrid arms, outdoor landing gear…"
            rows={6}
          />

          <span className="forge-label">Try an example</span>
          <div className="forge-chip-row">
            {PROMPT_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                className="forge-chip"
                onClick={() => {
                  let application: DesignBrief['application'] = brief.application;
                  if (/octo|agricultur|spray/i.test(ex)) application = 'industrial';
                  else if (/cine|whoop|duct/i.test(ex)) application = 'cinema';
                  else if (/race|freestyle|5 inch/i.test(ex)) application = 'racing';
                  else if (/long-range|mapping|endurance/i.test(ex)) application = 'long-range';
                  setBrief({ notes: ex, application });
                }}
              >
                {ex.length > 42 ? `${ex.slice(0, 42)}…` : ex}
              </button>
            ))}
          </div>

          <span className="forge-label">Starting class (Gemini may override from the prompt)</span>
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

          <button
            type="button"
            className="forge-btn linkish"
            onClick={() => setShowAdvanced((v) => !v)}
            style={{ marginBottom: '0.75rem' }}
          >
            {showAdvanced ? 'Hide constraints ▲' : 'Payload, budget & manufacturing ▼'}
          </button>

          {showAdvanced && (
            <>
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
            </>
          )}

          {err && <p style={{ color: '#dc2626', fontSize: '0.85rem' }}>{err}</p>}

          <button type="button" className="forge-btn" disabled={busy} onClick={launch}>
            {busy ? 'Starting Gemini → Blender pipeline…' : 'Generate aircraft →'}
          </button>
        </div>

        <aside className="forge-card">
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>Pipeline (Phase 1)</h2>
          <ol style={{ margin: 0, paddingLeft: '1.1rem', color: '#4b5563', fontSize: '0.9rem', lineHeight: 1.7 }}>
            <li>
              <strong>Your prompt</strong> + constraints go to the job API.
            </li>
            <li>
              <strong>Gemini</strong> (your API key) returns CAD intent JSON — motor count, ducts, class — not
              random Python dumped into Blender’s console.
            </li>
            <li>
              Backend runs <strong>headless Blender</strong>:{' '}
              <code>blender -b -P generate_multirotor.py -- params.json</code>
            </li>
            <li>
              Blender writes <strong>STL + GLB</strong>; the Inspect page loads the mesh in the browser.
            </li>
            <li>You compare alternatives and export.</li>
          </ol>
          <p style={{ margin: '1rem 0 0', fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5 }}>
            Why not “Gemini writes bpy and pastes into the console”? That breaks silently, can’t run in Docker,
            and is unsafe. Intent JSON + a fixed parametric script is the reliable production path.
          </p>
        </aside>
      </div>
    </>
  );
};
