/**
 * Enemy Types Definition
 * 5 enemy types + Boss
 */

export const EnemyTypes = {
  GRUNT: {
    id: 'grunt',
    name: 'Grunt',
    nameRu: 'Рядовой',
    baseHP: 10,
    hpPerWave: 5,
    speed: 2.0,
    goldReward: 25,
    leakDamage: 1,
    scale: 1.0,
    color: { r: 0.9, g: 0.3, b: 0.2 },
    canFly: false,
    armor: 0,
    special: null
  },
  RUNNER: {
    id: 'runner',
    name: 'Runner',
    nameRu: 'Бегун',
    baseHP: 8,
    hpPerWave: 3,
    speed: 3.5,
    goldReward: 20,
    leakDamage: 1,
    scale: 0.8,
    color: { r: 0.2, g: 0.8, b: 0.3 },
    canFly: false,
    armor: 0,
    special: 'speed'
  },
  TANK: {
    id: 'tank',
    name: 'Tank',
    nameRu: 'Танк',
    baseHP: 50,
    hpPerWave: 10,
    speed: 1.2,
    goldReward: 50,
    leakDamage: 2,
    scale: 1.3,
    color: { r: 0.5, g: 0.5, b: 0.6 },
    canFly: false,
    armor: 5,
    special: 'armor'
  },
  FLYER: {
    id: 'flyer',
    name: 'Flyer',
    nameRu: 'Летун',
    baseHP: 15,
    hpPerWave: 4,
    speed: 2.5,
    goldReward: 30,
    leakDamage: 1,
    scale: 0.9,
    color: { r: 0.6, g: 0.4, b: 0.9 },
    canFly: true,
    armor: 0,
    special: 'fly'
  },
  BOSS: {
    id: 'boss',
    name: 'Boss',
    nameRu: 'Босс',
    baseHP: 500,
    hpPerWave: 50,
    speed: 1.0,
    goldReward: 200,
    leakDamage: 5,
    scale: 2.0,
    color: { r: 0.8, g: 0.1, b: 0.1 },
    canFly: false,
    armor: 10,
    special: 'boss',
    abilities: ['heal', 'summon', 'shield']
  },
  STEALTH: {
    id: 'stealth',
    name: 'Stealth',
    nameRu: 'Невидимка',
    baseHP: 12,
    hpPerWave: 4,
    speed: 2.8,
    goldReward: 35,
    leakDamage: 2,
    scale: 0.9,
    color: { r: 0.4, g: 0.4, b: 0.8 },
    canFly: false,
    armor: 0,
    special: 'stealth',
    invisibilityThreshold: 0.3 // Видим только когда HP < 30%
  },
  HEALER: {
    id: 'healer',
    name: 'Healer',
    nameRu: 'Целитель',
    baseHP: 25,
    hpPerWave: 6,
    speed: 1.5,
    goldReward: 45,
    leakDamage: 1,
    scale: 1.0,
    color: { r: 0.3, g: 0.9, b: 0.6 },
    canFly: false,
    armor: 2,
    special: 'heal',
    healRadius: 4.0,
    healAmount: 3,
    healInterval: 2.0
  },
  SPAWNER: {
    id: 'spawner',
    name: 'Spawner',
    nameRu: 'Размножитель',
    baseHP: 35,
    hpPerWave: 8,
    speed: 1.3,
    goldReward: 55,
    leakDamage: 2,
    scale: 1.2,
    color: { r: 0.7, g: 0.5, b: 0.3 },
    canFly: false,
    armor: 3,
    special: 'spawn',
    spawnMinionType: 'grunt',
    spawnInterval: 4.0,
    maxMinions: 3
  },
  SPLITTER: {
    id: 'splitter',
    name: 'Splitter',
    nameRu: 'Делитель',
    baseHP: 30,
    hpPerWave: 7,
    speed: 2.0,
    goldReward: 40,
    leakDamage: 1,
    scale: 1.1,
    color: { r: 0.6, g: 0.3, b: 0.7 },
    canFly: false,
    armor: 1,
    special: 'split',
    splitCount: 2,
    splitHPPercent: 0.4 // Дочерние единицы имеют 40% HP родителя
  },
  SPEEDSTER: {
    id: 'speedster',
    name: 'Speedster',
    nameRu: 'Спринтер',
    baseHP: 6,
    hpPerWave: 2,
    speed: 5.0,
    goldReward: 25,
    leakDamage: 1,
    scale: 0.7,
    color: { r: 0.9, g: 0.7, b: 0.2 },
    canFly: false,
    armor: 0,
    special: 'dash',
    dashChance: 0.3,
    dashMultiplier: 2.5
  },
  JUGGERNAUT: {
    id: 'juggernaut',
    name: 'Juggernaut',
    nameRu: 'Джаггернаут',
    baseHP: 120,
    hpPerWave: 20,
    speed: 0.8,
    goldReward: 100,
    leakDamage: 4,
    scale: 1.6,
    color: { r: 0.3, g: 0.3, b: 0.4 },
    canFly: false,
    armor: 15,
    special: 'heavy_armor',
    damageReduction: 0.5 // Снижает получаемый урон на 50%
  }
};

/**
 * Get enemy type by ID
 */
export function getEnemyType(typeId) {
  for (const key in EnemyTypes) {
    if (EnemyTypes[key].id === typeId) {
      return EnemyTypes[key];
    }
  }
  return EnemyTypes.GRUNT;
}

/**
 * Get enemy stats for a specific wave
 */
export function getEnemyStats(typeId, waveNumber = 1) {
  const base = getEnemyType(typeId);
  
  return {
    ...base,
    hp: Math.round(base.baseHP + (waveNumber - 1) * base.hpPerWave),
    wave: waveNumber
  };
}

/**
 * Get enemy composition for a wave
 * Returns array of enemy types to spawn
 */
export function getEnemyComposition(waveNumber) {
  const composition = [];
  
  // Wave 1-3: Only grunts
  if (waveNumber <= 3) {
    const count = 2 + waveNumber;
    for (let i = 0; i < count; i++) {
      composition.push('grunt');
    }
    return composition;
  }
  
  // Wave 4-6: Grunts + Runners
  if (waveNumber <= 6) {
    const gruntCount = 2 + waveNumber;
    const runnerCount = Math.floor(waveNumber / 2);
    for (let i = 0; i < gruntCount; i++) composition.push('grunt');
    for (let i = 0; i < runnerCount; i++) composition.push('runner');
    return composition;
  }
  
  // Wave 7-9: Grunts + Runners + Tanks
  if (waveNumber <= 9) {
    const gruntCount = 3 + waveNumber;
    const runnerCount = Math.floor(waveNumber / 2);
    const tankCount = Math.floor((waveNumber - 6) / 2);
    for (let i = 0; i < gruntCount; i++) composition.push('grunt');
    for (let i = 0; i < runnerCount; i++) composition.push('runner');
    for (let i = 0; i < tankCount; i++) composition.push('tank');
    return composition;
  }
  
  // Wave 10: First Boss
  if (waveNumber === 10) {
    composition.push('boss');
    const minionCount = 4;
    for (let i = 0; i < minionCount; i++) composition.push('grunt');
    for (let i = 0; i < 2; i++) composition.push('runner');
    return composition;
  }
  
  // Wave 11-14: Introduce new enemy types
  if (waveNumber <= 14) {
    const gruntCount = 3 + Math.floor(waveNumber / 3);
    const runnerCount = Math.floor(waveNumber / 3);
    const tankCount = Math.floor(waveNumber / 5);
    const flyerCount = Math.floor((waveNumber - 10) / 3);
    const stealthCount = waveNumber >= 12 ? 1 : 0;
    
    for (let i = 0; i < gruntCount; i++) composition.push('grunt');
    for (let i = 0; i < runnerCount; i++) composition.push('runner');
    for (let i = 0; i < tankCount; i++) composition.push('tank');
    for (let i = 0; i < flyerCount; i++) composition.push('flyer');
    for (let i = 0; i < stealthCount; i++) composition.push('stealth');
    return composition;
  }
  
  // Wave 15: Healer + Spawner introduction
  if (waveNumber === 15) {
    composition.push('healer', 'spawner');
    const gruntCount = 5;
    const tankCount = 2;
    for (let i = 0; i < gruntCount; i++) composition.push('grunt');
    for (let i = 0; i < tankCount; i++) composition.push('tank');
    return composition;
  }
  
  // Wave 16-19: Mix with special enemies
  if (waveNumber <= 19) {
    const gruntCount = 3 + Math.floor(waveNumber / 4);
    const runnerCount = Math.floor(waveNumber / 4);
    const tankCount = Math.floor(waveNumber / 6);
    const flyerCount = Math.floor((waveNumber - 10) / 4);
    const stealthCount = Math.floor((waveNumber - 12) / 4);
    const healerCount = waveNumber >= 16 ? 1 : 0;
    const spawnerCount = waveNumber >= 17 ? 1 : 0;
    
    for (let i = 0; i < gruntCount; i++) composition.push('grunt');
    for (let i = 0; i < runnerCount; i++) composition.push('runner');
    for (let i = 0; i < tankCount; i++) composition.push('tank');
    for (let i = 0; i < flyerCount; i++) composition.push('flyer');
    for (let i = 0; i < stealthCount; i++) composition.push('stealth');
    for (let i = 0; i < healerCount; i++) composition.push('healer');
    for (let i = 0; i < spawnerCount; i++) composition.push('spawner');
    return composition;
  }
  
  // Wave 20: Second Boss
  if (waveNumber === 20) {
    composition.push('boss');
    const juggernautCount = 1;
    const healerCount = 2;
    const spawnerCount = 2;
    for (let i = 0; i < juggernautCount; i++) composition.push('juggernaut');
    for (let i = 0; i < healerCount; i++) composition.push('healer');
    for (let i = 0; i < spawnerCount; i++) composition.push('spawner');
    for (let i = 0; i < 5; i++) composition.push('grunt');
    return composition;
  }
  
  // Wave 21+: All enemy types including rare ones
  const gruntCount = 3 + Math.floor(waveNumber / 5);
  const runnerCount = Math.floor(waveNumber / 4);
  const tankCount = Math.floor(waveNumber / 7);
  const flyerCount = Math.floor((waveNumber - 10) / 5);
  const stealthCount = Math.floor((waveNumber - 12) / 5);
  const healerCount = Math.floor((waveNumber - 15) / 6);
  const spawnerCount = Math.floor((waveNumber - 17) / 6);
  const splitterCount = waveNumber >= 22 ? Math.floor((waveNumber - 22) / 8) + 1 : 0;
  const speedsterCount = waveNumber >= 23 ? Math.floor((waveNumber - 23) / 7) + 1 : 0;
  const juggernautCount = waveNumber >= 24 ? Math.floor((waveNumber - 24) / 10) + 1 : 0;
  
  for (let i = 0; i < gruntCount; i++) composition.push('grunt');
  for (let i = 0; i < runnerCount; i++) composition.push('runner');
  for (let i = 0; i < tankCount; i++) composition.push('tank');
  for (let i = 0; i < flyerCount; i++) composition.push('flyer');
  for (let i = 0; i < stealthCount; i++) composition.push('stealth');
  for (let i = 0; i < healerCount; i++) composition.push('healer');
  for (let i = 0; i < spawnerCount; i++) composition.push('spawner');
  for (let i = 0; i < splitterCount; i++) composition.push('splitter');
  for (let i = 0; i < speedsterCount; i++) composition.push('speedster');
  for (let i = 0; i < juggernautCount; i++) composition.push('juggernaut');
  
  // Boss every 10 waves after 20
  if (waveNumber % 10 === 0 && waveNumber > 20) {
    composition.push('boss');
  }
  
  return composition;
}

/**
 * Check if tower can hit enemy
 */
export function canTowerHitEnemy(towerType, enemyType) {
  // Flyers can only be hit by ARCHER, LIGHTNING, SNIPER
  if (enemyType.canFly) {
    return ['archer', 'ice', 'lightning', 'sniper'].includes(towerType.id);
  }
  return true;
}

/**
 * Get all enemy types
 */
export function getAllEnemyTypes() {
  return Object.values(EnemyTypes);
}
