import { create } from 'zustand';
import type { DroneConfig, DroneSpecs } from '@/shared/types';
import {
  droneFrames,
  motors,
  batteries,
  propellers,
  escs,
  cameras,
  canopies,
  cameraHarnesses,
  whoops,
  frameColorOptions,
  motorColorOptions,
  propellerColorOptions,
  batteryColorOptions,
  escColorOptions,
  cameraHarnessColorOptions,
} from '@/shared/database';
import { calculateDroneSpecs } from '@/shared/calculator';

interface DroneStore {
  config: DroneConfig;
  specs: DroneSpecs;
  updateFrame: (frameId: string) => void;
  updateMotor: (motorId: string, index: number) => void;
  updateBattery: (batteryId: string) => void;
  updatePropeller: (propellerId: string, index: number) => void;
  updateESC: (escId: string, index: number) => void;
  updateCamera: (cameraId: string) => void;
  updateCanopy: (canopyId: string) => void;
  updateCameraHarness: (harnessId: string) => void;
  updateWhoop: (whoopId: string) => void;
  updateFrameColor: (colorId: string) => void;
  updateMotorColor: (colorId: string) => void;
  updatePropellerColor: (colorId: string) => void;
  updateBatteryColor: (colorId: string) => void;
  updateESCColor: (colorId: string) => void;
  updateCameraHarnessColor: (colorId: string) => void;
  recalculateSpecs: () => void;
}

const defaultFrame = droneFrames.find((f) => f.id === 'frame-none') || droneFrames[0];
const defaultMotor = motors.find((m) => m.id === 'motor-none') || motors[0];
const defaultBattery = batteries.find((b) => b.id === 'battery-none') || batteries[0];
const defaultPropeller = propellers.find((p) => p.id === 'prop-none') || propellers[0];
const defaultESC = escs.find((e) => e.id === 'esc-none') || escs[0];
const defaultCamera = cameras.find((c) => c.id === 'camera-none') || cameras[0];
const defaultCanopy = canopies.find((c) => c.id === 'canopy-none') || canopies[0];
const defaultHarness = cameraHarnesses.find((h) => h.id === 'harness-standard') || cameraHarnesses[0];
const defaultWhoop = whoops.find((w) => w.id === 'whoop-none') || whoops[0];

const defaultFrameColor = frameColorOptions[0]?.id || 'frame-blue';
const defaultMotorColor = motorColorOptions[0]?.id || 'motor-gold';
const defaultPropellerColor = propellerColorOptions[0]?.id || 'prop-cobalt';
const defaultBatteryColor = batteryColorOptions[0]?.id || 'bat-aqua';
const defaultESCColor = escColorOptions[0]?.id || 'esc-neon';
const defaultCameraHarnessColor = cameraHarnessColorOptions[0]?.id || 'harness-graphite';

const defaultConfig: DroneConfig = {
  frame: defaultFrame,
  motors: [],
  battery: defaultBattery,
  propellers: [],
  escs: [],
  camera: defaultCamera,
  canopy: defaultCanopy,
  cameraHarness: defaultHarness,
  whoop: defaultWhoop,
  frameColorId: defaultFrameColor,
  motorColorId: defaultMotorColor,
  propellerColorId: defaultPropellerColor,
  batteryColorId: defaultBatteryColor,
  escColorId: defaultESCColor,
  cameraHarnessColorId: defaultCameraHarnessColor,
};

export const useDroneStore = create<DroneStore>((set, get) => ({
  config: defaultConfig,
  specs: calculateDroneSpecs(defaultConfig),

  updateFrame: (frameId: string) => {
    const frame = droneFrames.find((f) => f.id === frameId);
    if (!frame) return;

    set((state) => {
      const fillMotor = state.config.motors[0] || defaultMotor;
      const fillESC = state.config.escs[0] || defaultESC;

      const newConfig = {
        ...state.config,
        frame,
        motors: Array(frame.motorMounts).fill(fillMotor),
        escs: Array(frame.motorMounts).fill(fillESC),
      };

      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updateMotor: (motorId: string, index: number) => {
    const motor = motors.find((m) => m.id === motorId);
    if (!motor) return;

    set((state) => {
      const newMotors = [...state.config.motors];
      newMotors[index] = motor;
      const newConfig = { ...state.config, motors: newMotors };
      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updateBattery: (batteryId: string) => {
    const battery = batteries.find((b) => b.id === batteryId);
    if (!battery) return;

    set((state) => {
      const newConfig = { ...state.config, battery };
      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updatePropeller: (propellerId: string, index: number) => {
    const propeller = propellers.find((p) => p.id === propellerId);
    if (!propeller) return;

    set((state) => {
      const newPropellers = [...state.config.propellers];
      newPropellers[index] = propeller;
      const newConfig = { ...state.config, propellers: newPropellers };
      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updateESC: (escId: string, index: number) => {
    const esc = escs.find((e) => e.id === escId);
    if (!esc) return;

    set((state) => {
      const newESCs = [...state.config.escs];
      newESCs[index] = esc;
      const newConfig = { ...state.config, escs: newESCs };
      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updateCamera: (cameraId: string) => {
    const camera = cameras.find((c) => c.id === cameraId);
    if (!camera) return;

    set((state) => {
      const newConfig = { ...state.config, camera };
      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updateCanopy: (canopyId: string) => {
    const canopy = canopies.find((c) => c.id === canopyId);
    if (!canopy) return;

    set((state) => {
      const newConfig = { ...state.config, canopy };
      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updateCameraHarness: (harnessId: string) => {
    const harness = cameraHarnesses.find((h) => h.id === harnessId);
    if (!harness) return;

    set((state) => {
      const newConfig = { ...state.config, cameraHarness: harness };
      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updateWhoop: (whoopId: string) => {
    const whoop = whoops.find((w) => w.id === whoopId);
    if (!whoop) return;

    set((state) => {
      const newConfig = { ...state.config, whoop };
      return {
        config: newConfig,
        specs: calculateDroneSpecs(newConfig),
      };
    });
  },

  updateFrameColor: (colorId: string) => {
    set((state) => ({
      config: { ...state.config, frameColorId: colorId },
    }));
  },

  updateMotorColor: (colorId: string) => {
    set((state) => ({
      config: { ...state.config, motorColorId: colorId },
    }));
  },

  updatePropellerColor: (colorId: string) => {
    set((state) => ({
      config: { ...state.config, propellerColorId: colorId },
    }));
  },

  updateBatteryColor: (colorId: string) => {
    set((state) => ({
      config: { ...state.config, batteryColorId: colorId },
    }));
  },

  updateESCColor: (colorId: string) => {
    set((state) => ({
      config: { ...state.config, escColorId: colorId },
    }));
  },

  updateCameraHarnessColor: (colorId: string) => {
    set((state) => ({
      config: { ...state.config, cameraHarnessColorId: colorId },
    }));
  },

  recalculateSpecs: () => {
    set((state) => ({
      specs: calculateDroneSpecs(state.config),
    }));
  },
}));
