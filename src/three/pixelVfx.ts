import * as THREE from 'three';
import { DRAGON_ABILITY_CONFIG } from '../game/dragonConfig';

const MAX_POOL = DRAGON_ABILITY_CONFIG.pixelVfx.maxParticlesPerPool; // 128
const MAX_LIGHTNING = DRAGON_ABILITY_CONFIG.pixelVfx.maxLightningSegments; // 48
const MAX_NUMBERS = DRAGON_ABILITY_CONFIG.pixelVfx.maxFloatingNumbers; // 48

type PixelShape = 'spark' | 'flame' | 'ice' | 'slash';

interface PixelParticleSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  gravity: number;
  life: number;
  maxLife: number;
  size: number;
  growRate: number;
  roll: number;
  spin: number;
  color: THREE.Color;
}

interface LightningSlot {
  active: boolean;
  mx: number;
  my: number;
  mz: number;
  dirX: number;
  dirY: number;
  dirZ: number;
  length: number;
  thickness: number;
  life: number;
  maxLife: number;
  color: THREE.Color;
}

interface FloatingNumSlot {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
  crit: boolean;
}

const _mat4 = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _camForward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _segDir = new THREE.Vector3();
const _segNormal = new THREE.Vector3();
const _proj = new THREE.Vector3();
const _rotMat = new THREE.Matrix4();

function createPixelAtlasTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, 64, 16);

  const put = (ox: number, px: number, py: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(ox + px, py, 1, 1);
  };

  // Tile 0 (ox = 0): Crisp blocky pixel spark / ember diamond
  for (let y = 3; y <= 12; y++) {
    for (let x = 3; x <= 12; x++) {
      const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      if (d <= 5.2) {
        put(0, x, y, d <= 2.4 ? '#ffffff' : '#d8d8d8');
      }
    }
  }

  // Tile 1 (ox = 16): Stepped pixel flame puff
  const flameMask = [
    '0000011110000000',
    '0000112211000000',
    '0001122221100000',
    '0011223322110000',
    '0012233332210000',
    '0112333333211000',
    '0122333333221000',
    '0122333333221000',
    '0012233332210000',
    '0011223322110000',
    '0001122221100000',
    '0000111111000000',
  ];
  for (let y = 0; y < flameMask.length; y++) {
    const row = flameMask[y];
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch === '0') continue;
      put(16, x, y + 2, ch === '3' ? '#ffffff' : ch === '2' ? '#ebebeb' : '#bcbcbc');
    }
  }

  // Tile 2 (ox = 32): Crisp pixel snowflake / ice shard
  for (let i = 2; i <= 13; i++) {
    put(32, 7, i, '#ffffff');
    put(32, 8, i, '#ffffff');
    put(32, i, 7, '#ffffff');
    put(32, i, 8, '#ffffff');
  }
  for (let d = -4; d <= 4; d++) {
    put(32, 7 + d, 7 + d, '#d9f7ff');
    put(32, 8 - d, 7 + d, '#d9f7ff');
  }
  put(32, 7, 3, '#b8ecff');
  put(32, 8, 3, '#b8ecff');
  put(32, 7, 12, '#b8ecff');
  put(32, 8, 12, '#b8ecff');

  // Tile 3 (ox = 48): Crisp pixel crescent slash
  const slashRows = [
    '0000000011100000',
    '0000001122210000',
    '0000012222221000',
    '0000122221110000',
    '0001222100000000',
    '0012221000000000',
    '0012221000000000',
    '0122210000000000',
    '0122210000000000',
    '0012221000000000',
    '0012221000000000',
    '0001222100000000',
    '0000122221110000',
    '0000012222221000',
    '0000001122210000',
    '0000000011100000',
  ];
  for (let y = 0; y < 16; y++) {
    const row = slashRows[y];
    for (let x = 0; x < 16; x++) {
      const ch = row[x];
      if (ch === '0') continue;
      put(48, x, y, ch === '2' ? '#ffffff' : '#cfd8dc');
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function createSolidBoltTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 8;
  c.height = 8;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 8, 8);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function makeSubtilePlaneGeometry(tileIdx: number, tileCount: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(1, 1);
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute;
  const eps = 0.005;
  const u0 = tileIdx / tileCount + eps;
  const u1 = (tileIdx + 1) / tileCount - eps;
  // PlaneGeometry vertex order: 0=TL, 1=TR, 2=BL, 3=BR
  uv.setXY(0, u0, 1 - eps);
  uv.setXY(1, u1, 1 - eps);
  uv.setXY(2, u0, eps);
  uv.setXY(3, u1, eps);
  uv.needsUpdate = true;
  return geo;
}

interface PoolHandle {
  mesh: THREE.InstancedMesh;
  geo: THREE.PlaneGeometry;
  slots: PixelParticleSlot[];
  cursor: number;
}

export class PixelVfxSystem {
  private atlasTex: THREE.CanvasTexture;
  private boltTex: THREE.CanvasTexture;
  private particleMat: THREE.MeshBasicMaterial;
  private boltMat: THREE.MeshBasicMaterial;
  private pools: Record<PixelShape, PoolHandle>;
  private lightningMesh: THREE.InstancedMesh;
  private lightningGeo: THREE.PlaneGeometry;
  private lightningSlots: LightningSlot[];
  private lightningCursor = 0;

  constructor(private scene: THREE.Scene) {
    this.atlasTex = createPixelAtlasTexture();
    this.boltTex = createSolidBoltTexture();

    // Strictly hard-edged nearest-neighbor pixel rendering (no smooth glow / transparency)
    this.particleMat = new THREE.MeshBasicMaterial({
      map: this.atlasTex,
      color: 0xffffff,
      alphaTest: 0.5,
      depthWrite: true,
      transparent: false,
      side: THREE.DoubleSide,
    });

    this.boltMat = new THREE.MeshBasicMaterial({
      map: this.boltTex,
      color: 0xffffff,
      alphaTest: 0.5,
      depthWrite: true,
      transparent: false,
      side: THREE.DoubleSide,
    });

    const createPool = (tileIdx: number): PoolHandle => {
      const geo = makeSubtilePlaneGeometry(tileIdx, 4);
      const mesh = new THREE.InstancedMesh(geo, this.particleMat, MAX_POOL);
      mesh.frustumCulled = false;
      scene.add(mesh);
      const slots: PixelParticleSlot[] = Array.from({ length: MAX_POOL }, () => ({
        active: false,
        x: 0,
        y: -100,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        gravity: 0,
        life: 0,
        maxLife: 1,
        size: 0.3,
        growRate: 0,
        roll: 0,
        spin: 0,
        color: new THREE.Color('#ffffff'),
      }));
      return { mesh, geo, slots, cursor: 0 };
    };

    this.pools = {
      spark: createPool(0),
      flame: createPool(1),
      ice: createPool(2),
      slash: createPool(3),
    };

    this.lightningGeo = new THREE.PlaneGeometry(1, 1);
    this.lightningMesh = new THREE.InstancedMesh(this.lightningGeo, this.boltMat, MAX_LIGHTNING);
    this.lightningMesh.frustumCulled = false;
    scene.add(this.lightningMesh);
    this.lightningSlots = Array.from({ length: MAX_LIGHTNING }, () => ({
      active: false,
      mx: 0,
      my: -100,
      mz: 0,
      dirX: 1,
      dirY: 0,
      dirZ: 0,
      length: 1,
      thickness: 0.14,
      life: 0,
      maxLife: 0.16,
      color: new THREE.Color('#fff266'),
    }));
  }

  spawnParticle(
    shape: PixelShape,
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    gravity: number,
    life: number,
    size: number,
    hexColor: string,
    roll = 0,
    spin = 0,
    growRate = 0,
  ): void {
    const pool = this.pools[shape];
    const s = pool.slots[pool.cursor];
    pool.cursor = (pool.cursor + 1) % MAX_POOL;
    s.active = true;
    s.x = x;
    s.y = y;
    s.z = z;
    s.vx = vx;
    s.vy = vy;
    s.vz = vz;
    s.gravity = gravity;
    s.life = life;
    s.maxLife = life;
    s.size = size;
    s.growRate = growRate;
    s.roll = roll;
    s.spin = spin;
    s.color.set(hexColor);
  }

  spawnPixelBurst(
    shape: PixelShape,
    x: number,
    y: number,
    z: number,
    count: number,
    speed: number,
    palette: readonly string[],
    size = 0.42,
    life = 0.36,
  ): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = speed * (0.4 + Math.random() * 0.7);
      const col = palette[i % palette.length];
      this.spawnParticle(
        shape,
        x,
        y,
        z,
        Math.cos(a) * sp,
        1.5 + Math.random() * speed * 0.75,
        Math.sin(a) * sp,
        -9.5,
        life * (0.75 + Math.random() * 0.5),
        size * (0.85 + Math.random() * 0.35),
        col,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 6,
      );
    }
  }

  /**
   * Red Fire Dragon: Continuous pixel flame stream anchored at live mouth world pos
   */
  spawnFlameStream(
    mouthX: number,
    mouthY: number,
    mouthZ: number,
    dirX: number,
    dirZ: number,
    scale: number,
    count = 3,
  ): void {
    const firePal = ['#fff480', '#ffa726', '#ff5722', '#ff7043'];
    const perpX = -dirZ;
    const perpZ = dirX;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 0.42;
      const vx = (dirX + perpX * spread) * (10.5 + Math.random() * 4.2);
      const vz = (dirZ + perpZ * spread) * (10.5 + Math.random() * 4.2);
      const vy = (Math.random() - 0.45) * 1.4;
      const col = firePal[Math.floor(Math.random() * firePal.length)];
      this.spawnParticle(
        'flame',
        mouthX + dirX * 0.15,
        Math.max(0.45, mouthY),
        mouthZ + dirZ * 0.15,
        vx,
        vy,
        vz,
        0.7,
        0.34 + Math.random() * 0.16,
        (0.46 + Math.random() * 0.22) * scale,
        col,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 5,
        0.55,
      );
    }
    // Small rising pixel embers along stream
    if (Math.random() < 0.75) {
      this.spawnParticle(
        'spark',
        mouthX + dirX * (0.8 + Math.random() * 2.8),
        Math.max(0.35, mouthY * 0.8),
        mouthZ + dirZ * (0.8 + Math.random() * 2.8),
        dirX * 3.5 + (Math.random() - 0.5) * 2.0,
        2.6 + Math.random() * 1.8,
        dirZ * 3.5 + (Math.random() - 0.5) * 2.0,
        0.5,
        0.38,
        0.26 * scale,
        Math.random() < 0.5 ? '#ffe066' : '#ff6a22',
      );
    }
  }

  /**
   * Blue Ice Dragon: Frost cast + trailing snowflakes + crystal shatter burst
   */
  spawnFrostCast(mouthX: number, mouthY: number, mouthZ: number, dirX: number, dirZ: number, scale: number): void {
    const icePal = ['#ffffff', '#a6f4ff', '#4dd2ff'];
    for (let i = 0; i < 6; i++) {
      const sp = 2.5 + Math.random() * 3.2;
      this.spawnParticle(
        'ice',
        mouthX,
        Math.max(0.5, mouthY),
        mouthZ,
        dirX * sp + (Math.random() - 0.5) * 2.2,
        (Math.random() - 0.2) * 2.0,
        dirZ * sp + (Math.random() - 0.5) * 2.2,
        -2.5,
        0.34,
        0.42 * scale,
        icePal[i % icePal.length],
        Math.random() * Math.PI,
        4.5,
      );
    }
  }

  spawnFrostBallTrail(x: number, y: number, z: number): void {
    this.spawnParticle(
      'ice',
      x,
      y,
      z,
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 1.2,
      0,
      0.16,
      0.56,
      Math.random() < 0.45 ? '#ffffff' : '#64e5ff',
      Math.random() * Math.PI,
      5,
    );
  }

  spawnIceShatter(x: number, z: number, scale: number): void {
    this.spawnPixelBurst(
      'ice',
      x,
      1.0,
      z,
      10,
      5.5,
      ['#ffffff', '#b8f4ff', '#40c4ff', '#2196f3'],
      0.52 * scale,
      0.42,
    );
  }

  /**
   * Green Melee Dragon: 3-move combo VFX scaled at 1.4x
   */
  spawnMeleeSlash(
    handX: number,
    handY: number,
    handZ: number,
    dirX: number,
    dirZ: number,
    scale: number,
  ): void {
    const baseAngle = Math.atan2(dirZ, dirX);
    const pal = ['#f1ffba', '#9ce659', '#57b83c'];
    for (let i = 0; i < 4; i++) {
      const a = baseAngle + (i - 1.5) * 0.28;
      this.spawnParticle(
        'slash',
        handX + Math.cos(a) * 0.9 * scale,
        Math.max(0.65, handY),
        handZ + Math.sin(a) * 0.9 * scale,
        Math.cos(a) * 3.8,
        0.6,
        Math.sin(a) * 3.8,
        0,
        0.22,
        1.15 * scale,
        pal[i % pal.length],
        a,
        (i - 1.5) * 2.5,
      );
    }
  }

  spawnTailWhip(x: number, z: number, radius: number, scale: number): void {
    const pal = ['#f1ffba', '#8ee352', '#52b838'];
    const count = 10;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = radius * 0.58;
      this.spawnParticle(
        'slash',
        x + Math.cos(a) * r,
        0.85,
        z + Math.sin(a) * r,
        Math.cos(a) * 4.5,
        0.5,
        Math.sin(a) * 4.5,
        0,
        0.26,
        0.95 * scale,
        pal[i % pal.length],
        a + Math.PI * 0.5,
        7.5,
      );
    }
  }

  spawnHeavyBite(
    mouthX: number,
    mouthY: number,
    mouthZ: number,
    dirX: number,
    dirZ: number,
    scale: number,
  ): void {
    const fx = mouthX + dirX * 1.1;
    const fz = mouthZ + dirZ * 1.1;
    this.spawnPixelBurst('slash', fx, Math.max(0.75, mouthY), fz, 6, 5.2, ['#fff3a1', '#9fe85b'], 1.1 * scale, 0.25);
    this.spawnPixelBurst('spark', fx, Math.max(0.75, mouthY), fz, 10, 6.8, ['#ffffff', '#ffd54f', '#8ee352'], 0.45 * scale, 0.34);
  }

  /**
   * Yellow Electric Dragon: Jagged segmented pixel lightning + 0.8x sparks
   */
  spawnLightningSegment(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    colorHex: string,
    thickness = 0.14,
    life = 0.16,
  ): void {
    const slot = this.lightningSlots[this.lightningCursor];
    this.lightningCursor = (this.lightningCursor + 1) % MAX_LIGHTNING;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dz = z2 - z1;
    const len = Math.hypot(dx, dy, dz) || 0.01;
    slot.active = true;
    slot.mx = (x1 + x2) * 0.5;
    slot.my = (y1 + y2) * 0.5;
    slot.mz = (z1 + z2) * 0.5;
    slot.dirX = dx / len;
    slot.dirY = dy / len;
    slot.dirZ = dz / len;
    slot.length = len;
    slot.thickness = thickness;
    slot.life = life;
    slot.maxLife = life;
    slot.color.set(colorHex);
  }

  spawnLightningChain(
    originX: number,
    originY: number,
    originZ: number,
    targets: Array<{ x: number; z: number }>,
    scale: number,
  ): void {
    const pal = ['#ffffff', '#fff258', '#4dd2ff'];
    let px = originX;
    let py = Math.max(0.85, originY);
    let pz = originZ;

    for (let t = 0; t < targets.length; t++) {
      const tx = targets[t].x;
      const ty = 1.05;
      const tz = targets[t].z;

      // 3 jagged zigzag sub-segments per jump
      const subSteps = 3;
      let prevX = px;
      let prevY = py;
      let prevZ = pz;
      const dx = tx - px;
      const dz = tz - pz;
      const len = Math.hypot(dx, dz) || 1;
      const perpX = -dz / len;
      const perpZ = dx / len;

      for (let s = 1; s <= subSteps; s++) {
        const k = s / subSteps;
        const jitter = s < subSteps ? (s % 2 === 0 ? 0.55 : -0.55) * (0.7 + Math.random() * 0.5) : 0;
        const jx = px + dx * k + perpX * jitter;
        const jy = py + (ty - py) * k + (s < subSteps ? (Math.random() - 0.5) * 0.45 : 0);
        const jz = pz + dz * k + perpZ * jitter;
        const col = t === 0 && s === 1 ? '#ffffff' : pal[(t + s) % pal.length];
        this.spawnLightningSegment(
          prevX,
          prevY,
          prevZ,
          jx,
          jy,
          jz,
          col,
          (t === 0 ? 0.16 : 0.12) * scale,
          0.18,
        );
        prevX = jx;
        prevY = jy;
        prevZ = jz;
      }

      // 0.8x scaled hit sparks at each target
      this.spawnPixelBurst('spark', tx, 1.05, tz, 6, 4.8, pal, 0.36 * scale, 0.28);
      px = tx;
      py = ty;
      pz = tz;
    }
  }

  update(dt: number, camera: THREE.Camera): void {
    camera.getWorldDirection(_camForward);
    const camQuat = camera.quaternion;

    // 1. Update all 4 pixel sprite instanced pools
    for (const key of ['spark', 'flame', 'ice', 'slash'] as PixelShape[]) {
      const pool = this.pools[key];
      for (let i = 0; i < MAX_POOL; i++) {
        const s = pool.slots[i];
        if (s.active) {
          s.life -= dt;
          if (s.life <= 0) {
            s.active = false;
            _pos.set(0, -100, 0);
            _scale.setScalar(0.001);
            _quat.identity();
          } else {
            s.vy += s.gravity * dt;
            s.x += s.vx * dt;
            s.y = Math.max(0.08, s.y + s.vy * dt);
            s.z += s.vz * dt;
            s.roll += s.spin * dt;
            const ageFrac = 1 - s.life / s.maxLife;
            // Stepped pixel decay (keeps hard pixel edge without smooth fading)
            const lifeScale = s.life < 0.08 ? 0.55 : 1.0;
            const sz = Math.max(0.08, (s.size + s.growRate * ageFrac) * lifeScale);
            _pos.set(s.x, s.y, s.z);
            _quat.copy(camQuat);
            if (s.roll !== 0) {
              _right.set(0, 0, 1);
              _mat4.makeRotationAxis(_right, s.roll);
              _quat.multiply(new THREE.Quaternion().setFromRotationMatrix(_mat4));
            }
            _scale.set(sz, sz, 1);
            pool.mesh.setColorAt(i, s.color);
          }
        } else {
          _pos.set(0, -100, 0);
          _scale.setScalar(0.001);
          _quat.identity();
        }
        _mat4.compose(_pos, _quat, _scale);
        pool.mesh.setMatrixAt(i, _mat4);
      }
      pool.mesh.instanceMatrix.needsUpdate = true;
      if (pool.mesh.instanceColor) pool.mesh.instanceColor.needsUpdate = true;
    }

    // 2. Update jagged pixel lightning segments (with slight flicker thickness)
    for (let i = 0; i < MAX_LIGHTNING; i++) {
      const l = this.lightningSlots[i];
      if (l.active) {
        l.life -= dt;
        if (l.life <= 0) {
          l.active = false;
          _pos.set(0, -100, 0);
          _scale.setScalar(0.001);
          _quat.identity();
        } else {
          const flicker = Math.floor(l.life * 60) % 2 === 0 ? 1.15 : 0.72;
          _segDir.set(l.dirX, l.dirY, l.dirZ).normalize();
          _segNormal.subVectors(camera.position, _pos.set(l.mx, l.my, l.mz)).normalize();
          _up.crossVectors(_segNormal, _segDir);
          if (_up.lengthSq() < 1e-4) _up.set(0, 1, 0);
          else _up.normalize();
          _segNormal.crossVectors(_segDir, _up).normalize();
          _rotMat.makeBasis(_segDir, _up, _segNormal);
          _quat.setFromRotationMatrix(_rotMat);
          _pos.set(l.mx, l.my, l.mz);
          _scale.set(l.length + 0.06, l.thickness * flicker, 1);
          this.lightningMesh.setColorAt(i, l.color);
        }
      } else {
        _pos.set(0, -100, 0);
        _scale.setScalar(0.001);
        _quat.identity();
      }
      _mat4.compose(_pos, _quat, _scale);
      this.lightningMesh.setMatrixAt(i, _mat4);
    }
    this.lightningMesh.instanceMatrix.needsUpdate = true;
    if (this.lightningMesh.instanceColor) this.lightningMesh.instanceColor.needsUpdate = true;
  }

  clear(): void {
    for (const key of ['spark', 'flame', 'ice', 'slash'] as PixelShape[]) {
      for (const s of this.pools[key].slots) s.active = false;
    }
    for (const l of this.lightningSlots) l.active = false;
  }

  dispose(): void {
    for (const key of ['spark', 'flame', 'ice', 'slash'] as PixelShape[]) {
      const p = this.pools[key];
      this.scene.remove(p.mesh);
      p.geo.dispose();
    }
    this.scene.remove(this.lightningMesh);
    this.lightningGeo.dispose();
    this.particleMat.dispose();
    this.boltMat.dispose();
    this.atlasTex.dispose();
    this.boltTex.dispose();
  }
}

/**
 * Pooled 2D canvas overlay for crisp floating pixel damage numbers & status popups.
 * Zero DOM node churn and zero React re-renders per hit.
 */
export class FloatingDamageOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private slots: FloatingNumSlot[];
  private cursor = 0;
  private width = 1;
  private height = 1;

  constructor(private container: HTMLElement) {
    this.canvas = document.createElement('canvas');
    this.canvas.style.position = 'absolute';
    this.canvas.style.inset = '0';
    this.canvas.style.width = '100%';
    this.canvas.style.height = '100%';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '5';
    container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
    this.slots = Array.from({ length: MAX_NUMBERS }, () => ({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 1.5,
      life: 0,
      maxLife: 0.7,
      text: '',
      color: '#ffffff',
      crit: false,
    }));
    this.resize();
  }

  resize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.width = w;
    this.height = h;
    this.canvas.width = w;
    this.canvas.height = h;
  }

  spawn(
    x: number,
    z: number,
    text: string,
    color: string,
    crit = false,
    y = 1.65,
  ): void {
    const s = this.slots[this.cursor];
    this.cursor = (this.cursor + 1) % MAX_NUMBERS;
    s.active = true;
    s.x = x + (Math.random() - 0.5) * 0.55;
    s.y = y;
    s.z = z + (Math.random() - 0.5) * 0.4;
    s.vx = (Math.random() - 0.5) * 0.7;
    s.vy = crit ? 2.4 : 1.75;
    s.life = crit ? 0.75 : 0.6;
    s.maxLife = s.life;
    s.text = text;
    s.color = color;
    s.crit = crit;
  }

  clear(): void {
    for (const s of this.slots) s.active = false;
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  updateAndDraw(dt: number, camera: THREE.Camera): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < MAX_NUMBERS; i++) {
      const s = this.slots[i];
      if (!s.active) continue;
      s.life -= dt;
      if (s.life <= 0) {
        s.active = false;
        continue;
      }
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy = Math.max(0.4, s.vy - 2.4 * dt);

      _proj.set(s.x, s.y, s.z).project(camera);
      if (_proj.z > 1) continue;

      const sx = Math.round((_proj.x * 0.5 + 0.5) * this.width);
      const sy = Math.round((-_proj.y * 0.5 + 0.5) * this.height);

      const fontSize = s.crit ? 15 : 12;
      ctx.font = `700 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.fillStyle = '#0d0f14';
      ctx.fillText(s.text, sx + 1.5, sy + 1.5);
      ctx.fillText(s.text, sx - 1, sy);
      ctx.fillStyle = s.color;
      ctx.fillText(s.text, sx, sy);
    }
  }

  dispose(): void {
    if (this.canvas.parentElement === this.container) {
      this.container.removeChild(this.canvas);
    }
  }
}
