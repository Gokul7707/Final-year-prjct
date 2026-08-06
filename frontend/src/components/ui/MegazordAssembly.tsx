import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { ASSEMBLY_ORDER, type AssemblyPartId } from '@/data/quizFlow';

interface Props {
  attached: AssemblyPartId[];
  activePart?: AssemblyPartId | null;
  accent?: string;
}

const PART_OFFSETS: Record<AssemblyPartId, { x: number; y: number; from: { x: number; y: number } }> = {
  chassis: { x: 0, y: 0, from: { x: 0, y: -80 } },
  motors: { x: 0, y: 0, from: { x: -120, y: 40 } },
  battery: { x: 0, y: 8, from: { x: 0, y: 90 } },
  props: { x: 0, y: -4, from: { x: 110, y: -50 } },
  avionics: { x: 0, y: -6, from: { x: -90, y: -70 } },
  optics: { x: 0, y: -18, from: { x: 0, y: -100 } },
  shell: { x: 0, y: 0, from: { x: 100, y: 60 } },
};

function PartGlyph({ id, accent }: { id: AssemblyPartId; accent: string }) {
  switch (id) {
    case 'chassis':
      return (
        <g>
          <rect x="-28" y="-16" width="56" height="32" rx="6" fill="#1a1f26" stroke={accent} strokeWidth="2" />
          <line x1="-50" y1="-28" x2="-28" y2="-10" stroke="#2a3140" strokeWidth="6" />
          <line x1="50" y1="-28" x2="28" y2="-10" stroke="#2a3140" strokeWidth="6" />
          <line x1="-50" y1="28" x2="-28" y2="10" stroke="#2a3140" strokeWidth="6" />
          <line x1="50" y1="28" x2="28" y2="10" stroke="#2a3140" strokeWidth="6" />
        </g>
      );
    case 'motors':
      return (
        <g>
          {[
            [-50, -28],
            [50, -28],
            [-50, 28],
            [50, 28],
          ].map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r="10" fill="#12161c" stroke={accent} strokeWidth="2" />
              <circle cx={x} cy={y} r="3" fill={accent} />
            </g>
          ))}
        </g>
      );
    case 'battery':
      return <rect x="-18" y="2" width="36" height="14" rx="3" fill={accent} opacity="0.85" />;
    case 'props':
      return (
        <g opacity="0.9">
          {[
            [-50, -28],
            [50, -28],
            [-50, 28],
            [50, 28],
          ].map(([x, y], i) => (
            <ellipse
              key={i}
              cx={x}
              cy={y}
              rx="22"
              ry="4"
              fill="#c5ccd6"
              transform={`rotate(${i * 35} ${x} ${y})`}
            />
          ))}
        </g>
      );
    case 'avionics':
      return <rect x="-12" y="-10" width="24" height="12" rx="2" fill="#00d4c8" opacity="0.8" />;
    case 'optics':
      return (
        <g>
          <rect x="-8" y="-30" width="16" height="12" rx="2" fill="#2a3140" stroke={accent} />
          <circle cx="0" cy="-24" r="3" fill="#7dd3c7" />
        </g>
      );
    case 'shell':
      return (
        <path
          d="M-34,-20 Q0,-36 34,-20 L34,18 Q0,30 -34,18 Z"
          fill={accent}
          opacity="0.22"
          stroke={accent}
          strokeWidth="1.5"
        />
      );
    default:
      return null;
  }
}

export const MegazordAssembly: React.FC<Props> = ({
  attached,
  activePart = null,
  accent = '#F0A202',
}) => {
  const progress = attached.length / ASSEMBLY_ORDER.length;
  const lastPart = attached[attached.length - 1];
  const lastOffset = lastPart ? PART_OFFSETS[lastPart] : null;

  // Whole rig gives a physical "thunk" on each successful dock, without
  // remounting (and thus without replaying) the parts already locked in.
  const stageKick = useAnimation();
  const prevCount = useRef(attached.length);
  useEffect(() => {
    if (attached.length > prevCount.current) {
      stageKick.start({ scale: [1, 1.045, 0.99, 1] });
    }
    prevCount.current = attached.length;
  }, [attached.length, stageKick]);

  return (
    <div className="megazord-bay">
      <div className="megazord-hud">
        <span>ASSEMBLY BAY</span>
        <span>
          {attached.length}/{ASSEMBLY_ORDER.length} LOCKED
        </span>
      </div>

      <motion.div
        className="megazord-stage"
        animate={stageKick}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        <div className="megazord-ring" style={{ opacity: 0.35 + progress * 0.65 }} />
        <div className="megazord-pulse" style={{ borderColor: accent }} />

        <svg viewBox="-100 -80 200 160" className="megazord-svg">
          {lastOffset && (
            <motion.circle
              key={`impact-${attached.length}`}
              cx={lastOffset.x}
              cy={lastOffset.y}
              r={6}
              fill="none"
              stroke={accent}
              strokeWidth={2.5}
              initial={{ opacity: 0.85, scale: 0.4 }}
              animate={{ opacity: 0, scale: 6 }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{ transformOrigin: `${lastOffset.x}px ${lastOffset.y}px` }}
            />
          )}
          <AnimatePresence>
            {ASSEMBLY_ORDER.map((part) => {
              if (!attached.includes(part.id)) return null;
              const off = PART_OFFSETS[part.id];
              const isActive = activePart === part.id;
              return (
                <motion.g
                  key={part.id}
                  initial={{
                    opacity: 0,
                    x: off.from.x,
                    y: off.from.y,
                    scale: 1.6,
                    filter: 'blur(6px)',
                  }}
                  animate={{
                    opacity: 1,
                    x: off.x,
                    y: off.y,
                    scale: isActive ? 1.08 : 1,
                    filter: 'blur(0px)',
                  }}
                  transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                >
                  <PartGlyph id={part.id} accent={accent} />
                </motion.g>
              );
            })}
          </AnimatePresence>
        </svg>

        {attached.length === 0 && (
          <p className="megazord-empty">Answer the brief — modules dock like a megazord.</p>
        )}
      </motion.div>

      <ul className="megazord-rail">
        {ASSEMBLY_ORDER.map((part) => {
          const on = attached.includes(part.id);
          return (
            <li key={part.id} className={on ? 'on' : ''}>
              <span className="rail-icon">{part.icon}</span>
              <span>{part.label}</span>
              {on && <motion.span layoutId={`lock-${part.id}`} className="rail-lock" style={{ color: accent }}>LOCKED</motion.span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
