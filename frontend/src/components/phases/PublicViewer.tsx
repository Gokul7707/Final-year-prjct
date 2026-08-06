import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { decodeShare } from '@/utils/shareCodec';
import { useDroneStore } from '@/store/droneStore';

const DroneVisualizer = React.lazy(() =>
  import('@/components/3d/DroneVisualizer').then((m) => ({ default: m.DroneVisualizer }))
);

export const PublicViewer: React.FC<{ buildId: string }> = ({ buildId }) => {
  const config = useDroneStore((s) => s.config);
  const updateFrame = useDroneStore((s) => s.updateFrame);
  const updateMotor = useDroneStore((s) => s.updateMotor);
  const updateBattery = useDroneStore((s) => s.updateBattery);
  const updatePropeller = useDroneStore((s) => s.updatePropeller);
  const updateESC = useDroneStore((s) => s.updateESC);
  const updateCamera = useDroneStore((s) => s.updateCamera);
  const updateCanopy = useDroneStore((s) => s.updateCanopy);
  const updateWhoop = useDroneStore((s) => s.updateWhoop);
  const updateFrameColor = useDroneStore((s) => s.updateFrameColor);
  const updateMotorColor = useDroneStore((s) => s.updateMotorColor);
  const updatePropellerColor = useDroneStore((s) => s.updatePropellerColor);
  const updateBatteryColor = useDroneStore((s) => s.updateBatteryColor);
  const updateESCColor = useDroneStore((s) => s.updateESCColor);
  const updateCameraHarnessColor = useDroneStore((s) => s.updateCameraHarnessColor);

  const payload = useMemo(() => decodeShare(buildId), [buildId]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!payload) {
      setReady(true);
      return;
    }
    updateFrame(payload.frameId);
    updateMotor(payload.motorId, 0);
    updateBattery(payload.batteryId);
    updatePropeller(payload.propId, 0);
    updateESC(payload.escId, 0);
    updateCamera(payload.cameraId);
    if (payload.canopyId) updateCanopy(payload.canopyId);
    if (payload.whoopId) updateWhoop(payload.whoopId);
    updateFrameColor(payload.frameColorId);
    updateMotorColor(payload.motorColorId);
    updatePropellerColor(payload.propellerColorId);
    updateBatteryColor(payload.batteryColorId);
    updateESCColor(payload.escColorId);
    updateCameraHarnessColor(payload.cameraHarnessColorId);
    setReady(true);
  }, [payload]);

  return (
    <div className="phase-shell viewer-shell">
      <header className="viewer-top">
        <div>
          <p className="eyebrow">GENESIS · Shared orbit</p>
          <h1>360° Build Viewer</h1>
          <p className="select-sub">
            {payload?.user ? `Forged by ${payload.user}` : 'Live chassis preview'}
            {payload?.id ? ` · ${payload.id}` : ''}
          </p>
        </div>
        <a className="btn-signal" href={window.location.pathname}>
          Open Forge
        </a>
      </header>
      <motion.div className="export-viewer viewer-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="viewer-label">
          <span className="live-dot" />
          Drag to orbit · scroll to zoom
        </div>
        {ready && (
          <Suspense fallback={<div className="viewer-fallback" />}>
            <DroneVisualizer config={config} />
          </Suspense>
        )}
      </motion.div>
      {!payload && (
        <p className="viewer-warn">
          Could not decode this share link. Ask the pilot to re-export and scan the new QR.
        </p>
      )}
    </div>
  );
};
