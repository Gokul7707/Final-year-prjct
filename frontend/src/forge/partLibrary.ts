import type { DesignApplication } from './types';

/**
 * Optional visual skins only (Sketchfab CC GLBs).
 * The versatile prompt-based chassis is OpenSCAD `cad/genesis/multirotor.scad` —
 * one parametric generator for every requirement (3/4/6/8 motors, size, ducts, gear).
 */
export const PARTS_ROOT = '/models/parts';

const AIRFRAMES: Record<DesignApplication | 'default', string> = {
  racing: `${PARTS_ROOT}/airframes/quad_consumer.glb`,
  freestyle: `${PARTS_ROOT}/airframes/quad_consumer.glb`,
  cinema: `${PARTS_ROOT}/airframes/quad_consumer.glb`,
  'long-range': `${PARTS_ROOT}/airframes/quad_consumer.glb`,
  'heavy-lift': `${PARTS_ROOT}/airframes/quad_consumer.glb`,
  industrial: `${PARTS_ROOT}/airframes/quad_consumer.glb`,
  default: `${PARTS_ROOT}/airframes/quad_consumer.glb`,
};

export function airframeUrlFor(application: DesignApplication): string {
  return AIRFRAMES[application] || AIRFRAMES.default;
}

export const PART_ATTRIBUTION = {
  title: 'Drone',
  author: 'Cafitz3D',
  license: 'CC-BY-4.0',
  url: 'https://sketchfab.com/3d-models/drone-2588b8a0917d474e97886763c98a65af',
} as const;
