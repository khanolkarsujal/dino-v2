import { CAMP_RADIUS, type ResourceBundle } from './data';
import type { SettlementState } from './exploration';

export const CENTRAL_CONTROL_RADIUS = CAMP_RADIUS + 14;
export const OUTPOST_CONTROL_RADIUS = 22;

export const OUTPOST_CLAIM_COST: ResourceBundle = {
  gold: 25,
  wood: 30,
  stone: 15,
  ember: 0,
};

export interface TerritoryCheckResult {
  controlled: boolean;
  anchorName: string;
  anchorX: number;
  anchorZ: number;
  settlementId: string | null;
}

export function isPointInControlledTerritory(
  settlements: ReadonlyArray<SettlementState>,
  x: number,
  z: number,
): TerritoryCheckResult {
  if (Math.hypot(x, z) <= CENTRAL_CONTROL_RADIUS) {
    return {
      controlled: true,
      anchorName: 'Sunfire Sanctuary',
      anchorX: 0,
      anchorZ: 0,
      settlementId: null,
    };
  }
  for (const s of settlements) {
    if (!s.claimed) continue;
    if (Math.hypot(x - s.x, z - s.z) <= OUTPOST_CONTROL_RADIUS) {
      return {
        controlled: true,
        anchorName: s.name,
        anchorX: s.x,
        anchorZ: s.z,
        settlementId: s.id,
      };
    }
  }
  return {
    controlled: false,
    anchorName: 'Unclaimed Wilds',
    anchorX: 0,
    anchorZ: 0,
    settlementId: null,
  };
}

export function getClaimedOutposts(
  settlements: ReadonlyArray<SettlementState>,
): SettlementState[] {
  return settlements.filter((s) => s.claimed);
}

export function getSafeAnchorForPosition(
  settlements: ReadonlyArray<SettlementState>,
  x: number,
  z: number,
): { x: number; z: number; name: string } {
  let bestX = 0;
  let bestZ = 0;
  let bestName = 'Sunfire Sanctuary';
  let bestDist = Math.hypot(x, z);

  for (const s of settlements) {
    if (!s.claimed || s.hp <= 0) continue;
    const d = Math.hypot(x - s.x, z - s.z);
    if (d < bestDist) {
      bestDist = d;
      bestX = s.x;
      bestZ = s.z;
      bestName = s.name;
    }
  }
  return { x: bestX, z: bestZ, name: bestName };
}
