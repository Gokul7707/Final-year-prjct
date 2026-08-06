import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

/**
 * Module-level model cache — every 3D asset is downloaded and parsed exactly
 * once per session, then cheap-cloned into each scene.
 */

const MODEL_DIR = '/models/drone-custom/';
const PLACEHOLDER_OBJ = `${MODEL_DIR}drone_costum.obj`;
const HOLOGRAM_GLB = `${MODEL_DIR}spatial_projection_drone.glb`;

let placeholderPromise: Promise<THREE.Object3D> | null = null;
let hologramPromise: Promise<THREE.Object3D> | null = null;

function colorSpaceOf(map: THREE.Texture) {
  if ('colorSpace' in map) {
    (map as any).colorSpace = (THREE as any).SRGBColorSpace ?? 'srgb';
  } else {
    (map as any).encoding = (THREE as any).sRGBEncoding;
  }
  map.anisotropy = 16;
  map.needsUpdate = true;
}

/**
 * Blender-faithful materials with MeshPhysicalMaterial so env maps, clearcoat,
 * and soft specular actually show up (Standard alone looked flat in UI).
 */
export function restoreOriginalMaterials(root: THREE.Object3D) {
  root.traverse((obj: any) => {
    if (!obj?.isMesh || !obj.material) return;
    if (obj.geometry && !obj.geometry.attributes.normal) {
      obj.geometry.computeVertexNormals();
    }

    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    const next = list.map((src: any) => {
      if (!src) return src;
      const name = String(src.name || '').toLowerCase();
      const map = src.map || null;
      if (map) colorSpaceOf(map);

      let color = src.color ? src.color.clone() : new THREE.Color(0xffffff);
      let roughness = 0.42;
      let metalness = 0.05;
      let clearcoat = 0.35;
      let clearcoatRoughness = 0.25;
      let envMapIntensity = 1.0;

      if (name.includes('col_master')) {
        color = new THREE.Color(0xffcc00); // saturated hazard yellow
        roughness = 0.28;
        metalness = 0.12;
        clearcoat = 0.65;
        clearcoatRoughness = 0.18;
        envMapIntensity = 1.15;
      } else if (name.includes('col_1') || name.includes('col_4')) {
        color = new THREE.Color(0x050505);
        roughness = 0.4;
        metalness = 0.55;
        clearcoat = 0.4;
        clearcoatRoughness = 0.3;
        envMapIntensity = 0.85;
      } else if (name.includes('col_3')) {
        color = new THREE.Color(0xe11d48);
        roughness = 0.35;
        metalness = 0.2;
        clearcoat = 0.5;
        envMapIntensity = 1.0;
      } else if (name.includes('col_2')) {
        color = new THREE.Color(0xc8c8c8);
        roughness = 0.32;
        metalness = 0.65;
        clearcoat = 0.55;
        clearcoatRoughness = 0.2;
        envMapIntensity = 1.25;
      } else if (name.includes('uv__tex_blury') || name.includes('uv_text_camera')) {
        color = new THREE.Color(0xffffff);
        roughness = 0.4;
        metalness = 0.08;
        clearcoat = 0.25;
        envMapIntensity = 0.9;
      }

      const mat = new THREE.MeshPhysicalMaterial({
        name: src.name,
        color,
        map,
        roughness,
        metalness,
        clearcoat,
        clearcoatRoughness,
        envMapIntensity,
        transparent: name.includes('col_4'),
        opacity: name.includes('col_4') ? 0.88 : 1,
        side: THREE.FrontSide,
        depthWrite: true,
      });
      mat.needsUpdate = true;
      return mat;
    });

    obj.material = Array.isArray(obj.material) ? next : next[0];
    obj.castShadow = true;
    obj.receiveShadow = true;
    obj.frustumCulled = false;
    obj.visible = true;
  });
}

/** Fresh materials per scene so each can own its env map / shadow flags. */
export function prepareHeroInstance(root: THREE.Object3D, envMap: THREE.Texture | null) {
  root.traverse((obj: any) => {
    if (!obj?.isMesh || !obj.material) return;
    const list = Array.isArray(obj.material) ? obj.material : [obj.material];
    const cloned = list.map((m: any) => {
      const mat = m.clone();
      if (envMap) {
        mat.envMap = envMap;
        mat.needsUpdate = true;
      }
      return mat;
    });
    obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
    obj.castShadow = true;
    obj.receiveShadow = true;
  });
}

export function loadPlaceholder(): Promise<THREE.Object3D> {
  if (!placeholderPromise) {
    placeholderPromise = new Promise((resolve, reject) => {
      const mtlLoader = new MTLLoader();
      mtlLoader.setResourcePath(MODEL_DIR);
      mtlLoader.setPath(MODEL_DIR);
      mtlLoader.load(
        'drone_costum.mtl',
        (materials) => {
          materials.preload();
          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.load(
            PLACEHOLDER_OBJ,
            (obj) => {
              restoreOriginalMaterials(obj);
              resolve(obj);
            },
            undefined,
            reject
          );
        },
        undefined,
        reject
      );
    });
  }
  return placeholderPromise;
}

/** Bust the in-memory cache after material/texture upgrades (dev / hot reload). */
export function invalidateModelCache() {
  placeholderPromise = null;
  hologramPromise = null;
}

export function loadHologram(onProgress?: (pct: number) => void): Promise<THREE.Object3D> {
  if (!hologramPromise) {
    hologramPromise = new Promise((resolve, reject) => {
      const loader = new GLTFLoader();
      loader.load(
        HOLOGRAM_GLB,
        (gltf) => resolve(gltf.scene),
        (ev) => {
          if (ev.total > 0 && onProgress) onProgress(Math.round((ev.loaded / ev.total) * 100));
        },
        reject
      );
    });
  }
  return hologramPromise;
}

export function cloneModel(src: THREE.Object3D): THREE.Object3D {
  return src.clone(true);
}

export function fitObject(obj: THREE.Object3D, targetSpan: number) {
  const box = new THREE.Box3().setFromObject(obj);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
  obj.position.sub(center);
  obj.scale.setScalar(targetSpan / radius);
}

export function disposeSceneObjects(scene: THREE.Scene) {
  scene.traverse((obj: any) => {
    if (obj.geometry?.dispose && obj.userData.__ownGeometry) obj.geometry.dispose();
    const material = obj.material;
    if (material && obj.userData.__ownMaterial) {
      if (Array.isArray(material)) material.forEach((m: any) => m?.dispose?.());
      else material?.dispose?.();
    }
  });
}
