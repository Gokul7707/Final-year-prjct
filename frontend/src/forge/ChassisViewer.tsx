import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

type Props = {
  stlUrl?: string | null;
  wheelbaseMm?: number;
  motorCount?: number;
};

/** Auto-orients OpenSCAD whoop STLs so the airframe lies on the grid (Y-up). */
function orientFlat(geometry: THREE.BufferGeometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  const size = box.getSize(new THREE.Vector3());
  // Thinnest axis = plate normal. OpenSCAD whoops are typically Z-thin.
  if (size.z <= size.x && size.z <= size.y) {
    geometry.rotateX(-Math.PI / 2);
  } else if (size.x <= size.y && size.x <= size.z) {
    geometry.rotateZ(Math.PI / 2);
  }
  geometry.center();
  geometry.computeVertexNormals();
}

export const ChassisViewer: React.FC<Props> = ({
  stlUrl,
  wheelbaseMm = 75,
  motorCount = 4,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState('');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || !stlUrl) {
      setStatus('idle');
      return;
    }

    let disposed = false;
    let raf = 0;
    // Bust browser cache so new STLs always load
    const url = stlUrl.includes('?') ? stlUrl : `${stlUrl}?t=${Date.now()}`;
    setStatus('loading');
    setError('');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xeef2f7);

    const camera = new THREE.PerspectiveCamera(40, 1, 0.01, 8000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xeef2f7, 1);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const key = new THREE.DirectionalLight(0xffffff, 1.2);
    key.position.set(5, 10, 6);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x93c5fd, 0.55);
    fill.position.set(-6, 4, -5);
    scene.add(fill);

    const grid = new THREE.GridHelper(8, 28, 0x94a3b8, 0xdbe3ee);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.9;
    scene.add(grid);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;

    const resize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    new STLLoader().load(
      url,
      (geometry) => {
        if (disposed) return;
        orientFlat(geometry);

        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: 0x4b5563,
            metalness: 0.3,
            roughness: 0.4,
            side: THREE.DoubleSide,
          })
        );

        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const target = Math.min(3.8, Math.max(1.8, (wheelbaseMm / 250) * 2.2 * (motorCount >= 6 ? 1.2 : 1)));
        mesh.scale.setScalar(target / maxDim);
        mesh.updateMatrixWorld(true);
        const box2 = new THREE.Box3().setFromObject(mesh);
        mesh.position.y -= box2.min.y;

        scene.add(mesh);
        camera.position.set(target * 1.4, target * 1.05, target * 1.55);
        controls.target.set(0, target * 0.22, 0);
        controls.update();
        setStatus('ready');
        resize();
      },
      undefined,
      (err) => {
        if (disposed) return;
        setStatus('error');
        setError(err?.message || 'Failed to load generated STL');
      }
    );

    const tick = () => {
      raf = requestAnimationFrame(tick);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();
    const ro = new ResizeObserver(resize);
    ro.observe(mount);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [stlUrl, wheelbaseMm, motorCount]);

  if (!stlUrl) {
    return (
      <div className="forge-empty" style={{ minHeight: 480 }}>
        <p>No generated chassis. Start a new brief so OpenSCAD can build a whoop STL from your params.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      {status === 'loading' && (
        <div className="forge-stage-note" style={{ top: '45%' }}>
          Loading generated chassis…
        </div>
      )}
      {status === 'error' && (
        <div className="forge-stage-note" style={{ color: '#dc2626' }}>
          {error}
        </div>
      )}
      {status === 'ready' && (
        <p className="forge-stage-note">
          Phase 1 generated · {motorCount} motors · {wheelbaseMm} mm · drag to orbit
        </p>
      )}
    </div>
  );
};
