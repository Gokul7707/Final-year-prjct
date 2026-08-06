import React, { useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { SSAARenderPass } from 'three/examples/jsm/postprocessing/SSAARenderPass';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader';
import {
  loadPlaceholder,
  cloneModel,
  fitObject,
  prepareHeroInstance,
} from '@/components/3d/droneModelCache';

export type DroneRigMode = 'scroll' | 'idle' | 'orbit';

interface RotatingDroneRigProps {
  progress?: number;
  /** Live scroll value updated every frame without React re-renders. */
  progressRef?: MutableRefObject<number>;
  mode?: DroneRigMode;
  className?: string;
  span?: number;
}

const SPINS = 1.55;

/**
 * Commercial product hero — full visual quality always (SSAA + IBL + soft shadows).
 * Smoothness comes from React/scroll throttling + tab pause, not by downgrading the look.
 */
export const RotatingDroneRig: React.FC<RotatingDroneRigProps> = ({
  progress = 0,
  progressRef: externalProgressRef,
  mode = 'scroll',
  className,
  span = 2.2,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<THREE.Group | null>(null);
  const heroSlotRef = useRef<THREE.Group | null>(null);
  const progressPropRef = useRef(progress);
  const modeRef = useRef(mode);
  const yawSmooth = useRef(0);
  const poseSmooth = useRef({ x: 0, y: 0, z: 0, s: 1, rx: 0, rz: 0 });
  const dragRef = useRef({ active: false, x: 0, y: 0, yaw: 0, pitch: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    progressPropRef.current = progress;
  }, [progress]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let raf = 0;
    let visible = document.visibilityState !== 'hidden';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
    camera.position.set(0, 0.55, 6.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      premultipliedAlpha: false,
      stencil: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.5));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;
    if ('outputEncoding' in renderer) {
      (renderer as any).outputEncoding = (THREE as any).sRGBEncoding;
    }
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envRT = pmrem.fromScene(new RoomEnvironment() as unknown as THREE.Scene, 0.04);
    const envMap = envRT.texture;
    scene.environment = envMap;

    scene.add(new THREE.HemisphereLight(0xfff1d6, 0x1b1430, 0.35));

    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(5.2, 9.5, 4.2);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 40;
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.00025;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 3.5;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0xffc14d, 1.1);
    rim.position.set(-6, 2.2, -4);
    scene.add(rim);

    const fill = new THREE.DirectionalLight(0xb8c4ff, 0.35);
    fill.position.set(-2.8, 2, 5.5);
    scene.add(fill);

    const bounce = new THREE.DirectionalLight(0xffe7b0, 0.22);
    bounce.position.set(0, -4, 1);
    scene.add(bounce);

    const shadowMat = new THREE.ShadowMaterial({ opacity: 0.28 });
    const shadowFloor = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), shadowMat);
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = -1.15;
    shadowFloor.receiveShadow = true;
    scene.add(shadowFloor);

    const hero = new THREE.Group();
    const heroSlot = new THREE.Group();
    hero.add(heroSlot);
    scene.add(hero);
    heroRef.current = hero;
    heroSlotRef.current = heroSlot;

    // Full quality path — always. Same pipeline that looked perfect.
    const composer = new EffectComposer(renderer);
    const ssaaPass = new SSAARenderPass(scene, camera, 0x000000, 0);
    ssaaPass.sampleLevel = 2; // 4× supersample — the look you approved
    ssaaPass.unbiased = true;
    composer.addPass(ssaaPass);

    const fxaaPass = new ShaderPass(FXAAShader);
    composer.addPass(fxaaPass);

    const resize = () => {
      const w = Math.max(1, container.clientWidth);
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      const pr = renderer.getPixelRatio();
      fxaaPass.material.uniforms['resolution'].value.set(1 / (w * pr), 1 / (h * pr));
    };

    const swapHero = (obj: THREE.Object3D) => {
      const slot = heroSlotRef.current;
      if (!slot) return;
      while (slot.children.length) slot.remove(slot.children[0]);
      slot.add(obj);
      setReady(true);
      resize();
    };

    loadPlaceholder()
      .then((src) => {
        if (disposed) return;
        const obj = cloneModel(src);
        prepareHeroInstance(obj, envMap);
        fitObject(obj, span);
        obj.rotation.x = -0.1;
        const box = new THREE.Box3().setFromObject(obj);
        const lift = -1.05 - box.min.y;
        obj.position.y += lift * 0.15;
        swapHero(obj);
      })
      .catch(() => undefined);

    const onPointerDown = (e: PointerEvent) => {
      if (modeRef.current !== 'orbit') return;
      dragRef.current.active = true;
      dragRef.current.x = e.clientX;
      dragRef.current.y = e.clientY;
      try {
        (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.x;
      const dy = e.clientY - dragRef.current.y;
      dragRef.current.x = e.clientX;
      dragRef.current.y = e.clientY;
      dragRef.current.yaw -= dx * 0.007;
      dragRef.current.pitch = Math.max(-0.9, Math.min(0.55, dragRef.current.pitch - dy * 0.005));
    };
    const onPointerUp = () => {
      dragRef.current.active = false;
    };
    const onVisibility = () => {
      visible = document.visibilityState !== 'hidden';
    };

    const canvas = renderer.domElement;
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    document.addEventListener('visibilitychange', onVisibility);

    let idle = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      if (!visible) return;

      idle += 0.01;
      const m = modeRef.current;
      const p =
        externalProgressRef?.current !== undefined
          ? externalProgressRef.current
          : progressPropRef.current;

      let targetYaw = yawSmooth.current;
      if (m === 'scroll') targetYaw = p * Math.PI * 2 * SPINS;
      else if (m === 'idle') targetYaw = idle * 0.35;
      else targetYaw = dragRef.current.yaw + idle * 0.04;

      yawSmooth.current += (targetYaw - yawSmooth.current) * 0.1;

      const travel = m === 'scroll' ? 1 : m === 'idle' ? 0.35 : 0.15;
      const target = {
        x: Math.sin((m === 'scroll' ? p : idle * 0.08) * Math.PI * 2) * 0.45 * travel,
        y: Math.cos((m === 'scroll' ? p : idle * 0.06) * Math.PI * 1.25) * 0.18 * travel,
        z: Math.sin((m === 'scroll' ? p : idle * 0.05) * Math.PI) * 0.22 * travel,
        s: m === 'scroll' ? 0.94 + Math.sin(p * Math.PI) * 0.1 : 1,
        rx:
          -0.08 +
          (m === 'orbit'
            ? dragRef.current.pitch
            : Math.sin((m === 'scroll' ? p : idle * 0.1) * Math.PI * 2) * 0.09),
        rz: Math.sin((m === 'scroll' ? p : idle * 0.09) * Math.PI * 1.4) * 0.07 * travel,
      };

      const pose = poseSmooth.current;
      pose.x += (target.x - pose.x) * 0.1;
      pose.y += (target.y - pose.y) * 0.1;
      pose.z += (target.z - pose.z) * 0.1;
      pose.s += (target.s - pose.s) * 0.1;
      pose.rx += (target.rx - pose.rx) * 0.1;
      pose.rz += (target.rz - pose.rz) * 0.1;

      if (heroRef.current) {
        heroRef.current.rotation.y = yawSmooth.current;
        heroRef.current.rotation.x = pose.rx + Math.sin(idle * 0.4) * 0.015;
        heroRef.current.rotation.z = pose.rz;
        heroRef.current.position.set(pose.x, pose.y + Math.sin(idle * 0.5) * 0.02, pose.z);
        heroRef.current.scale.setScalar(pose.s);
        heroRef.current.visible = true;
      }

      shadowFloor.position.x = pose.x * 0.85;
      shadowFloor.position.z = pose.z * 0.85;
      shadowFloor.scale.setScalar(0.85 + pose.s * 0.2);

      camera.position.x = pose.x * 0.05;
      camera.position.y = 0.55 + pose.y * 0.05;
      camera.lookAt(pose.x * 0.2, pose.y * 0.1, 0);

      composer.render();
    };
    animate();

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('visibilitychange', onVisibility);
      envRT.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [span]);

  return (
    <div className={`commercial-drone-wrap ${className || ''}`}>
      <div
        ref={containerRef}
        className={`commercial-drone-canvas ${ready ? 'is-ready' : 'is-loading'}`}
        aria-hidden="true"
      />
    </div>
  );
};
