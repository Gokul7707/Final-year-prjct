import React, { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/store/sessionStore';
import { useDroneStore } from '@/store/droneStore';
import { DRONE_TYPES } from '@/data/droneTypes';
import { generateChassisSTL, downloadSTL, tryServerSTL } from '@/utils/stlExport';
import { buildViewerUrl, configToShare, encodeShare } from '@/utils/shareCodec';
import { loadBuildHistory, saveBuildToHistory, type BuildHistoryEntry } from '@/utils/buildHistory';
import { SpecsDisplay } from '@/components/ui/SpecsDisplay';
import { EngineeringReport } from '@/components/ui/EngineeringReport';
import { SilentErrorBoundary } from '@/components/ui/SilentErrorBoundary';

const RotatingDroneRig = lazy(() =>
  import('@/components/3d/RotatingDroneRig').then((m) => ({ default: m.RotatingDroneRig }))
);

const HologramPanel = lazy(() =>
  import('@/components/3d/HologramPanel').then((m) => ({ default: m.HologramPanel }))
);

function qrUrl(data: string, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=1a095c&color=f5d0c5&margin=10`;
}

export const ExportPhase: React.FC = () => {
  const username = useSessionStore((s) => s.username);
  const buildId = useSessionStore((s) => s.buildId);
  const selectedClass = useSessionStore((s) => s.selectedClass);
  const resetBuild = useSessionStore((s) => s.resetBuild);
  const setPhase = useSessionStore((s) => s.setPhase);
  const { config, specs } = useDroneStore();

  const [stlStatus, setStlStatus] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const [stlSource, setStlSource] = useState<'server' | 'local' | null>(null);

  const drone = DRONE_TYPES.find((d) => d.id === selectedClass);
  const shareToken = useMemo(() => {
    const payload = configToShare({
      id: buildId || 'preview',
      user: username,
      classId: selectedClass,
      config,
    });
    return encodeShare(payload);
  }, [buildId, username, selectedClass, config]);
  const viewerUrl = useMemo(() => buildViewerUrl(shareToken), [shareToken]);

  const [history, setHistory] = useState<BuildHistoryEntry[]>(() => loadBuildHistory());

  useEffect(() => {
    if (!buildId) return;
    setHistory(
      saveBuildToHistory({
        id: buildId,
        user: username,
        name: drone?.name || 'Custom Forge',
        createdAt: new Date().toISOString(),
        cost: specs.buildCost,
        weight: specs.totalWeight,
        token: shareToken,
      })
    );
  }, [buildId, username, drone?.name, specs.buildCost, specs.totalWeight, shareToken]);

  const pastBuilds = history.filter((h) => h.id !== buildId);

  const handleSTL = async () => {
    setStlStatus('working');
    const name = drone?.name || 'CustomForge';
    const server = await tryServerSTL(selectedClass === 'cinewhoop' ? '65mm' : '75mm');
    if (server) {
      downloadSTL(server, `${name}-${buildId}.stl`);
      setStlSource('server');
      setStlStatus('done');
      return;
    }
    const local = generateChassisSTL({
      name,
      armLength: config.frame.armLength || 250,
      motorMounts: config.frame.motorMounts || 4,
    });
    downloadSTL(local, `${name}-${buildId}-chassis.stl`);
    setStlSource('local');
    setStlStatus('done');
  };

  return (
    <div className="forge-shell export-forge">
      <div className="forge-frame" aria-hidden />
      <div className="forge-flecks" aria-hidden />

      <header className="export-forge-header">
        <div>
          <p className="eyebrow">Build complete · {username}</p>
          <h2>Your forge is locked</h2>
          <p className="export-forge-sub">
            {drone?.name || 'Custom Forge'} · ID {buildId}
          </p>
        </div>
        <div className="export-forge-nav">
          <button type="button" className="forge-ghost" onClick={resetBuild}>
            New build
          </button>
          <button type="button" className="forge-ghost" onClick={() => setPhase('select')}>
            Hangar
          </button>
        </div>
      </header>

      <div className="export-forge-grid">
        <motion.div
          className="export-forge-viewer"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 1, 0.3, 1] }}
        >
          <div className="viewer-label">
            <span className="live-dot" />
            Drag to orbit · full product preview
          </div>
          <h1 className="export-forge-word" aria-hidden>
            LOCKED
          </h1>
          <div className="export-forge-drone">
            <SilentErrorBoundary>
              <Suspense fallback={<div className="commercial-drone-fallback" />}>
                <RotatingDroneRig mode="orbit" span={1.55} />
              </Suspense>
            </SilentErrorBoundary>
          </div>
        </motion.div>

        <div className="export-forge-side">
          <SpecsDisplay specs={specs} />

          <EngineeringReport config={config} />

          <SilentErrorBoundary>
            <Suspense fallback={null}>
              <HologramPanel pilot={username} />
            </Suspense>
          </SilentErrorBoundary>

          <div className="qr-panel forge-qr">
            <div>
              <h3>Scan for 360° on any device</h3>
              <p>Open the QR on a phone — same build, full orbit viewer, no login.</p>
              <code className="viewer-link">{viewerUrl}</code>
            </div>
            <img
              className="qr-img"
              src={qrUrl(viewerUrl)}
              alt="QR code to view drone in 360"
              width={220}
              height={220}
            />
          </div>

          <div className="export-actions">
            <motion.button
              type="button"
              className="commercial-cta"
              onClick={handleSTL}
              disabled={stlStatus === 'working'}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {stlStatus === 'working'
                ? 'Generating STL…'
                : stlStatus === 'done'
                  ? `Downloaded (${stlSource}) ✓`
                  : 'Download STL for 3D print'}
            </motion.button>
            <p className="stl-note">
              Prefers OpenSCAD server chassis when available; otherwise exports a printable parametric plate.
            </p>
          </div>

          {pastBuilds.length > 0 && (
            <div className="hangar-log">
              <h4>Hangar log · previous builds</h4>
              {pastBuilds.map((b) => (
                <a key={b.id} className="hangar-log-row" href={buildViewerUrl(b.token)} target="_blank" rel="noreferrer">
                  <span className="hangar-log-name">{b.name}</span>
                  <span className="hangar-log-meta">
                    {new Date(b.createdAt).toLocaleDateString()} · {b.weight}g · ₹{b.cost.toLocaleString('en-IN')}
                  </span>
                  <span className="hangar-log-open">360° →</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
