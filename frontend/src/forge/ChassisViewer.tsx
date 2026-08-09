import React from 'react';
import type { DroneConfig } from '@/shared/types';
import { DroneVisualizer } from '@/components/3d/DroneVisualizer';

type Props = {
  droneConfig?: DroneConfig;
  stlUrl?: string | null;
  wheelbaseMm?: number;
  motorCount?: number;
};

export const ChassisViewer: React.FC<Props> = ({ droneConfig }) => {
  if (!droneConfig) {
    return (
      <div className="forge-empty" style={{ minHeight: 480 }}>
        <p>No configured drone available for this alternative yet.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
      <DroneVisualizer config={droneConfig} isFlying={false} />
    </div>
  );
};
