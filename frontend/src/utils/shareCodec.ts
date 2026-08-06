import type { DroneConfig } from '@/shared/types';

export interface SharePayload {
  v: 1;
  id: string;
  user: string;
  classId: string | null;
  frameId: string;
  motorId: string;
  batteryId: string;
  propId: string;
  escId: string;
  cameraId: string;
  canopyId?: string;
  whoopId?: string;
  frameColorId: string;
  motorColorId: string;
  propellerColorId: string;
  batteryColorId: string;
  escColorId: string;
  cameraHarnessColorId: string;
}

export function configToShare(opts: {
  id: string;
  user: string;
  classId: string | null;
  config: DroneConfig;
}): SharePayload {
  return {
    v: 1,
    id: opts.id,
    user: opts.user,
    classId: opts.classId,
    frameId: opts.config.frame.id,
    motorId: opts.config.motors[0]?.id || 'motor-none',
    batteryId: opts.config.battery.id,
    propId: opts.config.propellers[0]?.id || 'prop-none',
    escId: opts.config.escs[0]?.id || 'esc-none',
    cameraId: opts.config.camera.id,
    canopyId: opts.config.canopy?.id,
    whoopId: opts.config.whoop?.id,
    frameColorId: opts.config.frameColorId,
    motorColorId: opts.config.motorColorId,
    propellerColorId: opts.config.propellerColorId,
    batteryColorId: opts.config.batteryColorId,
    escColorId: opts.config.escColorId,
    cameraHarnessColorId: opts.config.cameraHarnessColorId,
  };
}

export function encodeShare(payload: SharePayload): string {
  const json = JSON.stringify(payload);
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShare(token: string): SharePayload | null {
  try {
    let b64 = token.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const json = decodeURIComponent(escape(atob(b64)));
    const data = JSON.parse(json) as SharePayload;
    if (data.v !== 1 || !data.frameId) return null;
    return data;
  } catch {
    return null;
  }
}

export function buildViewerUrl(token: string): string {
  const base = window.location.href.split('#')[0].split('?')[0];
  return `${base}?view=${encodeURIComponent(token)}`;
}
