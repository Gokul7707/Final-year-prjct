import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import type { DroneConfig } from '@/shared/types';
import { DroneVisualizer } from '@/components/3d/DroneVisualizer';

type Props = {
  droneConfig?: DroneConfig;
  stlUrl?: string | null;
  wheelbaseMm?: number;
  motorCount?: number;
};

/** Prefer real OpenSCAD STL when available; fall back to parametric config. */
export const ChassisViewer: React.FC<Props> = ({ droneConfig, stlUrl }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stlUrl || !mountRef.current) return;
    const el = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f9ff);
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 2000);
    camera.position.set(80, 60, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xbae6fd, 1));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(40, 80, 20);
    scene.add(key);
    const grid = new THREE.GridHelper(160, 16, 0x7dd3fc, 0xe0f2fe);
    grid.position.y = -20;
    scene.add(grid);

    const root = new THREE.Group();
    scene.add(root);

    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geom: THREE.BufferGeometry) => {
        geom.computeVertexNormals();
        geom.center();
        geom.computeBoundingBox();
        const size = new THREE.Vector3();
        geom.boundingBox!.getSize(size);
        const s = 70 / Math.max(size.x, size.y, size.z, 1);
        geom.scale(s, s, s);
        const mesh = new THREE.Mesh(
          geom,
          new THREE.MeshStandardMaterial({
            color: 0x0ea5e9,
            metalness: 0.25,
            roughness: 0.4,
            emissive: 0x0284c7,
            emissiveIntensity: 0.12,
          })
        );
        root.add(mesh);
      },
      undefined,
      () => {
        /* keep empty — parent may still show parametric */
      }
    );

    let yaw = 0.4;
    let dragging = false;
    let lastX = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      yaw += (e.clientX - lastX) * 0.01;
      lastX = e.clientX;
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointermove', onMove);

    const resize = () => {
      const w = el.clientWidth || 640;
      const h = el.clientHeight || 480;
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
      root.rotation.y = yaw + performance.now() * 0.00015;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointermove', onMove);
      renderer.dispose();
      if (renderer.domElement.parentElement === el) el.removeChild(renderer.domElement);
    };
  }, [stlUrl]);

  if (stlUrl) {
    return (
      <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
        <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
        <div className="forge-stage-label">OpenSCAD STL</div>
      </div>
    );
  }

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
