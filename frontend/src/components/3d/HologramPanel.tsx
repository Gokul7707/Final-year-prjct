import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { loadHologram, cloneModel, fitObject } from '@/components/3d/droneModelCache';

/**
 * "Pilot projection" — the spatial_projection hologram used as an intentional
 * story beat: after a build locks, the hangar projects the pilot beside their
 * registered chassis. Contained panel, slow cinematic turn, never overlaps UI.
 */
export const HologramPanel: React.FC<{ pilot: string }> = ({ pilot }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let raf = 0;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.05, 200);
    camera.position.set(0, 0.25, 4.6);
    camera.lookAt(0, 0.1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    (renderer as any).outputEncoding = (THREE as any).sRGBEncoding ?? renderer.outputEncoding;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffe9c9, 0x2a1608, 1.1));
    const key = new THREE.DirectionalLight(0xffd9a0, 1.4);
    key.position.set(2, 5, 4);
    scene.add(key);
    const under = new THREE.PointLight(0xffa64d, 1.2, 12);
    under.position.set(0, -1.4, 0.6);
    scene.add(under);

    const pivot = new THREE.Group();
    scene.add(pivot);

    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    loadHologram((p) => setPct(p))
      .then((src) => {
        if (disposed) return;
        const model = cloneModel(src);
        fitObject(model, 2.3);
        pivot.add(model);
        setState('ready');
        resize();
      })
      .catch(() => {
        if (!disposed) setState('failed');
      });

    let t = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.01;
      pivot.rotation.y = t * 0.22;
      pivot.position.y = Math.sin(t * 0.6) * 0.03;
      renderer.render(scene, camera);
    };
    animate();

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (state === 'failed') return null;

  return (
    <div className="hologram-panel">
      <div className="hologram-head">
        <span className="live-dot" />
        <span>Hangar projection · registered to {pilot}</span>
      </div>
      <div ref={containerRef} className={`hologram-stage ${state === 'ready' ? 'is-ready' : ''}`} />
      <div className="hologram-scanlines" aria-hidden />
      {state === 'loading' && (
        <p className="hologram-loading">Projecting pilot… {pct > 0 ? `${pct}%` : ''}</p>
      )}
    </div>
  );
};
