import * as THREE from 'three';
import { CAMP_RADIUS } from '../game/data';
import {
  CAVE_BLUEPRINTS,
  JAIL_BLUEPRINTS,
  REGION_ROADS,
  RUIN_BLUEPRINTS,
} from '../game/regionMap';

export const GROUND_MESH_RADIUS = 420;

export function createGroundTextures(maxAnisotropy: number): {
  colorMap: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
} {
  const size = 1024;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = size;
  colorCanvas.height = size;
  const ctx = colorCanvas.getContext('2d')!;

  const toCanvas = (wx: number, wz: number) => ({
    x: (wx / (GROUND_MESH_RADIUS * 2) + 0.5) * size,
    y: (wz / (GROUND_MESH_RADIUS * 2) + 0.5) * size,
  });
  const worldScale = size / (GROUND_MESH_RADIUS * 2);

  // 1. Base lush grassland meadow filling the entire map in all directions
  ctx.fillStyle = '#457838';
  ctx.fillRect(0, 0, size, size);

  // 2. Rolling grassland variations across all directions
  const paintGrassBlob = (
    wx: number,
    wz: number,
    radMeters: number,
    innerColor: string,
    outerColor: string,
  ) => {
    const c = toCanvas(wx, wz);
    const r = radMeters * worldScale;
    const g = ctx.createRadialGradient(c.x, c.y, r * 0.15, c.x, c.y, r);
    g.addColorStop(0, innerColor);
    g.addColorStop(1, outerColor);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  // Full lush rolling grassland fields across all quadrants and horizon directions
  paintGrassBlob(100, 80, 180, 'rgba(74, 132, 58, 0.9)', 'rgba(74, 132, 58, 0)');
  paintGrassBlob(-120, 140, 190, 'rgba(64, 118, 50, 0.92)', 'rgba(64, 118, 50, 0)');
  paintGrassBlob(-140, -120, 200, 'rgba(84, 142, 66, 0.88)', 'rgba(84, 142, 66, 0)');
  paintGrassBlob(120, -150, 210, 'rgba(68, 124, 52, 0.92)', 'rgba(68, 124, 52, 0)');
  paintGrassBlob(0, 220, 220, 'rgba(78, 138, 60, 0.88)', 'rgba(78, 138, 60, 0)');
  paintGrassBlob(-220, 0, 220, 'rgba(86, 148, 68, 0.88)', 'rgba(86, 148, 68, 0)');
  paintGrassBlob(220, 0, 220, 'rgba(62, 114, 48, 0.9)', 'rgba(62, 114, 48, 0)');
  paintGrassBlob(0, -220, 220, 'rgba(72, 128, 54, 0.9)', 'rgba(72, 128, 54, 0)');

  // 3. Organic ground mottling
  let s = 1337;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let i = 0; i < 2400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 2 + rand() * 9;
    const pick = rand();
    ctx.fillStyle =
      pick < 0.36
        ? 'rgba(78, 108, 56, 0.14)'
        : pick < 0.72
          ? 'rgba(26, 38, 22, 0.18)'
          : 'rgba(98, 86, 62, 0.14)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Winding Frontier Roads (broad dirt margin + warm stone/gravel track)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const road of REGION_ROADS) {
    ctx.strokeStyle = 'rgba(72, 56, 40, 0.78)';
    ctx.lineWidth = 10.5 * worldScale;
    ctx.beginPath();
    road.points.forEach(([px, pz], idx) => {
      const c = toCanvas(px, pz);
      if (idx === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();

    ctx.strokeStyle = 'rgba(138, 114, 82, 0.85)';
    ctx.lineWidth = 6.2 * worldScale;
    ctx.beginPath();
    road.points.forEach(([px, pz], idx) => {
      const c = toCanvas(px, pz);
      if (idx === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();

    // Central cobble flecks
    ctx.strokeStyle = 'rgba(168, 148, 116, 0.35)';
    ctx.lineWidth = 2.4 * worldScale;
    ctx.setLineDash([4, 6]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // 5. Landmark Ground Pads (Sunfire Sanctuary + Caves + Ruins + Jails)
  const center = toCanvas(0, 0);
  const campR = CAMP_RADIUS * worldScale;
  const hearthGrad = ctx.createRadialGradient(center.x, center.y, campR * 0.2, center.x, center.y, campR);
  hearthGrad.addColorStop(0, 'rgba(128, 108, 84, 0.85)');
  hearthGrad.addColorStop(0.75, 'rgba(84, 96, 66, 0.65)');
  hearthGrad.addColorStop(1, 'rgba(51, 77, 45, 0)');
  ctx.fillStyle = hearthGrad;
  ctx.beginPath();
  ctx.arc(center.x, center.y, campR, 0, Math.PI * 2);
  ctx.fill();

  for (const cave of CAVE_BLUEPRINTS) {
    paintGrassBlob(cave.x, cave.z, 14, 'rgba(52, 92, 42, 0.75)', 'rgba(52, 92, 42, 0)');
  }
  for (const ruin of RUIN_BLUEPRINTS) {
    paintGrassBlob(ruin.x, ruin.z, 10, 'rgba(92, 128, 72, 0.65)', 'rgba(92, 128, 72, 0)');
  }
  for (const jail of JAIL_BLUEPRINTS) {
    paintGrassBlob(jail.x, jail.z, 8, 'rgba(68, 108, 52, 0.7)', 'rgba(68, 108, 52, 0)');
  }

  // Fine surface pebbles
  for (let i = 0; i < 4000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() < 0.5 ? 'rgba(145, 160, 110, 0.2)' : 'rgba(20, 26, 18, 0.22)';
    ctx.fillRect(x, y, 2, 2);
  }

  // 6. Tiled micro-bump canvas
  const bumpSize = 256;
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = bumpSize;
  bumpCanvas.height = bumpSize;
  const bctx = bumpCanvas.getContext('2d')!;
  bctx.fillStyle = '#808080';
  bctx.fillRect(0, 0, bumpSize, bumpSize);
  for (let i = 0; i < 900; i++) {
    const x = rand() * bumpSize;
    const y = rand() * bumpSize;
    const r = 2 + rand() * 8;
    const g = Math.round(105 + rand() * 55);
    bctx.fillStyle = `rgba(${g},${g},${g},0.35)`;
    bctx.beginPath();
    bctx.arc(x, y, r, 0, Math.PI * 2);
    bctx.fill();
  }

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = maxAnisotropy;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;
  bumpMap.wrapT = THREE.RepeatWrapping;
  bumpMap.repeat.set(34, 34);
  bumpMap.anisotropy = maxAnisotropy;

  return { colorMap, bumpMap };
}

export function createStoneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#5c626b';
  ctx.fillRect(0, 0, size, size);

  let s = 4242;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let row = 0; row < 8; row++) {
    const y = row * 32;
    const offset = (row % 2) * 32;
    for (let col = -1; col < 5; col++) {
      const x = col * 64 + offset;
      const shade = 78 + Math.floor(rand() * 34);
      ctx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 10})`;
      ctx.fillRect(x + 2, y + 2, 60, 28);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  grad.addColorStop(0.65, 'rgba(0, 0, 0, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
