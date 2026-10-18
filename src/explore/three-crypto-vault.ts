/**
 * Interactive Three.js 3D Sovereign Treasury & Multi-Chain Hologram (`src/explore/three-crypto-vault.ts`)
 *
 * Uses `three` (WebGLRenderer, PerspectiveCamera, MeshStandardMaterial, IcosahedronGeometry,
 * TorusGeometry, BoxGeometry, Points) to render an interactive 3D financial & multi-chain
 * orbital vault inside the ZEN AI · ARSENAL Command Deck.
 */

import * as THREE from 'three';
import {
  CRYPTO_PAYMENT_CHAINS,
  type CryptoChainId,
} from '../ingest/crypto-access-pass.js';

export type VaultCameraMode = 'orbit' | 'top' | 'core';

export interface ThreeCryptoVaultOptions {
  container: HTMLElement;
  activeChain: CryptoChainId;
  monthlyNetValues?: readonly number[];
  onSelectChain?: (chain: CryptoChainId) => void;
}

export interface ThreeCryptoVaultHandle {
  setCameraMode: (mode: VaultCameraMode) => void;
  setActiveChain: (chain: CryptoChainId) => void;
  dispose: () => void;
}

const CHAIN_HEX_COLORS: Record<CryptoChainId, number> = {
  sol: 0x6be8f2,
  btc: 0xff5a14,
  eth: 0x6e8bff,
  base: 0xf4f03a,
  arbitrum: 0xb9f0c6,
  polygon: 0xffa8e4,
};

export function mountThreeCryptoVault(
  options: ThreeCryptoVaultOptions
): ThreeCryptoVaultHandle {
  const { container } = options;
  container.innerHTML = '';

  const width = Math.max(320, container.clientWidth || 540);
  const height = Math.max(220, container.clientHeight || 260);

  let renderer: THREE.WebGLRenderer | null = null;
  let animationFrameId = 0;
  let disposed = false;
  let currentChain: CryptoChainId = options.activeChain;
  let cameraMode: VaultCameraMode = 'orbit';

  // Build Scene & Camera
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0c0b);
  scene.fog = new THREE.FogExp2(0x0c0c0b, 0.065);

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 3.2, 7.8);
  camera.lookAt(0, 0, 0);

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xf3f0e6, 0.85);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xf4f03a, 1.8);
  dirLight.position.set(5, 8, 6);
  scene.add(dirLight);

  const accentPointLight = new THREE.PointLight(
    CHAIN_HEX_COLORS[currentChain] ?? 0x6be8f2,
    2.6,
    18
  );
  accentPointLight.position.set(-4, 3, 4);
  scene.add(accentPointLight);

  // Root group for interactive drag rotation
  const rootGroup = new THREE.Group();
  scene.add(rootGroup);

  // 1. Central Sovereign Vault Core (Faceted Icosahedron + Outer Wireframe Cage)
  const coreGeo = new THREE.IcosahedronGeometry(1.18, 1);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x191917,
    emissive: CHAIN_HEX_COLORS[currentChain] ?? 0xf4f03a,
    emissiveIntensity: 0.28,
    metalness: 0.85,
    roughness: 0.2,
    flatShading: true,
  });
  const coreMesh = new THREE.Mesh(coreGeo, coreMat);
  rootGroup.add(coreMesh);

  const cageGeo = new THREE.IcosahedronGeometry(1.42, 1);
  const cageMat = new THREE.MeshBasicMaterial({
    color: CHAIN_HEX_COLORS[currentChain] ?? 0xf4f03a,
    wireframe: true,
    transparent: true,
    opacity: 0.55,
  });
  const cageMesh = new THREE.Mesh(cageGeo, cageMat);
  rootGroup.add(cageMesh);

  // 2. 6 Multi-Chain Orbital Rings & Chain Satellite Nodes
  const chainNodes: Array<{
    id: CryptoChainId;
    ring: THREE.Mesh;
    node: THREE.Mesh;
    orbitRadius: number;
    speed: number;
    phase: number;
    tiltX: number;
    tiltZ: number;
  }> = [];

  CRYPTO_PAYMENT_CHAINS.forEach((chain, idx) => {
    const orbitRadius = 2.05 + idx * 0.34;
    const hexColor = CHAIN_HEX_COLORS[chain.id];
    const isSelected = chain.id === currentChain;

    const ringGeo = new THREE.TorusGeometry(
      orbitRadius,
      isSelected ? 0.032 : 0.014,
      12,
      72
    );
    const ringMat = new THREE.MeshBasicMaterial({
      color: hexColor,
      transparent: true,
      opacity: isSelected ? 0.92 : 0.32,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    const tiltX = Math.PI / 2 + (idx - 2.5) * 0.16;
    const tiltZ = idx * 0.28;
    ring.rotation.x = tiltX;
    ring.rotation.y = tiltZ;
    rootGroup.add(ring);

    const nodeGeo = new THREE.OctahedronGeometry(isSelected ? 0.22 : 0.14, 0);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: hexColor,
      emissive: hexColor,
      emissiveIntensity: isSelected ? 0.9 : 0.4,
      metalness: 0.6,
      roughness: 0.25,
    });
    const node = new THREE.Mesh(nodeGeo, nodeMat);
    rootGroup.add(node);

    chainNodes.push({
      id: chain.id,
      ring,
      node,
      orbitRadius,
      speed: 0.45 + idx * 0.09,
      phase: (idx * Math.PI) / 3,
      tiltX,
      tiltZ,
    });
  });

  // 3. 12 Radial Monthly Cash-Flow Pillars on the Base Horizon
  const monthlyVals =
    options.monthlyNetValues && options.monthlyNetValues.length > 0
      ? options.monthlyNetValues
      : [42, 58, 51, 74, 68, 89, 95, 82, 104, 118, 112, 136];
  const maxAbs = Math.max(1, ...monthlyVals.map((v) => Math.abs(v)));

  const pillarsGroup = new THREE.Group();
  pillarsGroup.position.y = -1.55;
  rootGroup.add(pillarsGroup);

  monthlyVals.slice(0, 12).forEach((val, idx) => {
    const normH = Math.max(0.22, (Math.abs(val) / maxAbs) * 1.45);
    const angle = (idx / 12) * Math.PI * 2;
    const radius = 3.95;
    const barGeo = new THREE.BoxGeometry(0.22, normH, 0.22);
    const barColor = val >= 0 ? 0xb9f0c6 : 0xff5a14;
    const barMat = new THREE.MeshStandardMaterial({
      color: barColor,
      emissive: barColor,
      emissiveIntensity: 0.22,
      metalness: 0.5,
      roughness: 0.35,
    });
    const bar = new THREE.Mesh(barGeo, barMat);
    bar.position.set(
      Math.cos(angle) * radius,
      normH / 2,
      Math.sin(angle) * radius
    );
    pillarsGroup.add(bar);
  });

  // 4. Ambient Particle Field
  const particleCount = 160;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    const r = 4.2 + (i % 7) * 0.45;
    const theta = (i / particleCount) * Math.PI * 2 * 3;
    const ySpread = ((i % 11) - 5) * 0.38;
    positions[i * 3] = Math.cos(theta) * r;
    positions[i * 3 + 1] = ySpread;
    positions[i * 3 + 2] = Math.sin(theta) * r;
  }
  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xf4f03a,
    size: 0.055,
    transparent: true,
    opacity: 0.65,
  });
  const particleSystem = new THREE.Points(particleGeo, particleMat);
  rootGroup.add(particleSystem);

  // Try creating WebGLRenderer (graceful fallback if headless test environment lacks WebGL)
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(
      typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
    );
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.setAttribute(
      'data-testid',
      'three-crypto-vault-canvas'
    );
    container.appendChild(renderer.domElement);
  } catch {
    // Fallback interactive placeholder if WebGL context is unavailable in headless runner
    const fallbackDiv = document.createElement('div');
    fallbackDiv.setAttribute('data-testid', 'three-crypto-vault-canvas');
    fallbackDiv.style.cssText =
      'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0c0c0b;color:#f4f03a;font-family:var(--font-mono);font-size:12px;text-align:center;padding:16px;';
    fallbackDiv.textContent = `THREE.JS 3D SOVEREIGN VAULT ACTIVE · CHAIN: ${currentChain.toUpperCase()}`;
    container.appendChild(fallbackDiv);
  }

  // Interactive Pointer Drag Rotation
  let isDragging = false;
  let prevX = 0;
  let prevY = 0;
  let userRotY = 0;
  let userRotX = 0;

  const canvasEl = renderer?.domElement;
  const onPointerDown = (e: PointerEvent) => {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
    if (canvasEl) canvasEl.style.cursor = 'grabbing';
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;
    userRotY += dx * 0.008;
    userRotX = Math.max(-0.8, Math.min(0.8, userRotX + dy * 0.006));
  };
  const onPointerUp = () => {
    isDragging = false;
    if (canvasEl) canvasEl.style.cursor = 'grab';
  };

  if (canvasEl) {
    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  }

  const startTime = performance.now();

  const animate = () => {
    if (disposed) return;
    const elapsed = (performance.now() - startTime) * 0.001;

    coreMesh.rotation.y = elapsed * 0.55;
    coreMesh.rotation.x = elapsed * 0.32;
    cageMesh.rotation.y = -elapsed * 0.38;
    cageMesh.rotation.z = elapsed * 0.25;

    rootGroup.rotation.y = elapsed * 0.14 + userRotY;
    rootGroup.rotation.x = userRotX;

    chainNodes.forEach((cn) => {
      const angle = elapsed * cn.speed + cn.phase;
      const x = Math.cos(angle) * cn.orbitRadius;
      const z = Math.sin(angle) * cn.orbitRadius;
      const y = Math.sin(angle * 1.5) * 0.35;
      cn.node.position.set(x, y, z);
      cn.node.rotation.y = elapsed * 1.4;
    });

    if (cameraMode === 'orbit') {
      camera.position.lerp(new THREE.Vector3(0, 3.1, 7.6), 0.06);
      camera.lookAt(0, 0, 0);
    } else if (cameraMode === 'top') {
      camera.position.lerp(new THREE.Vector3(0, 8.8, 0.4), 0.06);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.lerp(new THREE.Vector3(0, 1.2, 4.4), 0.06);
      camera.lookAt(0, 0, 0);
    }

    if (renderer) {
      renderer.render(scene, camera);
    }
    animationFrameId = requestAnimationFrame(animate);
  };

  if (typeof requestAnimationFrame === 'function') {
    animationFrameId = requestAnimationFrame(animate);
  }

  function setActiveChain(chain: CryptoChainId): void {
    currentChain = chain;
    const hex = CHAIN_HEX_COLORS[chain] ?? 0xf4f03a;
    coreMat.emissive.setHex(hex);
    cageMat.color.setHex(hex);
    accentPointLight.color.setHex(hex);

    chainNodes.forEach((cn) => {
      const selected = cn.id === chain;
      (cn.ring.material as THREE.MeshBasicMaterial).opacity = selected ? 0.95 : 0.28;
      (cn.node.material as THREE.MeshStandardMaterial).emissiveIntensity = selected
        ? 1.0
        : 0.35;
      cn.node.scale.setScalar(selected ? 1.35 : 0.9);
    });
  }

  function setCameraMode(mode: VaultCameraMode): void {
    cameraMode = mode;
  }

  function dispose(): void {
    disposed = true;
    if (animationFrameId && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(animationFrameId);
    }
    if (canvasEl) {
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    }
    coreGeo.dispose();
    coreMat.dispose();
    cageGeo.dispose();
    cageMat.dispose();
    particleGeo.dispose();
    particleMat.dispose();
    chainNodes.forEach((cn) => {
      cn.ring.geometry.dispose();
      (cn.ring.material as THREE.Material).dispose();
      cn.node.geometry.dispose();
      (cn.node.material as THREE.Material).dispose();
    });
    if (renderer) {
      renderer.dispose();
    }
  }

  return {
    setCameraMode,
    setActiveChain,
    dispose,
  };
}
