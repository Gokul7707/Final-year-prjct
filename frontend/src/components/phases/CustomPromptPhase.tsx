import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ASSEMBLY_ORDER } from '@/data/quizFlow';
import { useSessionStore } from '@/store/sessionStore';
import { useDroneStore } from '@/store/droneStore';
import { MegazordAssembly } from '@/components/ui/MegazordAssembly';
import { droneFrames, motors, batteries, propellers, escs } from '@/shared/database';

interface ResolvedParts {
  frameId: string;
  motorId: string;
  batteryId: string;
  propellerId: string;
  escId: string;
  cameraId: string;
  canopyId: string;
  whoopId: string;
}

/**
 * Ask the backend LLM (/api/ai-build-drone, Gemini reasoning over the parts
 * catalog) to resolve the prompt. Returns null on any failure so the local
 * matcher can take over — the forge never blocks on the network.
 */
async function aiResolve(prompt: string): Promise<{ parts: Partial<ResolvedParts>; analysis: string } | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const res = await fetch('/api/ai-build-drone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const rec = data?.config?.recommendations;
    if (!rec) return null;

    const valid = (id: unknown, catalog: { id: string }[]) =>
      typeof id === 'string' && catalog.some((c) => c.id === id) ? id : undefined;

    const parts: Partial<ResolvedParts> = {
      frameId: valid(rec.frame, droneFrames),
      motorId: valid(Array.isArray(rec.motors) ? rec.motors[0] : rec.motors, motors),
      batteryId: valid(rec.battery, batteries),
      propellerId: valid(Array.isArray(rec.propellers) ? rec.propellers[0] : rec.propellers, propellers),
      escId: valid(Array.isArray(rec.escs) ? rec.escs[0] : rec.escs, escs),
    };
    if (!parts.frameId && !parts.motorId && !parts.batteryId) return null;
    return { parts, analysis: String(data?.config?.analysis || '') };
  } catch {
    return null;
  }
}

function inferFromPrompt(prompt: string) {
  const p = prompt.toLowerCase();
  let frameId = 'frame-quad-250';
  let motorId = 'motor-2204-2300kv';
  let batteryId = 'battery-1300-3s';
  let propellerId = 'prop-5045';
  let escId = 'esc-40a';
  let cameraId = 'camera-fpv-1';
  let canopyId = 'canopy-clear';
  let whoopId = 'whoop-none';

  if (p.includes('heavy') || p.includes('cargo') || p.includes('lift')) {
    frameId = 'frame-hexa-600';
    motorId = 'motor-5008-340kv';
    batteryId = 'battery-10000-6s';
    propellerId = 'prop-14inch';
    escId = 'esc-80a';
  } else if (p.includes('industrial') || p.includes('inspect') || p.includes('octo')) {
    frameId = 'frame-octo-800';
    motorId = 'motor-5008-340kv';
    batteryId = 'battery-10000-6s';
    propellerId = 'prop-12x50';
    escId = 'esc-80a';
  } else if (p.includes('photo') || p.includes('cinema') || p.includes('4k') || p.includes('film')) {
    frameId = 'frame-quad-450';
    motorId = 'motor-2312-1000kv';
    batteryId = 'battery-4250-6s';
    propellerId = 'prop-10x55';
    cameraId = 'camera-4k';
  } else if (p.includes('whoop') || p.includes('indoor') || p.includes('quiet')) {
    whoopId = 'whoop-ducted';
    propellerId = 'prop-6x35';
    canopyId = 'canopy-smoked';
  } else if (p.includes('race') || p.includes('freestyle') || p.includes('fpv')) {
    frameId = 'frame-quad-250';
    motorId = 'motor-2204-2300kv';
    cameraId = 'camera-fpv-1';
  }

  if (p.includes('long') || p.includes('endurance') || p.includes('hour')) {
    batteryId = 'battery-4250-6s';
  }
  if (p.includes('no camera') || p.includes('without camera')) {
    cameraId = 'camera-none';
  }

  return { frameId, motorId, batteryId, propellerId, escId, cameraId, canopyId, whoopId };
}

export const CustomPromptPhase: React.FC = () => {
  const setPhase = useSessionStore((s) => s.setPhase);
  const setCustomPrompt = useSessionStore((s) => s.setCustomPrompt);
  const attachPart = useSessionStore((s) => s.attachPart);
  const attachedParts = useSessionStore((s) => s.attachedParts);
  const finalizeBuild = useSessionStore((s) => s.finalizeBuild);
  const customPrompt = useSessionStore((s) => s.customPrompt);

  const {
    updateFrame,
    updateMotor,
    updateBattery,
    updatePropeller,
    updateESC,
    updateCamera,
    updateCanopy,
    updateWhoop,
  } = useDroneStore();

  const [text, setText] = useState(customPrompt);
  const [forging, setForging] = useState(false);
  const [forgeStatus, setForgeStatus] = useState('');

  const forge = async () => {
    if (text.trim().length < 12) return;
    setForging(true);
    setCustomPrompt(text.trim());

    // Local inference always provides the full baseline (incl. camera/shell);
    // the LLM overrides the engineering parts it reasoned about.
    setForgeStatus('Consulting forge AI…');
    const local = inferFromPrompt(text);
    const ai = await aiResolve(text.trim());
    const resolved: ResolvedParts = { ...local };
    if (ai) {
      Object.entries(ai.parts).forEach(([key, value]) => {
        if (value) (resolved as unknown as Record<string, string>)[key] = value;
      });
      setForgeStatus('AI spec locked — assembling…');
    } else {
      setForgeStatus('Offline inference — assembling…');
    }

    // Megazord dock sequence
    for (let i = 0; i < ASSEMBLY_ORDER.length; i++) {
      const part = ASSEMBLY_ORDER[i];
      await new Promise((r) => setTimeout(r, 380));
      attachPart(part.id);
      // Apply corresponding hardware as parts dock
      if (part.id === 'chassis') updateFrame(resolved.frameId);
      if (part.id === 'motors') updateMotor(resolved.motorId, 0);
      if (part.id === 'battery') updateBattery(resolved.batteryId);
      if (part.id === 'props') updatePropeller(resolved.propellerId, 0);
      if (part.id === 'avionics') updateESC(resolved.escId, 0);
      if (part.id === 'optics') updateCamera(resolved.cameraId);
      if (part.id === 'shell') {
        updateCanopy(resolved.canopyId);
        updateWhoop(resolved.whoopId);
      }
    }

    await new Promise((r) => setTimeout(r, 500));
    finalizeBuild();
    setForging(false);
  };

  return (
    <div className="phase-shell quiz-shell">
      <header className="quiz-header">
        <button type="button" className="ghost-btn" onClick={() => setPhase('select')} disabled={forging}>
          ← Hangar
        </button>
        <div>
          <p className="eyebrow">Independent mode</p>
          <h2>Create my own prompt</h2>
        </div>
        <div />
      </header>

      <div className="quiz-layout">
        <div className="quiz-panel custom-panel">
          <h3 className="quiz-q">Describe the chassis you need</h3>
          <p className="quiz-sub">
            Wheelbase, voltage (4S/6S), motor KV, prop size, ESC amps, camera, and protection — we map it to a printable
            frame.
          </p>
          <textarea
            className="custom-textarea"
            rows={8}
            value={text}
            disabled={forging}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. 5-inch freestyle chassis, 6S, mid-KV 2207 motors, 5×4.3 props, 45A ESC, FPV + HD, open carbon frame…"
          />
          <div className="custom-actions">
            <motion.button
              type="button"
              className="btn-signal"
              disabled={forging || text.trim().length < 12}
              onClick={forge}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {forging ? forgeStatus || 'Assembling megazord…' : 'Forge from prompt →'}
            </motion.button>
            <span className="char-count">{text.trim().length} chars</span>
          </div>
        </div>

        <MegazordAssembly attached={attachedParts} accent="#C47A12" />
      </div>
    </div>
  );
};
