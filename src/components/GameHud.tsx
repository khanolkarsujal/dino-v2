import React from 'react';
import {
  Brain,
  Compass,
  Flame,
  FlaskConical,
  Hammer,
  Map as MapIcon,
  Moon,
  Pause,
  Shield,
  Sparkles,
  Store,
  Sun,
  Swords,
  Volume2,
  VolumeX,
  Wind,
  Wrench,
  X,
} from 'lucide-react';
import {
  BUILDING_DEFS,
  type BuildingKind,
  DRAGON_ARCHETYPES,
  DRAGON_RARITY_META,
  type DragonCommand,
  FINAL_WAVE,
  RELIC_FORGE_UPGRADES,
  type RelicForgeDef,
  WALL_TIER_DEFS,
  type WallTier,
  WORLD_RADIUS,
} from '../game/data';
import { DRAGON_ABILITY_CONFIG } from '../game/dragonConfig';
import { canAfford } from '../game/balance';
import {
  formatResourceCost,
  MARKET_TRADES,
  type MarketTradeAction,
} from '../game/economy';
import {
  getDailyFoodUpkeepSnapshot,
  getDragonCapacity,
  getDragonWallMultiplier,
  getIntactWallSidesCount,
  getKingdomStageSnapshot,
  getMaxDragonLevel,
  getMissionObjective,
  getSquadDps,
  getWallRepairCost,
  type GameState,
} from '../game/engine';
import { getActiveTargetCave, isCaveWarded, REGION_ROADS } from '../game/regionMap';
import { getClaimedOutposts } from '../game/territory';
import { ASSIGNABLE_ROLES, WORKER_ROLE_META, type WorkerRole } from '../game/workers';
import { WorldMapModal } from './WorldMapModal';

export type SandboxAction =
  | 'fire'
  | 'ice'
  | 'earth'
  | 'electric'
  | 'pack'
  | 'huge'
  | 'boss'
  | 'all_sizes';

interface GameHudProps {
  state: GameState;
  muted: boolean;
  buildOpen: boolean;
  mapOpen: boolean;
  sandboxOpen: boolean;
  banner: { title: string; subtitle: string; color: string } | null;
  toast?: { title: string; subtitle: string; color: string } | null;
  buildMessage: string | null;
  onToggleMute: () => void;
  onToggleMap: () => void;
  onToggleSandbox: () => void;
  onSandboxAction: (action: SandboxAction) => void;
  onOpenStudio: () => void;
  onPause: () => void;
  onToggleBuild: () => void;
  onSelectBuild: (kind: BuildingKind | null) => void;
  onQuickBuildAroundCamp: (kind: BuildingKind) => void;
  onCommand: (cmd: DragonCommand) => void;
  onTriggerAttack: () => void;
  onTriggerDash: () => void;
  onTriggerInteract: () => void;
  onSummonWave: () => void;
  onUpgradeWalls: () => void;
  onRepairWalls: () => void;
  onAssignWorkerRole: (workerId: number, role: WorkerRole) => void;
  onRepairBuilding: (buildingId: number) => void;
  onDemolishBuilding: (buildingId: number) => void;
  onMarketTrade: (action: MarketTradeAction) => void;
  onForgeRelic: (forgeId: RelicForgeDef['id']) => void;
  onClearSelection: () => void;
}

const BUILDING_ORDER: BuildingKind[] = [
  'nest',
  'lumber',
  'quarry',
  'farm',
  'watchtower',
  'training',
  'sanctuary',
  'recruitment',
  'workshop',
  'wall',
];

export const GameHud: React.FC<GameHudProps> = ({
  state,
  muted,
  buildOpen,
  mapOpen,
  sandboxOpen,
  banner,
  toast,
  buildMessage,
  onToggleMute,
  onToggleMap,
  onToggleSandbox,
  onSandboxAction,
  onOpenStudio,
  onPause,
  onToggleBuild,
  onSelectBuild,
  onQuickBuildAroundCamp,
  onCommand,
  onTriggerAttack,
  onTriggerDash,
  onTriggerInteract,
  onSummonWave,
  onUpgradeWalls,
  onRepairWalls,
  onAssignWorkerRole,
  onRepairBuilding,
  onDemolishBuilding,
  onMarketTrade,
  onForgeRelic,
  onClearSelection,
}) => {
  const [tradeOpen, setTradeOpen] = React.useState(false);
  const campPct = Math.max(0, Math.min(100, (state.campfireHp / state.campfireMaxHp) * 100));
  const playerPct = Math.max(0, Math.min(100, (state.player.hp / state.player.maxHp) * 100));
  const aliveCaves = state.caves.filter((c) => c.alive).length;
  const aliveEnemies = state.enemies.filter((e) => e.koTimer <= 0).length + state.waveQueue.length;
  const boss = state.enemies.find((e) => e.kind === 'boss' && e.koTimer <= 0);
  const wardens = state.enemies.filter((e) => e.kind === 'warden' && e.koTimer <= 0);
  const dragonCap = getDragonCapacity(state);
  const squadDps = getSquadDps(state);
  const objective = getMissionObjective(state);
  const activeTargetCave = getActiveTargetCave(state.caves);
  const claimedRuins = state.ruins.filter((r) => r.claimed).length;

  const intactSides = getIntactWallSidesCount(state);
  const wallMult = getDragonWallMultiplier(state);
  const wallPctDelta = Math.round((wallMult - 1) * 100);
  const wallDef = WALL_TIER_DEFS[state.wallTier];
  const nextWallTier = state.wallTier < 3 ? ((state.wallTier + 1) as WallTier) : null;
  const nextWallDef = nextWallTier !== null ? WALL_TIER_DEFS[nextWallTier] : null;
  const canUpgradeWall = nextWallDef ? canAfford(state.resources, nextWallDef.cost) : false;
  const repairCost = getWallRepairCost(state);
  const canRepairWall = repairCost ? canAfford(state.resources, repairCost) : false;
  const maxDragonLv = getMaxDragonLevel(state);
  const cyclePct = Math.max(0, Math.min(100, Math.round(state.dayCycleProgress * 100)));
  const kingdomStage = getKingdomStageSnapshot(state);
  const foodUpkeep = getDailyFoodUpkeepSnapshot(state);
  const claimedOutposts = getClaimedOutposts(state.settlements).length;
  const selectedWorker =
    state.selectedEntity?.kind === 'worker'
      ? state.workers.find((w) => w.id === state.selectedEntity?.id) ?? null
      : null;
  const selectedBuilding =
    state.selectedEntity?.kind === 'building'
      ? state.buildings.find((b) => b.id === state.selectedEntity?.id) ?? null
      : null;

  const radarSize = 128;
  const toRadar = (wx: number, wz: number) => ({
    x: radarSize / 2 + (wx / WORLD_RADIUS) * (radarSize * 0.44),
    y: radarSize / 2 + (wz / WORLD_RADIUS) * (radarSize * 0.44),
  });

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3.5 md:p-4">
      {/* Top Row: Perimeter Kingdom Status (Left) & Tactical Radar + Utilities (Right) */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Kingdom Cluster */}
        <div
          className="pointer-events-auto rounded-md border border-stone-700/75 px-3.5 py-2.5 w-[284px]"
          style={{ backgroundColor: 'rgba(13, 17, 23, 0.90)' }}
        >
          {/* Day & Night Cycle Header + Progress Bar */}
          <div className="flex items-center justify-between gap-2 mb-1 text-xs">
            <span
              data-testid="day-night-badge"
              className={`font-display font-bold tracking-wider flex items-center gap-1.5 ${
                state.isNight ? 'text-indigo-300' : 'text-amber-300'
              }`}
            >
              {state.isNight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              {state.isNight ? 'NIGHT WAVE' : state.dayCycleProgress >= 0.4 ? 'DUSK APPROACHING' : 'DAY PREP'}
            </span>
            <span className="font-mono-num text-stone-300">
              Wave {Math.max(1, state.wave)}/{FINAL_WAVE}
            </span>
          </div>
          <div className="h-1.5 bg-stone-800 rounded-sm overflow-hidden mb-2 flex">
            <div
              className={`h-full transition-all duration-150 ${
                state.isNight ? 'bg-indigo-500' : state.dayCycleProgress >= 0.4 ? 'bg-orange-500' : 'bg-amber-400'
              }`}
              style={{ width: `${Math.max(4, cyclePct)}%` }}
            />
          </div>

          {/* Campfire Vitality */}
          <div className="mb-1.5">
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-amber-300 font-medium flex items-center gap-1">
                <Flame className="w-3 h-3" /> Campfire
              </span>
              <span className="font-mono-num text-stone-200">
                {Math.round(state.campfireHp)}/{state.campfireMaxHp}
              </span>
            </div>
            <div className="h-2 bg-stone-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-150"
                style={{ width: `${campPct}%` }}
              />
            </div>
          </div>

          {/* Guardian Vitality */}
          <div className="mb-2">
            <div className="flex items-center justify-between text-[11px] mb-0.5">
              <span className="text-emerald-300 font-medium flex items-center gap-1">
                <Shield className="w-3 h-3" /> Guardian
              </span>
              <span className="font-mono-num text-stone-200">
                {state.player.respawnTimer > 0
                  ? `Reviving ${Math.ceil(state.player.respawnTimer)}s`
                  : `${Math.round(state.player.hp)}/${state.player.maxHp}`}
              </span>
            </div>
            <div className="h-2 bg-stone-800 rounded-sm overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-150"
                style={{ width: `${playerPct}%` }}
              />
            </div>
          </div>

          {/* Primary Kingdom Economy (Gold / Wood / Food) + Secondary Materials */}
          <div className="pt-1.5 border-t border-stone-700/70">
            <div className="grid grid-cols-3 gap-2 text-xs font-mono-num">
              <div>
                <div className="text-[10px] text-amber-400/90 font-semibold">GOLD</div>
                <div data-testid="hud-gold" className="font-semibold text-amber-300">
                  {Math.round(state.resources.gold ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-emerald-300/85 font-semibold">WOOD</div>
                <div data-testid="hud-wood" className="font-semibold text-emerald-200">
                  {Math.round(state.resources.wood)}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-lime-300/85 font-semibold">FOOD</div>
                <div data-testid="hud-food" className="font-semibold text-lime-200">
                  {Math.round(state.resources.food ?? 0)}
                </div>
              </div>
            </div>
            <div className="mt-1 flex items-center justify-between text-[10px] font-mono-num text-stone-400">
              <span>Stone {Math.round(state.resources.stone)}</span>
              <span>Ember {Math.round(state.resources.ember)}</span>
              <span className="text-violet-300">Relics {state.ancientRelics}</span>
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-stone-700/60 flex items-center justify-between gap-1.5 text-[10px]">
              <div className="min-w-0 truncate">
                <div data-testid="kingdom-stage-badge" className="font-semibold text-amber-200 truncate">
                  {kingdomStage.label}
                </div>
                <div className="font-mono-num text-stone-400 whitespace-nowrap">
                  {state.morale[0].toUpperCase() + state.morale.slice(1)} · -{foodUpkeep}F/d · {state.workers.length}W · {claimedOutposts}/4 Out
                </div>
              </div>
              <button
                type="button"
                tabIndex={-1}
                data-testid="toggle-market-forge-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  setTradeOpen((prev) => !prev);
                }}
                className={`px-2 py-1 rounded text-[10px] font-semibold cursor-pointer shrink-0 flex items-center gap-1 ${
                  tradeOpen
                    ? 'bg-amber-500 text-stone-950'
                    : 'bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-600/70'
                }`}
              >
                <Store className="w-3 h-3" />
                Trade
              </button>
            </div>
          </div>

          {/* 4-Sided Base Wall & Dragon Strength Multiplier (Kingdom Two Crowns style) */}
          <div className="mt-2 pt-2 border-t border-stone-700/70">
            <div className="flex items-center justify-between gap-2 text-[11px] mb-1">
              <span className="text-stone-200 font-medium truncate">
                {wallDef.name}{' '}
                <span className="font-mono-num text-stone-400">({intactSides}/4)</span>
              </span>
              <span
                data-testid="wall-dragon-mult"
                className={`font-mono-num font-bold text-[10px] px-1.5 py-0.5 rounded ${
                  wallMult < 1
                    ? 'bg-red-950/90 text-red-300 border border-red-700/60'
                    : 'bg-emerald-950/90 text-emerald-300 border border-emerald-700/60'
                }`}
              >
                {wallPctDelta < 0 ? `${wallPctDelta}% WEAK` : `+${wallPctDelta}% STRONG`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {nextWallDef ? (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="upgrade-wall-btn"
                  disabled={!canUpgradeWall}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onUpgradeWalls();
                  }}
                  className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold flex items-center justify-between gap-1 cursor-pointer ${
                    canUpgradeWall
                      ? 'bg-amber-600 hover:bg-amber-500 text-stone-950'
                      : 'bg-stone-800 text-stone-400 opacity-75'
                  }`}
                >
                  <span className="truncate">
                    {state.wallTier === 0 ? 'Build Wall' : `Tier ${nextWallDef.tier}`} [U]
                  </span>
                  <span className="font-mono-num shrink-0">
                    {nextWallDef.cost.wood}W·{nextWallDef.cost.stone}S
                    {nextWallDef.cost.ember > 0 ? `·${nextWallDef.cost.ember}E` : ''}
                  </span>
                </button>
              ) : (
                <div className="flex-1 px-2 py-1 rounded bg-stone-800/80 text-amber-300 text-[10px] font-semibold text-center">
                  Sunfire Citadel Max
                </div>
              )}
              {repairCost && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="repair-wall-btn"
                  disabled={!canRepairWall}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRepairWalls();
                  }}
                  title={`Repair 4 Walls (${repairCost.wood}W · ${repairCost.stone}S)`}
                  className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-800 disabled:text-stone-400 text-stone-100 text-[10px] font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Wrench className="w-3 h-3" />
                  <span className="font-mono-num">{repairCost.wood}W·{repairCost.stone}S</span>
                </button>
              )}
            </div>
          </div>

          {/* Wave Status / Quick Summon */}
          <div className="mt-2 pt-1.5 border-t border-stone-700/60 flex items-center justify-between gap-3 text-[11px]">
            <span className="font-mono-num text-stone-300 whitespace-nowrap">
              {state.waveActive
                ? `Threats: ${aliveEnemies} · Caves: ${aliveCaves}/4`
                : `Night in ${Math.ceil(state.prepTimer)}s · Caves: ${aliveCaves}/4`}
            </span>
            {!state.waveActive && (
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSummonWave();
                }}
                className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold text-[10px] cursor-pointer whitespace-nowrap"
              >
                Start Night
              </button>
            )}
          </div>
        </div>

        {/* Center Mission Objective Tag, Boss/Warden Bars & Event Banner */}
        <div className="flex flex-col items-center gap-2 max-w-lg mx-auto">
          <div
            data-testid="mission-objective-tag"
            className="pointer-events-auto px-4 py-2 rounded-md border border-amber-500/40 shadow-lg text-center"
            style={{ backgroundColor: 'rgba(13, 17, 23, 0.88)' }}
          >
            <div className="flex items-center justify-center gap-2 text-xs font-display font-bold text-amber-200">
              <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{objective.title}</span>
              {objective.distanceMeters > 0 && (
                <span className="font-mono-num text-amber-400">
                  · {objective.distanceMeters}m {objective.direction}
                </span>
              )}
            </div>
            <div className="text-[11px] text-stone-300 mt-0.5">{objective.subtitle}</div>
            <div className="text-[10px] font-mono-num text-stone-400 mt-1 flex flex-wrap items-center justify-center gap-x-2">
              <span
                className={
                  activeTargetCave && maxDragonLv < activeTargetCave.requiredLevel
                    ? 'text-red-300 font-semibold'
                    : 'text-emerald-300 font-semibold'
                }
              >
                Dragon Lv {maxDragonLv}
                {activeTargetCave ? ` / Cave ${activeTargetCave.index} Req Lv ${activeTargetCave.requiredLevel}+` : ''}
              </span>
              <span>· Explored {objective.explorationPct}%</span>
              <span>· Ruins {claimedRuins}/{state.ruins.length}</span>
              <span>· Knights {state.protectors.length}</span>
            </div>
          </div>

          {boss && (
            <div
              className="w-80 px-3 py-1.5 rounded border border-red-500/55"
              style={{ backgroundColor: 'rgba(20, 8, 12, 0.92)' }}
            >
              <div className="flex items-center justify-between text-xs font-display font-bold text-red-200 mb-1">
                <span>Nightmare Lord</span>
                <span className="font-mono-num">{Math.round(boss.hp)}/{boss.maxHp}</span>
              </div>
              <div className="h-2.5 bg-stone-900 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-150"
                  style={{ width: `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {wardens.map((w) => (
            <div
              key={w.id}
              className="w-72 px-3 py-1.5 rounded border border-orange-500/50"
              style={{ backgroundColor: 'rgba(24, 12, 10, 0.90)' }}
            >
              <div className="flex items-center justify-between text-xs font-display font-bold text-orange-200 mb-1">
                <span>Cave Warden</span>
                <span className="font-mono-num">{Math.round(w.hp)}/{w.maxHp}</span>
              </div>
              <div className="h-2 bg-stone-900 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-orange-500 transition-all duration-150"
                  style={{ width: `${Math.max(0, (w.hp / w.maxHp) * 100)}%` }}
                />
              </div>
            </div>
          ))}

          {banner && (
            <div
              className="px-5 py-2.5 rounded-md border border-amber-500/40 text-center shadow-xl"
              style={{ backgroundColor: 'rgba(13, 17, 23, 0.92)' }}
            >
              <div className="font-display text-base font-bold" style={{ color: banner.color }}>
                {banner.title}
              </div>
              <div className="text-xs text-stone-300">{banner.subtitle}</div>
            </div>
          )}
        </div>

        {/* Top-Right Utility Row + Mini Tactical Radar */}
        <div className="flex flex-col items-end gap-2">
          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="w-9 h-9 rounded border border-stone-700 bg-stone-900/90 hover:bg-stone-800 flex items-center justify-center text-stone-200 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Toggle World Map (G)"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMap();
              }}
              className="w-9 h-9 rounded border border-stone-700 bg-stone-900/90 hover:bg-stone-800 flex items-center justify-center text-stone-200 cursor-pointer"
            >
              <MapIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Toggle Dragon Lab (F2)"
              title="Dragon Ability Lab [F2]"
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleSandbox();
              }}
              className={`w-9 h-9 rounded border flex items-center justify-center cursor-pointer ${
                sandboxOpen
                  ? 'border-amber-400 bg-amber-600 text-stone-950'
                  : 'border-stone-700 bg-stone-900/90 hover:bg-stone-800 text-stone-300'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Elder Strategist & Media Studio (T)"
              onClick={(e) => {
                e.currentTarget.blur();
                onOpenStudio();
              }}
              className="w-9 h-9 rounded border border-stone-700 bg-stone-900/90 hover:bg-stone-800 flex items-center justify-center text-amber-300 cursor-pointer"
            >
              <Brain className="w-4 h-4" />
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Pause Game (Esc)"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="w-9 h-9 rounded border border-stone-700 bg-stone-900/90 hover:bg-stone-800 flex items-center justify-center text-stone-200 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
            </button>
          </div>

          {/* Tactical Radar */}
          <div
            className="pointer-events-auto rounded-md border border-stone-700/80 p-1.5"
            style={{ backgroundColor: 'rgba(13, 17, 23, 0.88)' }}
          >
            <svg width={radarSize} height={radarSize} className="block" aria-label="Kingdom Radar">
              <circle
                cx={radarSize / 2}
                cy={radarSize / 2}
                r={radarSize * 0.44}
                fill="#101812"
                stroke="#374151"
                strokeWidth="1"
              />
              {REGION_ROADS.map((road) => {
                const pts = road.points
                  .map(([px, pz]) => {
                    const pt = toRadar(px, pz);
                    return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <polyline
                    key={road.id}
                    points={pts}
                    fill="none"
                    stroke="#6b5b45"
                    strokeWidth="1.2"
                    strokeOpacity={0.7}
                  />
                );
              })}
              <circle cx={radarSize / 2} cy={radarSize / 2} r={4} fill="#ff7b24" />
              {state.settlements.map((s) => {
                const pt = toRadar(s.x, s.z);
                return (
                  <rect
                    key={s.id}
                    x={pt.x - 2}
                    y={pt.y - 2}
                    width={4}
                    height={4}
                    fill={s.claimed ? '#34d399' : '#fbbf24'}
                  />
                );
              })}
              {state.shrines.map((sh) => {
                const pt = toRadar(sh.x, sh.z);
                return (
                  <circle
                    key={sh.id}
                    cx={pt.x}
                    cy={pt.y}
                    r={2.2}
                    fill={sh.activated ? '#64748b' : sh.color}
                  />
                );
              })}
              {state.ruins.map((r) => {
                const pt = toRadar(r.x, r.z);
                return (
                  <rect
                    key={r.id}
                    x={pt.x - 2}
                    y={pt.y - 2}
                    width={4}
                    height={4}
                    fill={r.claimed ? '#62e685' : '#f0c250'}
                  />
                );
              })}
              {state.jails.map((j) => {
                if (j.opened) return null;
                const pt = toRadar(j.x, j.z);
                return (
                  <polygon
                    key={j.id}
                    points={`${pt.x},${pt.y - 3} ${pt.x + 3},${pt.y} ${pt.x},${pt.y + 3} ${pt.x - 3},${pt.y}`}
                    fill={DRAGON_ARCHETYPES[j.element].accentColor}
                  />
                );
              })}
              {state.caves.map((c) => {
                const pt = toRadar(c.x, c.z);
                const isTarget = activeTargetCave?.id === c.id;
                const warded = isCaveWarded(c, state.caves);
                return (
                  <g key={c.id}>
                    {isTarget && (
                      <circle cx={pt.x} cy={pt.y} r={5.2} fill="none" stroke="#ff5a36" strokeWidth="1" />
                    )}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={3.2}
                      fill={!c.alive ? '#4b5563' : isTarget ? '#ef4444' : warded ? '#7c3aed' : '#b85cff'}
                    />
                  </g>
                );
              })}
              {state.wildEggs.map((egg) => {
                const pt = toRadar(egg.x, egg.z);
                return (
                  <circle
                    key={egg.id}
                    cx={pt.x}
                    cy={pt.y}
                    r={1.7}
                    fill={DRAGON_ARCHETYPES[egg.element].color}
                  />
                );
              })}
              {state.enemies.map((en) => {
                if (en.koTimer > 0) return null;
                const pt = toRadar(en.x, en.z);
                return (
                  <circle
                    key={en.id}
                    cx={pt.x}
                    cy={pt.y}
                    r={en.kind === 'boss' || en.kind === 'warden' ? 3.2 : 1.5}
                    fill="#ef4444"
                  />
                );
              })}
              {state.protectors.map((pr) => {
                if (pr.downTimer > 0) return null;
                const pt = toRadar(pr.x, pr.z);
                return <circle key={pr.id} cx={pt.x} cy={pt.y} r={2} fill="#93c5fd" />;
              })}
              {state.dragons.map((d) => {
                const pt = toRadar(d.x, d.z);
                return (
                  <circle
                    key={d.id}
                    cx={pt.x}
                    cy={pt.y}
                    r={Number((2.2 * (d.sizeScale || 1)).toFixed(2))}
                    fill={DRAGON_ARCHETYPES[d.element].accentColor}
                  />
                );
              })}
              {(() => {
                const pt = toRadar(state.player.x, state.player.z);
                return <circle cx={pt.x} cy={pt.y} r={3.0} fill="#60a5fa" stroke="#fff" strokeWidth="1" />;
              })()}
            </svg>
            <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-mono-num text-stone-300 px-1">
              <span>Squad {state.dragons.length}/{dragonCap}</span>
              <span>{Math.round(squadDps)} DPS</span>
            </div>
          </div>

          {/* Dragon Squad Roster (Rarity, Element & Live Stats) */}
          {state.dragons.length > 0 && (
            <div
              data-testid="hud-dragon-roster"
              className={`pointer-events-auto rounded-md border border-stone-700/80 p-1.5 w-60 overflow-y-auto space-y-1 ${
                sandboxOpen ? 'max-h-36' : 'max-h-60'
              }`}
              style={{ backgroundColor: 'rgba(13, 17, 23, 0.90)' }}
            >
              {state.dragons.map((d) => {
                const arch = DRAGON_ARCHETYPES[d.element];
                const cfg = DRAGON_ABILITY_CONFIG.stats[d.element];
                const rarityMeta = DRAGON_RARITY_META[d.rarity];
                const hpPct = Math.max(0, Math.min(100, (d.hp / Math.max(1, d.maxHp)) * 100));
                return (
                  <div
                    key={d.id}
                    data-testid={`hud-dragon-item-${d.element}`}
                    className="rounded border border-stone-800 bg-stone-900/85 px-2 py-1 font-mono-num"
                  >
                    <div className="flex items-center justify-between gap-1 text-[10px]">
                      <span className="font-semibold truncate" style={{ color: arch.accentColor }}>
                        {arch.name} Lv{d.level}
                      </span>
                      <span
                        className="px-1 py-0.2 rounded text-[9px] font-bold uppercase shrink-0 border"
                        style={{
                          color: rarityMeta.color,
                          borderColor: `${rarityMeta.color}55`,
                          backgroundColor: `${rarityMeta.color}1a`,
                        }}
                      >
                        {rarityMeta.shortLabel}
                      </span>
                    </div>
                    <div className="h-1 bg-stone-800 rounded-sm overflow-hidden my-1">
                      <div
                        className="h-full transition-all duration-150"
                        style={{ width: `${hpPct}%`, backgroundColor: arch.color }}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[9px] text-stone-300">
                      <span className="truncate text-stone-400">{cfg.elementLabel}</span>
                      <span className="shrink-0">
                        {d.downTimer > 0
                          ? `KO ${Math.ceil(d.downTimer)}s`
                          : `${Math.round(d.hp)}/${d.maxHp} · ${d.damage}D`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-1 text-[9px] text-stone-400 mt-0.5">
                      <span>
                        {d.attackSpeed.toFixed(1)}/s · {Math.round(d.critChance * 100)}%C
                      </span>
                      <span style={{ color: rarityMeta.color }}>
                        {d.abilityCooldown <= 0
                          ? 'Basic'
                          : d.abilityCooldownTimer <= 0.05
                            ? 'Ready'
                            : `${d.abilityCooldownTimer.toFixed(1)}s`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {sandboxOpen && (
            <div
              className="pointer-events-auto rounded-md border border-amber-500/45 p-2.5 w-60 shadow-xl"
              style={{ backgroundColor: 'rgba(13, 17, 23, 0.94)' }}
            >
              <div className="flex items-center justify-between text-[11px] font-display font-bold text-amber-300 mb-1.5">
                <span>Dragon Ability Lab</span>
                <span className="font-mono-num text-[10px] text-stone-400">[F2]</span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[10px]">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSandboxAction('fire');
                  }}
                  className="px-2 py-1 rounded bg-red-950/80 hover:bg-red-900 border border-red-700/60 text-red-200 cursor-pointer text-left"
                >
                  Red Fire [4]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSandboxAction('ice');
                  }}
                  className="px-2 py-1 rounded bg-sky-950/80 hover:bg-sky-900 border border-sky-700/60 text-sky-200 cursor-pointer text-left"
                >
                  Blue Ice [5]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSandboxAction('earth');
                  }}
                  className="px-2 py-1 rounded bg-lime-950/80 hover:bg-lime-900 border border-lime-700/60 text-lime-200 cursor-pointer text-left"
                >
                  Green Melee [6]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSandboxAction('electric');
                  }}
                  className="px-2 py-1 rounded bg-yellow-950/80 hover:bg-yellow-900 border border-yellow-700/60 text-yellow-200 cursor-pointer text-left"
                >
                  Yellow Bolt [7]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSandboxAction('pack');
                  }}
                  className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer text-left"
                >
                  Spawn Pack [8]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSandboxAction('huge');
                  }}
                  className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 cursor-pointer text-left"
                >
                  Siege Golem [9]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSandboxAction('boss');
                  }}
                  className="px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 text-red-300 cursor-pointer text-left"
                >
                  Spawn Boss [0]
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSandboxAction('all_sizes');
                  }}
                  className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold cursor-pointer text-left"
                >
                  All 4 Sizes
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Center World Map Drawer (toggled via G / Map Icon) */}
      {mapOpen && (
        <WorldMapModal
          state={state}
          onClose={onToggleMap}
          onAssignWorkerRole={onAssignWorkerRole}
        />
      )}

      {/* Bottom Contextual Action Bar + Expandable Build Strip */}
      <div className="flex flex-col items-center gap-2">
        {!mapOpen && toast && (
          <div
            data-testid="discovery-toast"
            className="px-3.5 py-1.5 rounded border border-amber-400/50 text-center max-w-md shadow-lg"
            style={{ backgroundColor: 'rgba(13, 17, 23, 0.92)' }}
          >
            <div className="text-xs font-display font-bold" style={{ color: toast.color }}>
              {toast.title}
            </div>
            <div className="text-[10px] text-stone-300 leading-snug">{toast.subtitle}</div>
          </div>
        )}
        {!mapOpen && state.contextHint.kind !== 'none' && (
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerInteract();
            }}
            className="pointer-events-auto px-4 py-1.5 rounded border border-amber-400/70 bg-stone-900/95 text-amber-200 text-xs font-semibold shadow-lg cursor-pointer"
          >
            {state.contextHint.label}
          </button>
        )}

        {buildMessage && (
          <div
            className="px-3 py-1 rounded border border-amber-500/40 text-xs text-amber-200"
            style={{ backgroundColor: 'rgba(13, 17, 23, 0.92)' }}
          >
            {buildMessage}
          </div>
        )}

        {!mapOpen && selectedWorker && (
          <div
            data-testid="worker-inspector"
            className="pointer-events-auto rounded-md border border-sky-500/45 p-2.5 max-w-xl w-full shadow-xl"
            style={{ backgroundColor: 'rgba(13, 17, 23, 0.94)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-display font-bold text-stone-100">{selectedWorker.name}</span>
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  style={{
                    backgroundColor: 'rgba(30, 41, 59, 0.9)',
                    color: WORKER_ROLE_META[selectedWorker.role].color,
                  }}
                >
                  {WORKER_ROLE_META[selectedWorker.role].label}
                </span>
                <span className="text-[11px] font-mono-num text-stone-300">
                  HP {Math.round(selectedWorker.hp)}/{selectedWorker.maxHp}
                </span>
              </div>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close Worker Inspector"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onClearSelection();
                }}
                className="text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[11px] text-stone-300 mb-2">{selectedWorker.activityLabel}</div>
            <div className="flex flex-wrap gap-1.5">
              {ASSIGNABLE_ROLES.map((role) => {
                const active = selectedWorker.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onAssignWorkerRole(selectedWorker.id, role);
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                      active
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700'
                    }`}
                  >
                    {WORKER_ROLE_META[role].shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!mapOpen && selectedBuilding && (
          <div
            data-testid="building-inspector"
            className="pointer-events-auto rounded-md border border-amber-500/45 p-2.5 max-w-xl w-full shadow-xl"
            style={{ backgroundColor: 'rgba(13, 17, 23, 0.94)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-display font-bold text-amber-200">
                  {BUILDING_DEFS[selectedBuilding.kind].name}
                </span>
                <span className="text-[11px] text-stone-300">
                  {BUILDING_DEFS[selectedBuilding.kind].role}
                </span>
              </div>
              <button
                type="button"
                tabIndex={-1}
                aria-label="Close Building Inspector"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onClearSelection();
                }}
                className="text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <span className="font-mono-num text-stone-300">
                HP {Math.round(selectedBuilding.hp)}/{selectedBuilding.maxHp}
                {selectedBuilding.buildTimer > 0
                  ? ` · Building (${selectedBuilding.buildTimer.toFixed(1)}s)`
                  : ' · Operational'}
              </span>
              <div className="flex items-center gap-1.5">
                {(selectedBuilding.kind === 'workshop' || selectedBuilding.kind === 'sanctuary') && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setTradeOpen(true);
                    }}
                    className="px-2.5 py-1 rounded bg-violet-700 hover:bg-violet-600 text-stone-100 text-[10px] font-semibold cursor-pointer"
                  >
                    Open Forge & Market
                  </button>
                )}
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={selectedBuilding.hp >= selectedBuilding.maxHp}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onRepairBuilding(selectedBuilding.id);
                  }}
                  className="px-2.5 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:bg-stone-800 disabled:text-stone-500 text-stone-100 text-[10px] font-semibold cursor-pointer"
                >
                  Repair (4G·6W·3S)
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onDemolishBuilding(selectedBuilding.id);
                  }}
                  className="px-2.5 py-1 rounded bg-red-950/90 hover:bg-red-900 border border-red-700/60 text-red-200 text-[10px] font-semibold cursor-pointer"
                >
                  Demolish (+40%)
                </button>
              </div>
            </div>
          </div>
        )}

        {!mapOpen && tradeOpen && (
          <div
            data-testid="market-forge-panel"
            className="pointer-events-auto rounded-md border border-amber-500/45 p-3 max-w-4xl w-full shadow-2xl"
            style={{ backgroundColor: 'rgba(13, 17, 23, 0.95)' }}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-display font-bold text-amber-200">
                Settlement Market & Ancient Relic Forge
              </span>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  setTradeOpen(false);
                }}
                className="text-stone-400 hover:text-stone-200 cursor-pointer flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] font-semibold text-amber-300 mb-1.5">
                  Market Trades (Gold {Math.round(state.resources.gold ?? 0)}G)
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {Object.values(MARKET_TRADES).map((trade) => {
                    const affordable = canAfford(state.resources, trade.cost);
                    return (
                      <button
                        key={trade.id}
                        type="button"
                        tabIndex={-1}
                        disabled={!affordable}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onMarketTrade(trade.id);
                        }}
                        className="px-2.5 py-1.5 rounded border border-stone-700 bg-stone-900 hover:bg-stone-800 disabled:opacity-45 text-left text-[11px] text-stone-200 cursor-pointer"
                      >
                        {trade.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-violet-300 mb-1.5">
                  Ancient Relic Forge (Relics: {state.ancientRelics})
                </div>
                <div className="grid grid-cols-1 gap-1.5">
                  {RELIC_FORGE_UPGRADES.map((u) => {
                    const unlocked = state.unlockedRelicForges.includes(u.id);
                    const canForge =
                      !unlocked &&
                      state.ancientRelics >= u.relicCost &&
                      (state.resources.gold ?? 0) >= u.goldCost;
                    return (
                      <div
                        key={u.id}
                        className="px-2.5 py-1.5 rounded border border-stone-700 bg-stone-900/90 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="text-[11px] font-semibold text-stone-100 truncate">
                            {u.title}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">{u.description}</div>
                        </div>
                        {unlocked ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[10px] font-semibold shrink-0">
                            Forged
                          </span>
                        ) : (
                          <button
                            type="button"
                            tabIndex={-1}
                            disabled={!canForge}
                            onClick={(e) => {
                              e.currentTarget.blur();
                              onForgeRelic(u.id);
                            }}
                            className="px-2 py-1 rounded bg-violet-700 hover:bg-violet-600 disabled:bg-stone-800 disabled:text-stone-400 text-stone-100 text-[10px] font-semibold cursor-pointer shrink-0 font-mono-num"
                          >
                            {u.relicCost}R·{u.goldCost}G
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {buildOpen && (
          <div
            data-testid="build-panel"
            className="pointer-events-auto rounded-md border border-stone-700/90 p-2.5 max-w-5xl w-full"
            style={{ backgroundColor: 'rgba(13, 17, 23, 0.94)' }}
          >
            <div className="flex items-center justify-between text-xs text-stone-300 mb-2 px-1">
              <span>
                {state.selectedBuild
                  ? `Click on controlled ground to place ${BUILDING_DEFS[state.selectedBuild].name} (or press Build)`
                  : 'Select a Kingdom Structure to place inside controlled territory'}
              </span>
              <button
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleBuild();
                }}
                className="text-stone-400 hover:text-stone-200 cursor-pointer"
              >
                Close [B]
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-1.5">
              {BUILDING_ORDER.map((kind) => {
                const def = BUILDING_DEFS[kind];
                const affordable = canAfford(state.resources, def.cost);
                const selected = state.selectedBuild === kind;
                return (
                  <div
                    key={kind}
                    className={`rounded border p-2 flex flex-col justify-between gap-1.5 ${
                      selected
                        ? 'border-amber-400 bg-amber-950/50'
                        : 'border-stone-700 bg-stone-900/90'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold text-stone-100 truncate">{def.name}</div>
                      <div className="text-[10px] text-stone-400 truncate">{def.role}</div>
                      <div className="text-[10px] font-mono-num text-amber-300 mt-1">
                        {formatResourceCost(def.cost)}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        tabIndex={-1}
                        disabled={!affordable}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onSelectBuild(selected ? null : kind);
                        }}
                        className="flex-1 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-[10px] text-stone-100 cursor-pointer"
                      >
                        {selected ? 'Placing' : 'Aim'}
                      </button>
                      <button
                        type="button"
                        tabIndex={-1}
                        disabled={!affordable}
                        onClick={(e) => {
                          e.currentTarget.blur();
                          onQuickBuildAroundCamp(kind);
                        }}
                        className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-[10px] font-semibold text-stone-950 cursor-pointer"
                        title="Place near Guardian"
                      >
                        Build
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unified Action Dock */}
        <div
          className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-md border border-stone-700/85 px-2.5 py-1.5 shadow-xl"
          style={{ backgroundColor: 'rgba(13, 17, 23, 0.90)' }}
        >
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerAttack();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-100 cursor-pointer whitespace-nowrap"
          >
            <Swords className="w-3.5 h-3.5 text-amber-400" />
            Attack <span className="text-[10px] text-stone-400 font-mono-num">[Space]</span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerDash();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-xs font-medium text-stone-100 cursor-pointer whitespace-nowrap"
          >
            <Wind className="w-3.5 h-3.5 text-sky-300" />
            Dash{' '}
            <span className="text-[10px] text-stone-400 font-mono-num">
              {state.player.dashCooldown > 0 ? `${state.player.dashCooldown.toFixed(1)}s` : '[Shift]'}
            </span>
          </button>

          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onToggleBuild();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
              buildOpen
                ? 'bg-amber-600 text-stone-950 font-semibold'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-100'
            }`}
          >
            <Hammer className="w-3.5 h-3.5" />
            Build <span className="text-[10px] opacity-75 font-mono-num">[B]</span>
          </button>

          <div className="h-5 w-px bg-stone-700 mx-1" aria-hidden="true" />

          {/* Dragon Squad Commands */}
          {(['follow', 'defend', 'attack', 'explore', 'sanctuary'] as DragonCommand[]).map((cmd) => {
            const active = state.squadCommand === cmd;
            const meta: Record<DragonCommand, { label: string; keyHint: string }> = {
              follow: { label: 'Follow', keyHint: '1' },
              defend: { label: 'Defend', keyHint: '2' },
              attack: { label: 'Attack', keyHint: '3' },
              explore: { label: 'Explore', keyHint: 'Q' },
              sanctuary: { label: 'Rest', keyHint: 'R' },
            };
            return (
              <button
                key={cmd}
                type="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onCommand(cmd);
                }}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-amber-500 text-stone-950 font-semibold'
                    : 'bg-stone-800 hover:bg-stone-700 text-stone-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {meta[cmd].label}{' '}
                <span className="text-[10px] opacity-75 font-mono-num">[{meta[cmd].keyHint}]</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
