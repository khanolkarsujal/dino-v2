import { type ResourceBundle } from './data';
import { getMoraleWorkSpeedMult, type SettlementMorale } from './economy';

export type WorkerRole =
  | 'unassigned'
  | 'woodcutter'
  | 'builder'
  | 'farmer'
  | 'guard'
  | 'scout';

export type WorkerAiState =
  | 'idle'
  | 'moving'
  | 'working'
  | 'returning'
  | 'fleeing'
  | 'defending';

export interface SurvivorUnit {
  id: number;
  name: string;
  x: number;
  z: number;
  costGold: number;
  sourceId: string; // settlementId or 'recruitment_camp'
  recruited: boolean;
}

export interface WorkerUnit {
  id: number;
  name: string;
  role: WorkerRole;
  aiState: WorkerAiState;
  activityLabel: string;
  x: number;
  z: number;
  vx: number;
  vz: number;
  facingX: number;
  facingZ: number;
  hp: number;
  maxHp: number;
  downTimer: number;
  homeX: number;
  homeZ: number;
  targetX: number;
  targetZ: number;
  targetId: number | null;
  targetWallSide: string | null;
  workTimer: number;
  carryKind: 'wood' | 'food' | 'stone' | null;
  carryAmount: number;
  attackCooldown: number;
  attackAnim: number;
  hitFlash: number;
  scoutAngle: number;
  arrivedAtCamp: boolean;
}

export interface WorkerRoleMeta {
  role: WorkerRole;
  label: string;
  shortLabel: string;
  color: string;
  hatColor: string;
  description: string;
}

export const WORKER_ROLE_META: Record<WorkerRole, WorkerRoleMeta> = {
  unassigned: {
    role: 'unassigned',
    label: 'Settler',
    shortLabel: 'Idle',
    color: '#cbd5e1',
    hatColor: '#94a3b8',
    description: 'Newly arrived survivor awaiting role assignment.',
  },
  woodcutter: {
    role: 'woodcutter',
    label: 'Woodcutter',
    shortLabel: 'Chop',
    color: '#6ee7b7',
    hatColor: '#2f7a43',
    description: 'Harvests timber groves and hauls Wood back to the Campfire.',
  },
  builder: {
    role: 'builder',
    label: 'Builder',
    shortLabel: 'Build',
    color: '#fcd34d',
    hatColor: '#c27829',
    description: 'Constructs buildings faster and repairs damaged walls & structures.',
  },
  farmer: {
    role: 'farmer',
    label: 'Farmer',
    shortLabel: 'Farm',
    color: '#bef264',
    hatColor: '#8f9e36',
    description: 'Tends Farms & forage patches to sustain settlement Food.',
  },
  guard: {
    role: 'guard',
    label: 'Guard',
    shortLabel: 'Guard',
    color: '#93c5fd',
    hatColor: '#3b6ca8',
    description: 'Patrols perimeter walls & watchtowers and fights attacking beasts.',
  },
  scout: {
    role: 'scout',
    label: 'Scout',
    shortLabel: 'Scout',
    color: '#d8b4fe',
    hatColor: '#6d3f8f',
    description: 'Explores beyond camp during daylight to lift Fog of War.',
  },
};

export const ASSIGNABLE_ROLES: WorkerRole[] = [
  'woodcutter',
  'builder',
  'farmer',
  'guard',
  'scout',
];

const WORKER_NAMES = [
  'Alden',
  'Bryn',
  'Cora',
  'Doran',
  'Elara',
  'Fenn',
  'Garrick',
  'Hilda',
  'Ivo',
  'Jora',
  'Kael',
  'Lina',
];

export function pickSuggestedWorkerRole(existingWorkers: ReadonlyArray<WorkerUnit>): WorkerRole {
  const counts: Record<WorkerRole, number> = {
    unassigned: 0,
    woodcutter: 0,
    builder: 0,
    farmer: 0,
    guard: 0,
    scout: 0,
  };
  for (const w of existingWorkers) {
    counts[w.role]++;
  }
  if (counts.woodcutter === 0) return 'woodcutter';
  if (counts.farmer === 0) return 'farmer';
  if (counts.builder === 0) return 'builder';
  if (counts.guard === 0) return 'guard';
  if (counts.woodcutter < 2) return 'woodcutter';
  if (counts.farmer < 2) return 'farmer';
  if (counts.scout === 0) return 'scout';
  return 'guard';
}

export function createWorkerFromSurvivor(
  id: number,
  index: number,
  survivor: SurvivorUnit,
  role: WorkerRole,
): WorkerUnit {
  const maxHp = role === 'guard' ? 165 : 90;
  return {
    id,
    name: survivor.name || WORKER_NAMES[index % WORKER_NAMES.length],
    role,
    aiState: 'moving',
    activityLabel: 'Traveling to Sanctuary Campfire',
    x: survivor.x,
    z: survivor.z,
    vx: 0,
    vz: 0,
    facingX: -survivor.x / (Math.hypot(survivor.x, survivor.z) || 1),
    facingZ: -survivor.z / (Math.hypot(survivor.x, survivor.z) || 1),
    hp: maxHp,
    maxHp,
    downTimer: 0,
    homeX: 0,
    homeZ: 0,
    targetX: 0,
    targetZ: 4.5,
    targetId: null,
    targetWallSide: null,
    workTimer: 0,
    carryKind: null,
    carryAmount: 0,
    attackCooldown: 0,
    attackAnim: 0,
    hitFlash: 0,
    scoutAngle: (index * 1.45) % (Math.PI * 2),
    arrivedAtCamp: Math.hypot(survivor.x, survivor.z) <= 14,
  };
}

export function assignWorkerRole(worker: WorkerUnit, nextRole: WorkerRole): void {
  worker.role = nextRole;
  worker.maxHp = nextRole === 'guard' ? 165 : 90;
  worker.hp = Math.min(worker.maxHp, worker.hp + (nextRole === 'guard' ? 40 : 0));
  worker.workTimer = 0;
  worker.targetId = null;
  worker.targetWallSide = null;
  if (worker.arrivedAtCamp) {
    worker.aiState = 'idle';
    worker.activityLabel = `Ready (${WORKER_ROLE_META[nextRole].label})`;
  }
}

export function canRecruitSurvivor(
  resources: ResourceBundle,
  morale: SettlementMorale,
  survivor: SurvivorUnit,
): { ok: boolean; reason?: string } {
  if (survivor.recruited) {
    return { ok: false, reason: 'Survivor has already joined your kingdom.' };
  }
  if (morale === 'hungry' && (resources.food ?? 0) < 4) {
    return { ok: false, reason: 'Settlement is starving! Gather Food before recruiting more workers.' };
  }
  if ((resources.gold ?? 0) < survivor.costGold) {
    return { ok: false, reason: `Need ${survivor.costGold} Gold to recruit ${survivor.name}.` };
  }
  return { ok: true };
}

export function getWorkerMoveSpeed(role: WorkerRole, morale: SettlementMorale, aiState: WorkerAiState): number {
  const base = role === 'scout' ? 6.2 : role === 'guard' ? 5.6 : 4.8;
  const fleeBoost = aiState === 'fleeing' ? 1.25 : 1.0;
  return base * fleeBoost * getMoraleWorkSpeedMult(morale);
}

export function formatWorkerStateLabel(worker: WorkerUnit): string {
  return worker.activityLabel || `${WORKER_ROLE_META[worker.role].label} (${worker.aiState})`;
}

export function pickSurvivorName(index: number): string {
  return WORKER_NAMES[index % WORKER_NAMES.length];
}
