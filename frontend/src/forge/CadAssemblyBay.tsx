import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { AssemblyPartId } from '@/data/quizFlow';
import { CAD_PART_MESHES, LAYOUT_MOTORS, type ChassisLayout } from './cadParts';

type Props = {
  layout: ChassisLayout;
  visibleParts: AssemblyPartId[];
  activePart?: AssemblyPartId | null;
  status?: string;
  features?: string[];
};

const PART_ORDER: AssemblyPartId[] = [
  'chassis',
  'motors',
  'battery',
  'props',
  'avionics',
  'optics',
  'shell',
];

function motorAngles(count: number): number[] {
  const start = count === 3 ? -Math.PI / 2 : Math.PI / 4;
  return Array.from({ length: count }, (_, i) => start + (i * Math.PI * 2) / count);
}

type DockState = {
  group: THREE.Group;
  homeY: number;
  progress: number; // 0..1
  target: number; // 0 hidden, 1 docked
};

export const CadAssemblyBay: React.FC<Props> = ({
  layout,
  visibleParts,
  activePart = null,
  status = '',
  features = [],
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef(layout);
  const visibleRef = useRef(visibleParts);
  const activeRef = useRef(activePart);
  const dockRef = useRef<Partial<Record<AssemblyPartId, DockState>>>({});
  const propSpinnersRef = useRef<THREE.Group[]>([]);

  layoutRef.current = layout;
  visibleRef.current = visibleParts;
  activeRef.current = activePart;

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xb8e0f5, 0.0022);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2500);
    camera.position.set(110, 78, 130);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x7dd3fc, 1.05));
    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(70, 140, 50);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.45);
    rim.position.set(-90, 40, -40);
    scene.add(rim);

    const grid = new THREE.GridHelper(280, 28, 0x7dd3fc, 0xbae6fd);
    grid.position.y = -22;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.45;
    scene.add(grid);

    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(48, 64),
      new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        metalness: 0.15,
        roughness: 0.55,
        transparent: true,
        opacity: 0.85,
      })
    );
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = -21.5;
    scene.add(pad);

    const root = new THREE.Group();
    scene.add(root);

    const loader = new STLLoader();
    const cache = new Map<string, THREE.BufferGeometry>();

    const loadGeom = (url: string) =>
      new Promise<THREE.BufferGeometry>((resolve, reject) => {
        if (cache.has(url)) {
          resolve(cache.get(url)!.clone());
          return;
        }
        loader.load(
          url,
          (geom: THREE.BufferGeometry) => {
            geom.computeVertexNormals();
            geom.center();
            cache.set(url, geom);
            resolve(geom.clone());
          },
          undefined,
          reject
        );
      });

    const fitGeom = (geom: THREE.BufferGeometry, targetSize: number) => {
      geom.computeBoundingBox();
      const size = new THREE.Vector3();
      geom.boundingBox!.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const s = targetSize / maxDim;
      geom.scale(s, s, s);
      geom.center();
    };

    const makeMat = (color: number, emissive = 0.18) =>
      new THREE.MeshStandardMaterial({
        color,
        metalness: 0.32,
        roughness: 0.38,
        emissive: color,
        emissiveIntensity: emissive,
      });

    const partGroups: Partial<Record<AssemblyPartId, THREE.Group>> = {};
    const docks: Partial<Record<AssemblyPartId, DockState>> = {};
    PART_ORDER.forEach((id) => {
      const g = new THREE.Group();
      g.visible = true;
      g.scale.setScalar(0.001);
      root.add(g);
      partGroups[id] = g;
      docks[id] = { group: g, homeY: 0, progress: 0, target: 0 };
    });
    dockRef.current = docks;

    const buildSpinningProps = (count: number, radius: number) => {
      const g = partGroups.props!;
      propSpinnersRef.current = [];
      motorAngles(count).forEach((angle) => {
        // Rotor sits flat in the XZ plane (Y = up) — sleeping like a real multirotor fan.
        const spin = new THREE.Group();
        spin.position.set(Math.cos(angle) * radius, 9, Math.sin(angle) * radius);

        const disc = new THREE.Mesh(
          new THREE.CylinderGeometry(11, 11, 0.35, 28),
          makeMat(0xbae6fd, 0.06)
        );
        // Cylinder default axis is Y → disc is already horizontal. Do NOT tip it with X rotation.
        spin.add(disc);

        const hub = new THREE.Mesh(
          new THREE.CylinderGeometry(2.2, 2.2, 2.4, 16),
          makeMat(0xf8fafc, 0.05)
        );
        spin.add(hub);

        for (let b = 0; b < 2; b++) {
          // Long in X, thin in Y (height), modest chord in Z → blade lies flat.
          const blade = new THREE.Mesh(
            new THREE.BoxGeometry(24, 0.35, 3.2),
            makeMat(0x0ea5e9, 0.14)
          );
          // Offset the pair around the vertical axis only (horizontal "+" ).
          blade.rotation.y = (b * Math.PI) / 2;
          // Tiny pitch around the blade span — keep blades sleeping, not standing.
          blade.rotation.x = b === 0 ? 0.08 : -0.08;
          spin.add(blade);
        }

        g.add(spin);
        propSpinnersRef.current.push(spin);
      });
    };

    const placeRadial = async (
      partId: AssemblyPartId,
      url: string,
      count: number,
      radius: number,
      size: number,
      y: number
    ) => {
      const g = partGroups[partId]!;
      try {
        const geom = await loadGeom(url);
        fitGeom(geom, size);
        motorAngles(count).forEach((angle) => {
          const mesh = new THREE.Mesh(geom.clone(), makeMat(CAD_PART_MESHES[partId].color));
          mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
          mesh.rotation.y = -angle;
          g.add(mesh);
        });
      } catch {
        motorAngles(count).forEach((angle) => {
          const mesh = new THREE.Mesh(
            new THREE.CylinderGeometry(5, 5, 10, 18),
            makeMat(CAD_PART_MESHES[partId].color)
          );
          mesh.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
          g.add(mesh);
        });
      }
    };

    const clearGroup = (g: THREE.Group) => {
      while (g.children.length) {
        const c = g.children[0];
        g.remove(c);
        if ((c as THREE.Mesh).geometry) (c as THREE.Mesh).geometry.dispose();
      }
    };

    const rebuildForLayout = async () => {
      const motorsN = LAYOUT_MOTORS[layoutRef.current];
      const armR = 32 + motorsN * 2.4;

      // Chassis
      const chassisG = partGroups.chassis!;
      clearGroup(chassisG);
      // Prefer toothpick frame first, then cognifly extras
      for (const [idx, url] of CAD_PART_MESHES.chassis.urls.entries()) {
        try {
          const geom = await loadGeom(url);
          fitGeom(geom, idx === 0 ? 58 : idx === 1 ? 36 : 28);
          const mesh = new THREE.Mesh(geom, makeMat(CAD_PART_MESHES.chassis.color, 0.14));
          mesh.position.y = idx === 0 ? 0 : -3 - idx;
          chassisG.add(mesh);
        } catch {
          /* skip */
        }
      }
      motorAngles(motorsN).forEach((angle) => {
        const arm = new THREE.Mesh(new THREE.BoxGeometry(armR * 0.92, 2.2, 4.2), makeMat(0x0369a1, 0.1));
        arm.position.set((Math.cos(angle) * armR) / 2, 1, (Math.sin(angle) * armR) / 2);
        arm.rotation.y = -angle;
        chassisG.add(arm);
      });

      clearGroup(partGroups.motors!);
      await placeRadial('motors', CAD_PART_MESHES.motors.urls[0], motorsN, armR, 15, 4);

      clearGroup(partGroups.props!);
      // Prop guards (real STL) + spinning blades
      try {
        const geom = await loadGeom(CAD_PART_MESHES.props.urls[0]);
        fitGeom(geom, 62);
        const guard = new THREE.Mesh(geom, makeMat(0x7dd3fc, 0.08));
        guard.position.y = 2;
        partGroups.props!.add(guard);
      } catch {
        /* optional */
      }
      buildSpinningProps(motorsN, armR);

      clearGroup(partGroups.battery!);
      for (const [idx, url] of CAD_PART_MESHES.battery.urls.entries()) {
        try {
          const geom = await loadGeom(url);
          fitGeom(geom, idx === 0 ? 24 : 15);
          const mesh = new THREE.Mesh(geom, makeMat(CAD_PART_MESHES.battery.color));
          mesh.position.y = 10 + idx * 4;
          partGroups.battery!.add(mesh);
        } catch {
          /* skip */
        }
      }

      clearGroup(partGroups.avionics!);
      try {
        const geom = await loadGeom(CAD_PART_MESHES.avionics.urls[0]);
        fitGeom(geom, 18);
        partGroups.avionics!.add(new THREE.Mesh(geom, makeMat(CAD_PART_MESHES.avionics.color)));
      } catch {
        /* skip */
      }

      clearGroup(partGroups.optics!);
      for (const [idx, url] of CAD_PART_MESHES.optics.urls.entries()) {
        try {
          const geom = await loadGeom(url);
          fitGeom(geom, idx === 0 ? 20 : 12);
          const mesh = new THREE.Mesh(geom, makeMat(CAD_PART_MESHES.optics.color));
          mesh.position.set(26 + idx * 2, 4, 0);
          partGroups.optics!.add(mesh);
        } catch {
          /* skip */
        }
      }

      clearGroup(partGroups.shell!);
      for (const url of CAD_PART_MESHES.shell.urls) {
        try {
          const geom = await loadGeom(url);
          const isFoot = url.includes('foot');
          fitGeom(geom, isFoot ? 11 : url.includes('Bumper') ? 36 : 18);
          if (isFoot) {
            motorAngles(Math.min(motorsN, 4)).forEach((angle) => {
              const mesh = new THREE.Mesh(geom.clone(), makeMat(CAD_PART_MESHES.shell.color, 0.08));
              mesh.position.set(Math.cos(angle) * armR * 0.55, -12, Math.sin(angle) * armR * 0.55);
              partGroups.shell!.add(mesh);
            });
          } else {
            const mesh = new THREE.Mesh(geom, makeMat(0x94a3b8, 0.1));
            mesh.position.y = url.includes('Front') ? 3 : -1;
            if (url.includes('Front')) mesh.position.x = 8;
            if (url.includes('Back')) mesh.position.x = -8;
            partGroups.shell!.add(mesh);
          }
        } catch {
          /* skip */
        }
      }
    };

    void rebuildForLayout();

    let dragging = false;
    let lastX = 0;
    let yaw = 0.65;
    let dist = 175;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      el.setPointerCapture(e.pointerId);
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.008;
      lastX = e.clientX;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      dist = Math.max(100, Math.min(300, dist + e.deltaY * 0.08));
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('wheel', onWheel, { passive: false });

    const resize = () => {
      const w = el.clientWidth || 720;
      const h = el.clientHeight || 520;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const vis = new Set(visibleRef.current);

      PART_ORDER.forEach((id) => {
        const dock = docks[id];
        if (!dock) return;
        dock.target = vis.has(id) ? 1 : 0;
        dock.progress += (dock.target - dock.progress) * 0.08;
        const p = dock.progress;
        const s = 0.001 + p * 0.999;
        dock.group.scale.setScalar(s);
        dock.group.position.y = (1 - p) * 28;
        dock.group.rotation.y = (1 - p) * 0.8;
        dock.group.visible = p > 0.01;
        dock.group.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const mat = (obj as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (mat?.emissiveIntensity != null) {
              mat.emissiveIntensity = activeRef.current === id ? 0.55 : 0.14 + p * 0.06;
            }
          }
        });
      });

      // Always spin props when props are docking / docked
      const propP = docks.props?.progress ?? 0;
      if (propP > 0.05) {
        propSpinnersRef.current.forEach((spin, i) => {
          spin.rotation.y += 0.22 + i * 0.015;
        });
      }

      root.rotation.y = yaw;
      root.position.y = Math.sin(performance.now() * 0.001) * 1.2;
      camera.position.set(Math.cos(yaw) * dist * 0.55 + 40, 70 + dist * 0.08, Math.sin(yaw) * dist * 0.55 + 60);
      camera.lookAt(0, 4, 0);
      renderer.render(scene, camera);
    };
    tick();

    (el as HTMLElement & { __rebuildCad?: () => void }).__rebuildCad = () => {
      void rebuildForLayout();
    };

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('wheel', onWheel);
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, []);

  useEffect(() => {
    const el = mountRef.current as (HTMLElement & { __rebuildCad?: () => void }) | null;
    el?.__rebuildCad?.();
  }, [layout]);

  return (
    <div className="cad-bay cad-bay--live">
      <div className="cad-bay-stage" ref={mountRef} />
      <div className="cad-bay-hud">
        <div>
          <span className="cad-bay-kicker">Live CAD bay · real STLs</span>
          <strong>
            {LAYOUT_MOTORS[layout]}-motor {layout}
          </strong>
        </div>
        <p>{status || 'Parts dock and rotors spin as tokens fire.'}</p>
        {features.length > 0 && (
          <ul className="cad-bay-features">
            {features.slice(0, 5).map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        )}
      </div>
      <ul className="cad-bay-rail" aria-label="Assembly tokens">
        {PART_ORDER.map((id) => (
          <li
            key={id}
            className={`${visibleParts.includes(id) ? 'is-on' : ''} ${activePart === id ? 'is-active' : ''}`}
          >
            {CAD_PART_MESHES[id].label}
          </li>
        ))}
      </ul>
    </div>
  );
};
