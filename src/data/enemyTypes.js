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
  
  // Boss wave (every 10 waves)
  if (waveNumber % 10 === 0) {
    composition.push('boss');
    const minionCount = Math.floor(waveNumber / 5);
    for (let i = 0; i < minionCount; i++) composition.push('grunt');
    for (let i = 0; i < minionCount / 2; i++) composition.push('runner');
    return composition;
  }
  
  // Wave 11+: All types including flyers
  const gruntCount = 3 + Math.floor(waveNumber / 3);
  const runnerCount = Math.floor(waveNumber / 3);
  const tankCount = Math.floor(waveNumber / 5);
  const flyerCount = Math.floor((waveNumber - 10) / 5);
  
  for (let i = 0; i < gruntCount; i++) composition.push('grunt');
  for (let i = 0; i < runnerCount; i++) composition.push('runner');
  for (let i = 0; i < tankCount; i++) composition.push('tank');
  for (let i = 0; i < flyerCount; i++) composition.push('flyer');
  
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
