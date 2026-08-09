import React, { Suspense, lazy, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { DRONE_TYPES, type DroneClassId } from '@/data/droneTypes';
import { useSessionStore } from '@/store/sessionStore';
import { SilentErrorBoundary } from '@/components/ui/SilentErrorBoundary';
import { useTrackProgress } from '@/hooks/useTrackProgress';

const RotatingDroneRig = lazy(() =>
  import('@/components/3d/RotatingDroneRig').then((m) => ({ default: m.RotatingDroneRig }))
);

interface Chapter {
  id: string;
  droneId: DroneClassId | 'custom';
  word: string;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  bg: string;
  ink: string;
  accent: string;
}

/** Scene chapters — each is a full panel that physically travels past the drone. */
const CHAPTERS: Chapter[] = [
  {
    id: 'open',
    droneId: 'photography',
    word: 'GENESIS',
    kicker: 'Chassis Forge',
    title: 'Spin your mission',
    body: 'One airframe. Every sortie. Scroll as the chassis travels through the hangar.',
    cta: 'Start building',
    bg: '#1a095c',
    ink: '#f5d0c5',
    accent: '#ff6b1a',
  },
  {
    id: 'velocity',
    droneId: 'racing-fpv',
    word: 'VELOCITY',
    kicker: 'Speed Series',
    title: 'Gate-cutting race frames',
    body: 'High KV, freestyle geometry, FPV-ready mounts. Built for the next lap.',
    cta: 'Forge VX-Racer',
    bg: '#12061f',
    ink: '#ff4d3a',
    accent: '#ff6b1a',
  },
  {
    id: 'cinema',
    droneId: 'cinewhoop',
    word: 'CINEMA',
    kicker: 'Indoor Film',
    title: 'Whisper capture indoors',
    body: 'Quiet props, gimbal class lift, smooth hover for close-quarters glass.',
    cta: 'Forge CinePulse',
    bg: '#f5d0c5',
    ink: '#1a095c',
    accent: '#ff6b1a',
  },
  {
    id: 'imaging',
    droneId: 'photography',
    word: 'IMAGING',
    kicker: 'Aerial Stills',
    title: 'Stable glass. Flagship stills.',
    body: '450-class imaging chassis for landscape, survey, and commercial capture.',
    cta: 'Forge Aether 450',
    bg: '#0b2a4a',
    ink: '#e8f1ff',
    accent: '#3b99ff',
  },
  {
    id: 'cargo',
    droneId: 'heavy-lift',
    word: 'PAYLOAD',
    kicker: 'Heavy Lift',
    title: 'Redundant lift for field ops',
    body: 'Hex geometry, payload bay, logistics-ready arms when the mission gets heavy.',
    cta: 'Forge Atlas Hex',
    bg: '#2a1608',
    ink: '#ffd39a',
    accent: '#ff6b1a',
  },
  {
    id: 'enterprise',
    droneId: 'industrial',
    word: 'FORGE',
    kicker: 'Enterprise',
    title: 'Mission-critical endurance',
    body: 'Site inspection, long sorties, rugged octo frames for industrial work.',
    cta: 'Forge Octo',
    bg: '#0a1628',
    ink: '#c8d0da',
    accent: '#3b99ff',
  },
  {
    id: 'lineup',
    droneId: 'custom',
    word: 'YOURS',
    kicker: 'Independent',
    title: 'Five airframes. One forge.',
    body: 'Pick a series below — or write your own prompt and assemble from scratch.',
    cta: 'Create my own prompt',
    bg: '#f5d0c5',
    ink: '#1a095c',
    accent: '#ff6b1a',
  },
];

const EASE = [0.25, 1, 0.3, 1] as const;

/** Panel travel: current sits, next rises from below; previous exits upward. */
function panelTransform(i: number, progress: number, count: number) {
  const pos = progress * (count - 1);
  const delta = i - pos;
  // delta 0 = centered; +1 = one section below; -1 = one section above
  const yPercent = delta * 100;
  const opacity = Math.max(0, 1 - Math.abs(delta) * 0.85);
  return { yPercent, opacity, active: Math.abs(delta) < 0.55 };
}

const TornEdge: React.FC<{ fill: string }> = ({ fill }) => (
  <svg className="commercial-tear" viewBox="0 0 1440 140" preserveAspectRatio="none" aria-hidden>
    <path
      fill={fill}
      d="M0,62 C70,110 130,18 210,68 C290,118 350,28 430,72 C510,116 590,22 670,70 C750,118 830,30 910,74 C990,118 1070,26 1150,70 C1230,114 1310,34 1440,78 L1440,140 L0,140 Z"
    />
  </svg>
);

export const SelectPhase: React.FC = () => {
  const username = useSessionStore((s) => s.username);
  const logout = useSessionStore((s) => s.logout);
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const { progress, progressRef } = useTrackProgress(trackRef);

  const chapterCount = CHAPTERS.length;
  const rawIndex = progress * (chapterCount - 1);
  const index = Math.min(chapterCount - 1, Math.max(0, Math.round(rawIndex)));
  const chapter = CHAPTERS[index];
  const localT = rawIndex - Math.floor(rawIndex);

  /** Hangar look unchanged — CTA enters Phase 1 forge (brief → OpenSCAD STL). */
  const onCta = () => {
    navigate(`/forge?class=${encodeURIComponent(chapter.droneId || 'custom')}`);
  };

  return (
    <div className="commercial-shell">
      <nav className="commercial-nav">
        <button type="button" className="commercial-nav-link" onClick={logout}>
          Sign out
        </button>
        <div className="commercial-seal" aria-hidden>
          <span>G</span>
          <small>GENESIS · FORGE · BUILD</small>
        </div>
        <span className="commercial-nav-link commercial-pilot">Hi, {username}</span>
      </nav>

      <div className="commercial-track" ref={trackRef}>
        <div className="commercial-stage">
          {/* Traveling chapter panels — physically slide behind the drone */}
          <div className="commercial-panels" aria-hidden={false}>
            {CHAPTERS.map((ch, i) => {
              const { yPercent, opacity } = panelTransform(i, progress, chapterCount);
              return (
                <div
                  key={ch.id}
                  className="commercial-panel"
                  style={{
                    background: ch.bg,
                    color: ch.ink,
                    transform: `translate3d(0, ${yPercent}%, 0)`,
                    opacity: Math.max(0.15, opacity),
                    zIndex: 1 + i,
                  }}
                >
                  <div className="commercial-flecks" />
                  <div className="commercial-strokes" />
                  <h1 className="commercial-wordmark" style={{ color: ch.ink }}>
                    {ch.word}
                  </h1>
                  {i > 0 && (
                    <div className="commercial-tear-top">
                      <TornEdge fill={ch.bg} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Rising curtain accent between chapters (extra tear motion) */}
          <div
            className="commercial-curtain"
            style={{
              background: CHAPTERS[Math.min(chapterCount - 1, Math.floor(rawIndex) + 1)].bg,
              transform: `translate3d(0, ${(1 - localT) * 100}%, 0)`,
            }}
          >
            <div className="commercial-tear-top">
              <TornEdge
                fill={CHAPTERS[Math.min(chapterCount - 1, Math.floor(rawIndex) + 1)].bg}
              />
            </div>
          </div>

          {/* Full-viewport WebGL layer — no CSS box; travel happens inside Three.js */}
          <div className="commercial-drone-layer">
            <SilentErrorBoundary>
              <Suspense fallback={<div className="commercial-drone-fallback" />}>
                <RotatingDroneRig progress={progress} progressRef={progressRef} />
              </Suspense>
            </SilentErrorBoundary>
          </div>

          <div className="commercial-hud">
            <AnimatePresence mode="wait">
              <motion.div
                key={chapter.id}
                className="commercial-copy"
                style={{ color: chapter.ink }}
                initial={{ opacity: 0, y: 28, filter: 'blur(6px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, y: -18, filter: 'blur(4px)' }}
                transition={{ duration: 0.55, ease: EASE }}
              >
                <em className="commercial-kicker">{chapter.kicker}</em>
                <h2>{chapter.title}</h2>
                <p>{chapter.body}</p>
              </motion.div>
            </AnimatePresence>

            <motion.button
              type="button"
              className="commercial-cta"
              style={{ background: chapter.accent }}
              onClick={onCta}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              layout
              transition={{ duration: 0.35, ease: EASE }}
            >
              {chapter.cta}
            </motion.button>
          </div>

          <div className="commercial-chapters" aria-hidden>
            {CHAPTERS.map((c, i) => (
              <span
                key={c.id}
                className={`commercial-dot ${i === index ? 'on' : ''}`}
                style={{ background: i === index ? chapter.accent : undefined }}
              />
            ))}
          </div>

          <p className="commercial-scroll-hint" style={{ color: chapter.ink }}>
            Scroll — travel
          </p>
        </div>
      </div>

      <section className="commercial-lineup" aria-label="Pick an airframe">
        <div className="commercial-lineup-head">
          <em>The full lineup</em>
          <h3>Choose your chassis</h3>
        </div>
        <div className="commercial-lineup-row">
          {DRONE_TYPES.map((drone) => (
            <button
              key={drone.id}
              type="button"
              className="commercial-lineup-card"
              onClick={() => navigate(`/forge?class=${encodeURIComponent(drone.id)}`)}
            >
              <img src={drone.image} alt={drone.name} draggable={false} />
              <strong>{drone.name}</strong>
              <small>{drone.category}</small>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
