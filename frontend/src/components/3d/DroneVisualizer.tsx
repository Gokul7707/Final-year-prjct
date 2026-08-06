import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { DroneConfig } from '@/shared/types';
import {
  frameColorOptions,
  motorColorOptions,
  propellerColorOptions,
  batteryColorOptions,
  escColorOptions,
  cameraHarnessColorOptions,
} from '@/shared/database';

interface DroneVisualizerProps {
  config: DroneConfig;
  isFlying?: boolean;
}

export const DroneVisualizer: React.FC<DroneVisualizerProps> = ({ config, isFlying = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const droneGroupRef = useRef<THREE.Group | null>(null);
  const wheelRotationsRef = useRef<THREE.Group[]>([]);
  const whoopGuardsRef = useRef<THREE.Group[]>([]);
  const canopyMeshRef = useRef<THREE.Group | null>(null);
  const canopyMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const cameraMountGroupRef = useRef<THREE.Group | null>(null);
  const cameraBodyMeshRef = useRef<THREE.Mesh | null>(null);
  const cameraLensMeshRef = useRef<THREE.Mesh | null>(null);
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const armMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const batteryMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const escMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const animationIdRef = useRef<number>(0);
  const isFlyingRef = useRef<boolean>(isFlying);
  const ledMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const motorMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const bladeMaterialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const dynamicSpinFactorRef = useRef<number>(1);
  const orbitRef = useRef<{ yaw: number; pitch: number; distance: number }>({
    yaw: Math.PI * 0.35,
    pitch: 0.18,
    distance: 220,
  });
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastInteractionAtRef = useRef<number>(Date.now());

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const getColorHex = (
    options: { id: string; colorHex: number }[],
    id: string,
    fallback: number
  ) => options.find((o) => o.id === id)?.colorHex ?? fallback;

  useEffect(() => {
    isFlyingRef.current = isFlying;
  }, [isFlying]);

  // Update "part dynamics" (propeller/motor/battery look + spin rate)
  // without rebuilding the whole Three.js scene.
  useEffect(() => {
    const motor = config.motors?.[0];
    const prop = config.propellers?.[0];
    const battery = config.battery;
    const canopy = config.canopy;
    const harness = config.cameraHarness;
    const whoop = config.whoop;

    const frameSize = config.frame.armLength > 0 ? Math.min(config.frame.armLength / 80, 60) : 30;

    const frameColorHex = getColorHex(frameColorOptions, config.frameColorId, 0x1d4ed8);
    const motorColorHex = getColorHex(motorColorOptions, config.motorColorId, 0xf59e0b);
    const propellerColorHex = getColorHex(propellerColorOptions, config.propellerColorId, 0x2563eb);
    const batteryColorHex = getColorHex(batteryColorOptions, config.batteryColorId, 0x22d3ee);
    const escColorHex = getColorHex(escColorOptions, config.escColorId, 0x22c55e);
    const harnessColorHex = getColorHex(cameraHarnessColorOptions, config.cameraHarnessColorId, 0x1f2937);

    const motorKV = motor?.kv ?? 0;
    const propDiameterIn = prop?.diameter ?? 0;
    const propPitchIn = prop?.pitch ?? 0;
    const batteryCells = battery?.cells ?? 0;

    const kvFactor = motorKV > 0 ? clamp(motorKV / 340, 0.2, 2.2) : 0.35;
    const diameterFactor = propDiameterIn > 0 ? clamp(propDiameterIn / 5, 0.2, 2.0) : 0.45;
    const spinFactor = clamp(0.35 + (kvFactor * 0.6 + diameterFactor * 0.4) * 0.75, 0.2, 2.8);
    dynamicSpinFactorRef.current = spinFactor;

    // Scale the spinning propeller groups to reflect chosen prop size.
    const wheelScale = clamp(propDiameterIn > 0 ? propDiameterIn / 5 : 1, 0.7, 1.7);
    wheelRotationsRef.current.forEach((g) => g.scale.setScalar(wheelScale));

    // LED brightness depends on battery cells.
    if (ledMaterialRef.current) {
      const intensity = 1.5 + clamp(batteryCells / 6, 0, 1) * 4.5;
      ledMaterialRef.current.emissiveIntensity = intensity;
      ledMaterialRef.current.color.setHex(batteryColorHex);
      ledMaterialRef.current.emissive.setHex(batteryColorHex);
    }

    // Motor material glow depends on KV (more KV => more "heat" glow).
    const motorGlow = 0.8 + kvFactor * 1.6;
    motorMaterialsRef.current.forEach((m) => {
      m.color.setHex(motorColorHex);
      m.emissiveIntensity = motorGlow;
      m.emissive.setHex(motorColorHex);
    });

    // Blade color + pitch tilt depend on propeller selection.
    bladeMaterialsRef.current.forEach((m) => m.color.setHex(propellerColorHex));

    // Use pitch to slightly change blade tilt.
    const pitchTilt = propPitchIn > 0 ? clamp(propPitchIn / 4.5, 0.6, 1.4) : 1;
    wheelRotationsRef.current.forEach((spinGroup) => {
      spinGroup.children.forEach((child) => {
        if ((child as any).isMesh) {
          (child as THREE.Mesh).rotation.z = 0.12 + (pitchTilt - 1) * 0.12;
        }
      });
    });

    // Canopy visuals (octagonal canopy + mounting rings)
    if (canopyMeshRef.current && canopyMaterialRef.current) {
      const visible = (canopy?.style ?? 'NONE') !== 'NONE' && (canopy?.opacity ?? 0) > 0;
      canopyMeshRef.current.visible = visible;
      canopyMaterialRef.current.transparent = true;
      canopyMaterialRef.current.opacity = visible ? (canopy?.opacity ?? 0.8) : 0;
      if (visible) {
        canopyMaterialRef.current.color.setHex(canopy?.colorHex ?? 0x60a5fa);
        canopyMaterialRef.current.emissive.setHex((canopy?.colorHex ?? 0x60a5fa) & 0xffffff);
        canopyMaterialRef.current.emissiveIntensity = 1.2 + clamp(((canopy?.opacity ?? 0.8) - 0.4) * 2, 0, 2.2);
      }
    }

    // Frame/battery/ESC visuals (tint)
    if (bodyMaterialRef.current) {
      bodyMaterialRef.current.color.setHex(frameColorHex);
      bodyMaterialRef.current.emissive.setHex(frameColorHex);
      bodyMaterialRef.current.emissiveIntensity = 0.35;
    }
    armMaterialsRef.current.forEach((m, idx) => {
      const base = new THREE.Color(frameColorHex);
      // Tiny per-arm variation for a premium look.
      const t = idx % 2 === 0 ? 1 : 0.92;
      m.color.setHex(base.multiplyScalar(t).getHex());
    });

    if (batteryMaterialRef.current) {
      batteryMaterialRef.current.color.setHex(batteryColorHex);
      batteryMaterialRef.current.emissive.setHex(batteryColorHex);
      batteryMaterialRef.current.emissiveIntensity = 0.6 + clamp(batteryCells / 6, 0, 1) * 1.2;
    }

    escMaterialsRef.current.forEach((m) => {
      m.color.setHex(escColorHex);
      m.emissive.setHex(escColorHex);
      m.emissiveIntensity = 0.5 + kvFactor * 0.8;
    });

    // Camera harness color tint (independent from harness style)
    if (cameraBodyMeshRef.current) {
      const mat = cameraBodyMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.color.setHex(harnessColorHex);
        mat.emissive.setHex(harnessColorHex);
        mat.emissiveIntensity = 0.25;
      }
    }
    if (cameraLensMeshRef.current) {
      const mat = cameraLensMeshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissive.setHex(harnessColorHex);
        mat.emissiveIntensity = 1.0;
      }
    }

    // Camera harness visuals (scale + positioning)
    if (cameraBodyMeshRef.current && cameraLensMeshRef.current && cameraMountGroupRef.current) {
      const style = harness?.style ?? 'STANDARD';

      // Base positions from the original geometry.
      const baseCamPos = { x: 0, y: -frameSize * 0.3, z: frameSize * 0.5 };
      const baseLensPos = { x: 0, y: -frameSize * 0.3, z: frameSize * 0.78 };

      let scale = 1;
      let camPos = { ...baseCamPos };
      let lensPos = { ...baseLensPos };
      if (style === 'COMPACT') {
        scale = 0.78;
        camPos = { x: 0, y: -frameSize * 0.26, z: frameSize * 0.44 };
        lensPos = { x: 0, y: -frameSize * 0.26, z: frameSize * 0.69 };
      } else if (style === 'PRO') {
        scale = 1.12;
        camPos = { x: 0, y: -frameSize * 0.36, z: frameSize * 0.56 };
        lensPos = { x: 0, y: -frameSize * 0.36, z: frameSize * 0.88 };
      }

      cameraMountGroupRef.current.visible = (config.camera?.type ?? 'NONE') !== 'NONE';
      cameraBodyMeshRef.current.scale.set(scale, scale, scale);
      cameraLensMeshRef.current.scale.set(scale * 0.92, scale * 0.92, scale * 0.92);
      cameraBodyMeshRef.current.position.set(camPos.x, camPos.y, camPos.z);
      cameraLensMeshRef.current.position.set(lensPos.x, lensPos.y, lensPos.z);
    }

    // Whoop guard visuals (SCAD-ish ducted cage around props)
    if (whoopGuardsRef.current.length > 0) {
      const show = (whoop?.style ?? 'NONE') !== 'NONE';
      const scale = whoop?.style === 'DUCTED' ? 1.25 : whoop?.style === 'WHOOP' ? 1 : 0;

      whoopGuardsRef.current.forEach((guardGroup) => {
        guardGroup.visible = show;
        guardGroup.scale.setScalar(scale);

        guardGroup.traverse((obj: any) => {
          if (!obj?.isMesh) return;
          const mat = obj.material as THREE.MeshStandardMaterial;
          if (!mat) return;
          mat.transparent = true;
          mat.opacity = show ? (whoop?.opacity ?? 0.7) : 0;
          mat.color.setHex(whoop?.colorHex ?? 0x60a5fa);
          mat.emissive.setHex(whoop?.colorHex ?? 0x60a5fa);
          mat.emissiveIntensity = show ? 1.8 : 0;
        });
      });
    }
  }, [
    config.frame.id,
    config.camera?.type,
    config.motors?.[0]?.id,
    config.propellers?.[0]?.id,
    config.battery?.id,
    config.canopy?.id,
    config.cameraHarness?.id,
    config.whoop?.id,
    config.frameColorId,
    config.motorColorId,
    config.propellerColorId,
    config.batteryColorId,
    config.escColorId,
    config.cameraHarnessColorId,
  ]);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1e);
    scene.fog = new THREE.Fog(0x0a0f1e, 300, 800);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.05,
      2000
    );
    camera.position.set(0, 120, 200);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    scene.add(new THREE.AmbientLight(0x334466, 0.8));

    const dirLight = new THREE.DirectionalLight(0x6699ff, 1.2);
    dirLight.position.set(100, 200, 100);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x0088ff, 1.5, 300);
    pointLight1.position.set(-100, 100, 0);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff4400, 1.0, 200);
    pointLight2.position.set(100, 50, 100);
    scene.add(pointLight2);

    // Grid floor
    const gridHelper = new THREE.GridHelper(600, 30, 0x1a3a6a, 0x0d1f3a);
    gridHelper.position.y = -60;
    scene.add(gridHelper);

    // Drone group
    const droneGroup = new THREE.Group();
    scene.add(droneGroup);
    droneGroupRef.current = droneGroup;
    wheelRotationsRef.current = [];
    whoopGuardsRef.current = [];
    motorMaterialsRef.current = [];
    bladeMaterialsRef.current = [];
    ledMaterialRef.current = null;
    dynamicSpinFactorRef.current = 1;
    armMaterialsRef.current = [];
    escMaterialsRef.current = [];
    bodyMaterialRef.current = null;
    batteryMaterialRef.current = null;

    const numMotors = Math.max(config.frame.motorMounts || 0, config.motors.length || 0, 4);
    const frameSize = config.frame.armLength > 0 ? Math.min(config.frame.armLength / 80, 60) : 30;

    // Central body
    const bodyGeo = new THREE.BoxGeometry(frameSize * 0.8, frameSize * 0.3, frameSize * 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: getColorHex(frameColorOptions, config.frameColorId, 0x1d4ed8),
      metalness: 0.9,
      roughness: 0.1,
      emissive: getColorHex(frameColorOptions, config.frameColorId, 0x1d4ed8),
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.castShadow = true;
    droneGroup.add(body);
    bodyMaterialRef.current = bodyMat;

    // Battery block (helps visualize battery color customization)
    const batteryGeo = new THREE.BoxGeometry(frameSize * 0.55, frameSize * 0.12, frameSize * 0.28);
    const batteryMat = new THREE.MeshStandardMaterial({
      color: getColorHex(batteryColorOptions, config.batteryColorId, 0x22d3ee),
      metalness: 0.25,
      roughness: 0.55,
      emissive: getColorHex(batteryColorOptions, config.batteryColorId, 0x22d3ee),
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.95,
    });
    const batteryMesh = new THREE.Mesh(batteryGeo, batteryMat);
    batteryMesh.position.set(0, frameSize * 0.08, frameSize * 0.02);
    droneGroup.add(batteryMesh);
    batteryMaterialRef.current = batteryMat;

    // SCAD-inspired canopy (parametric octagonal footprint + dome cap)
    // Notes:
    // - SCAD uses mm; our scene uses an approximate mm->unit mapping (frameSize ~= armLength/80).
    // - We use a single shared material instance so opacity/color updates stay smooth.
    const mmToUnit = 1 / 80;
    const canopy_z_height = 20; // mm
    const canopy_xyz_thickness = 2; // mm
    const canopy_mounting_hole_xy_pitch = 26; // mm
    const canopy_mounting_ring_xy_diameter = 5; // mm
    const canopy_mounting_hole_xy_diameter = 2; // mm
    const canopy_antenna_hole_xy_diameter = 2; // mm
    const camera_mount_x_width = 14; // mm
    const camera_mount_x_thickness = 2; // mm

    const canopy_xyz_thickness_u = canopy_xyz_thickness * mmToUnit;
    const canopy_z_height_u = canopy_z_height * mmToUnit;

    const canopy_xy_width = canopy_mounting_hole_xy_pitch / Math.sin(Math.PI / 4);
    const ringR = canopy_mounting_ring_xy_diameter / 2;
    const w2 = canopy_xy_width / 2;
    const ringR_u = ringR * mmToUnit;
    const w2_u = w2 * mmToUnit;

    const canopyFootprintPts: Array<[number, number]> = [
      [-ringR_u, w2_u],
      [ringR_u, w2_u],
      [w2_u, ringR_u],
      [w2_u, -ringR_u],
      [ringR_u, -w2_u],
      [-ringR_u, -w2_u],
      [-w2_u, -ringR_u],
      [-w2_u, ringR_u],
    ];

    const canopyShape = new THREE.Shape(
      canopyFootprintPts.map(([x, y]) => new THREE.Vector2(x, y))
    );
    // Extrude footprint into a thin octagonal shell.
    const canopyExtrude = new THREE.ExtrudeGeometry(canopyShape, {
      depth: canopy_xyz_thickness_u,
      bevelEnabled: false,
      steps: 1,
    });
    canopyExtrude.center();
    canopyExtrude.rotateX(-Math.PI / 2);

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      metalness: 0.3,
      roughness: 0.45,
      transparent: true,
      opacity: 0,
    });

    const canopyShell = new THREE.Mesh(canopyExtrude, canopyMat);

    // Dome-ish cap using a scaled hemisphere.
    const domeRadius = w2_u * 1.02;
    const domeGeo = new THREE.SphereGeometry(domeRadius, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    domeGeo.translate(0, 0, 0);
    domeGeo.center();
    const canopyDome = new THREE.Mesh(domeGeo, canopyMat);
    canopyDome.position.y = canopy_xyz_thickness_u / 2 + canopy_z_height_u * 0.52;

    // Mounting rings at the 4 cardinal points.
    const ringCenterRadius_u = ((canopy_mounting_hole_xy_pitch / 2) / Math.sin(Math.PI / 4)) * mmToUnit; // matches SCAD translate([0,(pitch/2)/sin45])

    const canopyGroup = new THREE.Group();
    canopyGroup.add(canopyShell);
    canopyGroup.add(canopyDome);

    const ringHeight = canopy_xyz_thickness_u * 1.02;
    const ringGeo = new THREE.CylinderGeometry(ringR_u * 0.98, ringR_u * 0.98, ringHeight, 24);
    const ringPositions: Array<[number, number]> = [
      [0, ringCenterRadius_u],
      [ringCenterRadius_u, 0],
      [0, -ringCenterRadius_u],
      [-ringCenterRadius_u, 0],
    ];
    ringPositions.forEach(([x, z]) => {
      const ring = new THREE.Mesh(ringGeo, canopyMat);
      ring.position.set(x, canopy_xyz_thickness_u / 2, z);
      canopyGroup.add(ring);
    });

    // Visual holes (Three.js preview: we approximate "cuts" with dark shapes).
    const holeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0f1e,
      metalness: 0,
      roughness: 1,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    const mountingHoleRadius_u = (canopy_mounting_hole_xy_diameter / 2) * mmToUnit;
    const mountingHoleHeight_u = Math.max(0.01, canopy_xyz_thickness_u * 1.4);
    const mountingHoleGeo = new THREE.CylinderGeometry(
      mountingHoleRadius_u,
      mountingHoleRadius_u,
      mountingHoleHeight_u,
      18
    );
    ringPositions.forEach(([x, z]) => {
      const hole = new THREE.Mesh(mountingHoleGeo, holeMat);
      hole.position.set(x, canopy_xyz_thickness_u / 2, z);
      canopyGroup.add(hole);
    });

    // Antenna holes (left/right sides)
    const antennaOffsetMm =
      (((camera_mount_x_width + camera_mount_x_thickness) / 2 + (canopy_mounting_hole_xy_pitch / 2) / Math.sin(Math.PI / 4)) / 2);
    const antennaOffset_u = antennaOffsetMm * mmToUnit;
    const antennaRadius_u = (canopy_antenna_hole_xy_diameter / 2) * mmToUnit;
    const antennaHeight_u = (canopy_z_height_u / 2) * 0.98;
    const antennaGeo = new THREE.CylinderGeometry(
      antennaRadius_u,
      antennaRadius_u,
      Math.max(0.01, antennaHeight_u),
      18
    );
    const antennaY = canopy_xyz_thickness_u + antennaHeight_u / 2;
    [-1, 1].forEach((dir) => {
      const hole = new THREE.Mesh(antennaGeo, holeMat);
      hole.position.set(dir * antennaOffset_u, antennaY, 0);
      canopyGroup.add(hole);
    });

    canopyGroup.position.y = frameSize * 0.15;
    droneGroup.add(canopyGroup);
    canopyMeshRef.current = canopyGroup;
    canopyMaterialRef.current = canopyMat;

    // LED strip on body
    const ledGeo = new THREE.BoxGeometry(frameSize * 0.82, frameSize * 0.04, frameSize * 0.82);
    const ledMat = new THREE.MeshStandardMaterial({
      color: 0x00aaff,
      emissive: 0x0066ff,
      emissiveIntensity: 2,
    });
    const led = new THREE.Mesh(ledGeo, ledMat);
    led.position.y = -frameSize * 0.12;
    ledMaterialRef.current = ledMat;
    droneGroup.add(led);

    // Arms and motors
    const baseFrameColorHex = getColorHex(frameColorOptions, config.frameColorId, 0x1d4ed8);
    const motorColorHexInit = getColorHex(motorColorOptions, config.motorColorId, 0xf59e0b);
    const escColorHexInit = getColorHex(escColorOptions, config.escColorId, 0x22c55e);
    const propellerColorHexInit = getColorHex(propellerColorOptions, config.propellerColorId, 0x2563eb);
    for (let i = 0; i < numMotors; i++) {
      const motorAngle = ((Math.PI * 2) / numMotors) * i;
      const armLen = frameSize * 1.8;

      // Arm
      const armGeo = new THREE.CylinderGeometry(frameSize * 0.06, frameSize * 0.09, armLen, 6);
      const armMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(baseFrameColorHex).multiplyScalar(i % 2 === 0 ? 1 : 0.92).getHex(),
        metalness: 0.85,
        roughness: 0.15,
      });
      const arm = new THREE.Mesh(armGeo, armMat);
      arm.castShadow = true;
      arm.position.set(
        Math.cos(motorAngle) * (armLen * 0.5 + frameSize * 0.3),
        0,
        Math.sin(motorAngle) * (armLen * 0.5 + frameSize * 0.3)
      );
      arm.rotation.z = motorAngle - Math.PI / 2;
      droneGroup.add(arm);
      armMaterialsRef.current.push(armMat);

      // Motor mount group
      const motorGroup = new THREE.Group();
      motorGroup.position.set(
        Math.cos(motorAngle) * (armLen + frameSize * 0.3),
        0,
        Math.sin(motorAngle) * (armLen + frameSize * 0.3)
      );
      droneGroup.add(motorGroup);

      // Motor body
      const motorGeo = new THREE.CylinderGeometry(frameSize * 0.18, frameSize * 0.18, frameSize * 0.25, 16);
      const motorMat = new THREE.MeshStandardMaterial({
        color: motorColorHexInit,
        metalness: 0.9,
        roughness: 0.1,
        emissive: motorColorHexInit,
      });
      motorGroup.add(new THREE.Mesh(motorGeo, motorMat));
      motorMaterialsRef.current.push(motorMat);

      // Motor top cap
      const capGeo = new THREE.CylinderGeometry(frameSize * 0.12, frameSize * 0.18, frameSize * 0.08, 16);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 1, roughness: 0 });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = frameSize * 0.165;
      motorGroup.add(cap);

      // ESC chip (small visual indicator so ESC colors are visible in 3D)
      const escChipGeo = new THREE.BoxGeometry(frameSize * 0.11, frameSize * 0.045, frameSize * 0.07);
      const escChipMat = new THREE.MeshStandardMaterial({
        color: escColorHexInit,
        metalness: 0.15,
        roughness: 0.45,
        emissive: escColorHexInit,
        emissiveIntensity: 0.7,
      });
      const escChip = new THREE.Mesh(escChipGeo, escChipMat);
      escChip.position.y = frameSize * 0.09;
      motorGroup.add(escChip);
      escMaterialsRef.current.push(escChipMat);

      // Propeller spinner
      const spinGroup = new THREE.Group();
      spinGroup.position.y = frameSize * 0.22;
      motorGroup.add(spinGroup);
      wheelRotationsRef.current.push(spinGroup);

      // Whoop/duct guard (SCAD-inspired cage)
      // Built from a torus "duct" + radial struts (no booleans needed).
      const mmToUnit = 1 / 80;
      const motor_cage_xy_diameter = 33; // mm
      const motor_cage_z_depth = 13.5; // mm
      const motor_cage_xyz_thickness = 1.5; // mm
      const motor_base_z_thickness = 1.5; // mm
      const motor_cage_loop_z_thickness = 2.75; // mm
      const crossbar_z_thickness = 2.75; // mm
      const motor_cage_strut_count = 3;

      const outerRadius = (motor_cage_xy_diameter / 2) * mmToUnit;
      const tubeRadius = (motor_cage_xyz_thickness / 2) * mmToUnit;
      const ductHeight = motor_cage_z_depth * mmToUnit;

      const guardMat = new THREE.MeshStandardMaterial({
        color: 0x60a5fa,
        emissive: 0x60a5fa,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: config.whoop?.opacity ?? 0,
        roughness: 0.35,
        metalness: 0.15,
      });

      const guardGroup = new THREE.Group();
      guardGroup.visible = (config.whoop?.style ?? 'NONE') !== 'NONE';

      // Duct ring (torus around the prop axis)
      const torusGeo = new THREE.TorusGeometry(outerRadius, Math.max(0.001, tubeRadius), 10, 64);
      const torus = new THREE.Mesh(torusGeo, guardMat);
      guardGroup.add(torus);

      // Make it feel like a thicker duct by scaling in Y a bit.
      guardGroup.scale.y = Math.max(0.8, ductHeight / Math.max(0.001, outerRadius * 0.9));

      // Radial struts and a crossbar.
      const strutCount = motor_cage_strut_count;
      const strutAngOffset = 0; // motor_cage_strut_z_angle is 0 in your file
      const strutThickness = Math.max(tubeRadius * 0.9, motor_base_z_thickness * mmToUnit * 0.5);
      const strutWidth = outerRadius * 1.1;
      const strutHeight = motor_cage_loop_z_thickness * mmToUnit;

      for (let s = 0; s < strutCount; s++) {
        const a = (s / strutCount) * Math.PI * 2 + strutAngOffset;
        const strutGeo = new THREE.BoxGeometry(strutWidth, strutHeight, strutThickness);
        const strut = new THREE.Mesh(strutGeo, guardMat);
        strut.position.set(Math.cos(a) * outerRadius * 0.15, 0, Math.sin(a) * outerRadius * 0.15);
        strut.rotation.y = a;
        guardGroup.add(strut);
      }

      // One crossbar to tie the ring.
      const crossbarGeo = new THREE.BoxGeometry(outerRadius * 1.7, crossbar_z_thickness * mmToUnit, tubeRadius * 1.3);
      const crossbar = new THREE.Mesh(crossbarGeo, guardMat);
      crossbar.position.set(0, 0, 0);
      guardGroup.add(crossbar);

      spinGroup.add(guardGroup);
      whoopGuardsRef.current.push(guardGroup);

      const bladeCount = 2;
      for (let b = 0; b < bladeCount; b++) {
        const bladeGeo = new THREE.BoxGeometry(frameSize * 2.2, frameSize * 0.04, frameSize * 0.22);
        const bladeMat = new THREE.MeshStandardMaterial({
          color: propellerColorHexInit,
          metalness: 0.5,
          roughness: 0.3,
          transparent: true,
          opacity: 0.9,
        });
        const blade = new THREE.Mesh(bladeGeo, bladeMat);
        blade.rotation.y = (Math.PI / bladeCount) * b;
        blade.rotation.z = 0.15;
        spinGroup.add(blade);
        bladeMaterialsRef.current.push(bladeMat);
      }
    }

    // Camera mount
    if (config.camera?.type !== 'NONE') {
      // SCAD-inspired camera harness (visual): base box + internal slot cavities.
      // We keep the overall dimensions tied to `frameSize` so it stays readable across drones,
      // but we place cavities using the harness segment proportions.
      const harness_x_width = 13.75; // mm
      const camera_xyz_segments = [
        [5, 3.3, 4],
        [11.8, 3.5, 0],
        [8.2, 6.95, 2.8],
      ];
      const harness_y_length = camera_xyz_segments[0][1] + camera_xyz_segments[1][1] + camera_xyz_segments[2][1];
      const harness_z_height = 14; // mm

      const camBaseW = frameSize * 0.35;
      const camBaseH = frameSize * 0.28;
      const camBaseD = frameSize * 0.45;

      const camGeo = new THREE.BoxGeometry(camBaseW, camBaseH, camBaseD);
      const camMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.65, roughness: 0.25 });
      const camBody = new THREE.Mesh(camGeo, camMat);

      // Slot cavities (visual holes; approximated without boolean subtraction).
      const slotMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f1e,
        metalness: 0,
        roughness: 0.9,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      });

      let zCursor = -camBaseD / 2;
      camera_xyz_segments.forEach(([xSeg, ySeg, zSeg]) => {
        const segDepth = camBaseD * (ySeg / harness_y_length);
        const voidW = camBaseW * (xSeg / harness_x_width);
        const voidH = camBaseH * (1 - zSeg / harness_z_height);
        const voidY = (zSeg / harness_z_height) * camBaseH * 0.5;

        const voidGeo = new THREE.BoxGeometry(voidW, Math.max(0.001, voidH), segDepth + 0.002);
        const voidBox = new THREE.Mesh(voidGeo, slotMat);
        voidBox.position.set(0, voidY, zCursor + segDepth / 2);
        voidBox.renderOrder = 2;
        camBody.add(voidBox);

        zCursor += segDepth;
      });

      // Camera harness mounting holes (visual approximation)
      const mount_hole_xy_diameter = 2.25; // mm
      const mount_hole_y_pitch = 10; // mm
      const mount_hole_y_offset = (harness_y_length - mount_hole_y_pitch) / 2;

      const zHole1 = ((-mount_hole_y_offset) / harness_y_length) * camBaseD;
      const zHole2 = ((-(mount_hole_y_offset + mount_hole_y_pitch)) / harness_y_length) * camBaseD;

      const radiusScene = (mount_hole_xy_diameter / 2) * (camBaseW / harness_x_width);
      const holeGeo = new THREE.CylinderGeometry(radiusScene, radiusScene, camBaseW * 1.1, 16);
      const holeMat = slotMat;

      [zHole1, zHole2].forEach((zPos) => {
        const hole = new THREE.Mesh(holeGeo, holeMat);
        // Cylinder default axis is Y; rotate so it becomes an "X" hole.
        hole.rotation.z = Math.PI / 2;
        hole.position.set(0, 0, zPos);
        hole.renderOrder = 2;
        camBody.add(hole);
      });

      const lensGeo = new THREE.CylinderGeometry(frameSize * 0.1, frameSize * 0.12, frameSize * 0.15, 16);
      const lensMat = new THREE.MeshStandardMaterial({ color: 0x000011, metalness: 1, roughness: 0, emissive: 0x000033 });
      const lens = new THREE.Mesh(lensGeo, lensMat);
      lens.rotation.x = Math.PI / 2;

      const mountGroup = new THREE.Group();
      mountGroup.position.set(0, 0, 0);
      camBody.position.set(0, -frameSize * 0.3, frameSize * 0.5);
      lens.position.set(0, -frameSize * 0.3, frameSize * 0.78);
      mountGroup.add(camBody);
      mountGroup.add(lens);
      droneGroup.add(mountGroup);

      cameraMountGroupRef.current = mountGroup;
      cameraBodyMeshRef.current = camBody;
      cameraLensMeshRef.current = lens;
    }
    else {
      cameraMountGroupRef.current = null;
      cameraBodyMeshRef.current = null;
      cameraLensMeshRef.current = null;
    }

    // Landing gear
    const gearMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6, roughness: 0.4 });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const legGeo = new THREE.CylinderGeometry(frameSize * 0.04, frameSize * 0.04, frameSize * 0.6, 8);
      const leg = new THREE.Mesh(legGeo, gearMat);
      leg.position.set(sx * frameSize * 0.35, -frameSize * 0.45, sz * frameSize * 0.35);
      droneGroup.add(leg);
    });
    const footGeo = new THREE.CylinderGeometry(frameSize * 0.04, frameSize * 0.04, frameSize * 0.9, 8);
    footGeo.rotateZ(Math.PI / 2);
    [-1, 1].forEach((sz) => {
      const foot = new THREE.Mesh(footGeo, gearMat);
      foot.position.set(0, -frameSize * 0.75, sz * frameSize * 0.35);
      droneGroup.add(foot);
    });

    // Animation
    const animateLoop = () => {
      animationIdRef.current = requestAnimationFrame(animateLoop);
      const t = Date.now() * 0.001;

      const spinSpeed = (isFlyingRef.current ? 0.45 : 0.05) * dynamicSpinFactorRef.current;
      wheelRotationsRef.current.forEach((w, i) => {
        w.rotation.y += spinSpeed * (i % 2 === 0 ? 1 : -1);
      });

      if (isFlyingRef.current) {
        droneGroup.position.y = 15 + Math.sin(t * 1.2) * 8;
        droneGroup.rotation.x = Math.sin(t * 0.8) * 0.04;
        droneGroup.rotation.z = Math.cos(t * 0.6) * 0.03;
      } else {
        droneGroup.position.y = Math.sin(t * 0.5) * 3;
        droneGroup.rotation.x = 0;
        droneGroup.rotation.z = 0;
      }

      const target = droneGroup.position;
      const orbit = orbitRef.current;

      // Gentle auto-orbit only when the user hasn't interacted recently.
      const now = Date.now();
      if (!isDraggingRef.current && now - lastInteractionAtRef.current > 1600) {
        orbit.yaw += 0.0025;
      }

      const distance = orbit.distance;
      const horizontalDist = Math.cos(orbit.pitch) * distance;

      camera.position.x = target.x + Math.cos(orbit.yaw) * horizontalDist;
      camera.position.z = target.z + Math.sin(orbit.yaw) * horizontalDist;
      camera.position.y = target.y + Math.sin(orbit.pitch) * distance;

      camera.lookAt(target.x, target.y + (isFlyingRef.current ? 20 : 10), target.z);

      renderer.render(scene, camera);
    };
    animateLoop();

    // Interactive orbit controls (mouse/touch + wheel)
    const canvas = renderer.domElement;
    canvas.style.touchAction = 'none';

    // Allow much closer zoom on small frames.
    // Previously this was effectively clamped to ~120 for all frame sizes.
    const minDistance = Math.max(45, frameSize * 1.6);
    const maxDistance = Math.max(360, frameSize * 7);

    // Zoom in (closer than the original fixed camera).
    orbitRef.current.distance = clamp(frameSize * 3.2, minDistance, maxDistance);

    const onPointerDown = (e: PointerEvent) => {
      isDraggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      lastInteractionAtRef.current = Date.now();
      try {
        (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDraggingRef.current) return;
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };

      const orbit = orbitRef.current;
      orbit.yaw -= dx * 0.006;
      orbit.pitch = clamp(orbit.pitch - dy * 0.006, -1.2, 0.25);
      lastInteractionAtRef.current = Date.now();
    };

    const endDrag = () => {
      isDraggingRef.current = false;
      lastInteractionAtRef.current = Date.now();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const orbit = orbitRef.current;
      orbit.distance = clamp(orbit.distance + e.deltaY * 0.1, minDistance, maxDistance);
      lastInteractionAtRef.current = Date.now();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', endDrag);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationIdRef.current);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', endDrag);
      canvas.removeEventListener('wheel', onWheel as any);
      // Free GPU resources created for this visualization.
      if (droneGroupRef.current) {
        droneGroupRef.current.traverse((obj: any) => {
          if (obj.geometry?.dispose) obj.geometry.dispose();
          const material = obj.material;
          if (material) {
            if (Array.isArray(material)) material.forEach((m) => m?.dispose?.());
            else material?.dispose?.();
          }
        });
      }
      renderer.dispose();
      if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [config.frame.id, config.frame.armLength, config.frame.motorMounts, config.camera?.type]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl overflow-hidden"
      style={{ minHeight: '480px', background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1a3a 100%)' }}
    />
  );
};
