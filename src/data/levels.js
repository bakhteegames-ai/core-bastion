/**
 * Authored level definitions.
 * `broken_halo` is the live rescue-pass battlefield.
 */

export const DEFAULT_LEVEL_ID = 'broken_halo';

const BROKEN_HALO = {
  id: 'broken_halo',
  name: 'Broken Halo Citadel',
  description: 'Hold the reactor core inside a breached orbital fortress.',
  difficulty: 2,
  theme: {
    skyColor: { r: 0.03, g: 0.05, b: 0.09 },
    ambientColor: { r: 0.08, g: 0.11, b: 0.16 },
    metalColor: { r: 0.17, g: 0.2, b: 0.24 },
    metalAccent: { r: 0.24, g: 0.28, b: 0.34 },
    groundColor: { r: 0.07, g: 0.09, b: 0.12 },
    trenchColor: { r: 0.03, g: 0.04, b: 0.06 },
    trenchGlow: { r: 0.04, g: 0.42, b: 0.5 },
    pathColor: { r: 0.42, g: 0.45, b: 0.5 },
    pathEdgeColor: { r: 0.11, g: 0.78, b: 0.88 },
    spawnColor: { r: 0.96, g: 0.36, b: 0.18 },
    coreColor: { r: 0.36, g: 0.96, b: 1.0 },
    neutralGlow: { r: 0.9, g: 0.84, b: 0.64 }
  },
  battlefield: {
    width: 34,
    depth: 28,
    pathWidth: 2.35,
    pathHeight: 0.16,
    padRadius: 1.7,
    padHeight: 0.28,
    wallHeight: 3.2
  },
  camera: {
    x: -4.5,
    y: 15.5,
    z: 20.5,
    target: { x: 2.8, y: 0.65, z: 1.2 }
  },
  spawn: { x: -14, z: 8 },
  base: { x: 11, z: -5 },
  waypoints: [
    { x: -14, z: 8 },
    { x: -11, z: 8 },
    { x: -8, z: 8 },
    { x: -4, z: 6 },
    { x: -1, z: 2 },
    { x: 2, z: 0 },
    { x: 5, z: -1 },
    { x: 8, z: -3 },
    { x: 10, z: -5 },
    { x: 11, z: -5 }
  ],
  buildSlots: [
    { id: 'A', role: 'forward', x: -11, y: 0.32, z: 4.1 },
    { id: 'B', role: 'forward', x: -7.6, y: 0.32, z: 10.2 },
    { id: 'C', role: 'crossfire', x: -1.4, y: 0.32, z: 5.4 },
    { id: 'D', role: 'crossfire', x: 2.8, y: 0.32, z: 4.0 },
    { id: 'E', role: 'perch', x: 5.2, y: 1.15, z: -4.3 },
    { id: 'F', role: 'panic', x: 8.6, y: 0.32, z: 1.0 },
    { id: 'G', role: 'panic', x: 10.7, y: 0.32, z: -0.8 }
  ],
  pathStyle: {
    width: 2.35,
    edgeWidth: 0.16,
    waypointRadius: 0.5
  },
  setPieces: {
    floorPlates: [
      { name: 'OuterDeck', position: { x: -9.6, y: -0.34, z: 7.3 }, scale: { x: 11.8, y: 0.68, z: 8.6 } },
      { name: 'BridgeDeck', position: { x: 1.6, y: -0.22, z: 1.5 }, scale: { x: 9.4, y: 0.44, z: 6.2 } },
      { name: 'InnerDeck', position: { x: 8.9, y: -0.3, z: -3.3 }, scale: { x: 10.6, y: 0.6, z: 8.8 } }
    ],
    trenchSegments: [
      { name: 'NorthTrench', position: { x: 0.5, y: -1.5, z: 4.8 }, scale: { x: 10.2, y: 2.8, z: 3.1 } },
      { name: 'SouthTrench', position: { x: 4.5, y: -1.55, z: -0.9 }, scale: { x: 7.0, y: 3.0, z: 4.6 } }
    ],
    wallSegments: [
      { name: 'WestWallNorth', position: { x: -15.3, y: 1.55, z: 11.0 }, scale: { x: 1.1, y: 3.1, z: 4.5 } },
      { name: 'WestWallSouth', position: { x: -15.3, y: 1.55, z: 2.6 }, scale: { x: 1.1, y: 3.1, z: 8.4 } },
      { name: 'NorthWall', position: { x: -8.4, y: 1.5, z: 12.6 }, scale: { x: 12.2, y: 3.0, z: 1.0 } },
      { name: 'BridgeWestShield', position: { x: -2.6, y: 1.45, z: 6.3 }, scale: { x: 2.2, y: 2.9, z: 0.8 } },
      { name: 'BridgeEastShield', position: { x: 6.4, y: 1.45, z: -3.7 }, scale: { x: 2.2, y: 2.9, z: 0.8 } },
      { name: 'SouthWall', position: { x: 2.0, y: 1.4, z: -11.6 }, scale: { x: 24.0, y: 2.8, z: 0.9 } },
      { name: 'EastWall', position: { x: 13.9, y: 1.5, z: -4.2 }, scale: { x: 0.9, y: 3.0, z: 10.4 } }
    ],
    beacons: [
      { name: 'BreachBeaconA', x: -12.8, y: 1.6, z: 9.9, color: 'spawn' },
      { name: 'BreachBeaconB', x: -9.2, y: 1.4, z: 11.0, color: 'spawn' },
      { name: 'BridgeBeaconA', x: 0.8, y: 1.6, z: 4.6, color: 'path' },
      { name: 'BridgeBeaconB', x: 3.8, y: 1.6, z: -2.2, color: 'path' },
      { name: 'CoreBeaconA', x: 7.7, y: 1.8, z: -6.7, color: 'core' },
      { name: 'CoreBeaconB', x: 12.2, y: 1.8, z: -2.0, color: 'core' }
    ]
  },
  pacing: {
    startingGold: 220,
    buildPhaseDuration: 8.0
  },
  wavePlan: {
    1: { composition: ['grunt', 'grunt', 'grunt'], spawnInterval: 1.25 },
    2: { composition: ['grunt', 'grunt', 'grunt', 'grunt'], spawnInterval: 1.15 },
    3: { composition: ['grunt', 'grunt', 'runner', 'grunt', 'grunt'], spawnInterval: 1.05 },
    4: { composition: ['grunt', 'runner', 'grunt', 'grunt', 'runner', 'grunt'], spawnInterval: 0.98 },
    5: { composition: ['grunt', 'grunt', 'runner', 'grunt', 'runner', 'grunt', 'tank'], spawnInterval: 0.92 }
  },
  waveModifiers: {
    enemyHpMultiplier: 1.0,
    enemySpeedMultiplier: 1.0,
    goldMultiplier: 1.0
  }
};

function createScaffoldLevel(id, name, description, overrides = {}) {
  return {
    id,
    name,
    description,
    difficulty: 1,
    theme: { ...BROKEN_HALO.theme, ...(overrides.theme || {}) },
    battlefield: { ...BROKEN_HALO.battlefield, ...(overrides.battlefield || {}) },
    camera: { ...BROKEN_HALO.camera, ...(overrides.camera || {}) },
    spawn: overrides.spawn || BROKEN_HALO.spawn,
    base: overrides.base || BROKEN_HALO.base,
    waypoints: overrides.waypoints || BROKEN_HALO.waypoints,
    buildSlots: overrides.buildSlots || BROKEN_HALO.buildSlots,
    pathStyle: { ...BROKEN_HALO.pathStyle, ...(overrides.pathStyle || {}) },
    setPieces: overrides.setPieces || BROKEN_HALO.setPieces,
    pacing: { ...BROKEN_HALO.pacing, ...(overrides.pacing || {}) },
    wavePlan: overrides.wavePlan || {},
    waveModifiers: { ...BROKEN_HALO.waveModifiers, ...(overrides.waveModifiers || {}) }
  };
}

export const LEVELS = {
  [DEFAULT_LEVEL_ID]: BROKEN_HALO,
  meadow: createScaffoldLevel('meadow', 'Green Meadow', 'Legacy scaffold biome kept for future rework.'),
  desert: createScaffoldLevel('desert', 'Blazing Desert', 'Legacy scaffold biome kept for future rework.', {
    theme: {
      skyColor: { r: 0.14, g: 0.09, b: 0.06 },
      metalAccent: { r: 0.33, g: 0.24, b: 0.18 },
      pathColor: { r: 0.53, g: 0.42, b: 0.28 },
      spawnColor: { r: 1.0, g: 0.46, b: 0.22 }
    }
  }),
  snow: createScaffoldLevel('snow', 'Frozen Peaks', 'Legacy scaffold biome kept for future rework.', {
    theme: {
      skyColor: { r: 0.05, g: 0.08, b: 0.11 },
      metalColor: { r: 0.19, g: 0.23, b: 0.29 },
      pathColor: { r: 0.55, g: 0.62, b: 0.68 },
      coreColor: { r: 0.65, g: 0.93, b: 1.0 }
    }
  })
};

export function getLevel(id) {
  return LEVELS[id] || LEVELS[DEFAULT_LEVEL_ID];
}

export function getAllLevels() {
  return Object.values(LEVELS);
}

export function getLevelIds() {
  return Object.keys(LEVELS);
}
