import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Phase 1 contract: load a real generated chassis mesh (STL).
 * Does not invent geometry from sliders.
 */
export const ChassisViewer: React.FC<{ stlUrl: string | null }> = ({ stlUrl }) => {
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
    setStatus('loading');
    setError('');

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2000);
    camera.position.set(120, 90, 140);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0xf8fafc, 1);
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 0.95);
    key.position.set(80, 120, 60);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xcbd5e1, 0.45);
    fill.position.set(-60, 40, -40);
    scene.add(fill);

    const grid = new THREE.GridHelper(200, 20, 0xcbd5e1, 0xe2e8f0);
    (grid.material as THREE.Material).opacity = 0.7;
    (grid.material as THREE.Material).transparent = true;
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

    const loader = new STLLoader();
    loader.load(
      stlUrl,
      (geometry) => {
        if (disposed) return;
        geometry.computeVertexNormals();
        geometry.center();

        const material = new THREE.MeshStandardMaterial({
          color: 0x334155,
          metalness: 0.25,
          roughness: 0.45,
          flatShading: false,
        });
        const mesh = new THREE.Mesh(geometry, material);

        // Fit to view
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 80 / maxDim;
        mesh.scale.setScalar(scale);
        scene.add(mesh);

        camera.position.set(110, 85, 130);
        controls.target.set(0, 0, 0);
        controls.update();
        setStatus('ready');
        resize();
      },
      undefined,
      (err) => {
        if (disposed) return;
        setStatus('error');
        setError(err?.message || 'Failed to load STL');
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
  }, [stlUrl]);

  if (!stlUrl) {
    return (
      <div className="forge-empty" style={{ minHeight: 480 }}>
        <p>No STL for this alternative yet. CAD step did not produce a mesh.</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 480 }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      {status === 'loading' && (
        <div className="forge-stage-note" style={{ top: '45%' }}>
          Loading generated chassis STL…
        </div>
      )}
      {status === 'error' && (
        <div className="forge-stage-note" style={{ color: '#dc2626' }}>
          {error}
        </div>
      )}
    </div>
  );
};
