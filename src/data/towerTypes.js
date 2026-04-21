/**
 * Tower types and level scaling.
 */

export const TowerTypes = {
  ARCHER: {
    id: 'archer',
    name: 'Archer Tower',
    nameRu: 'Лучевая башня',
    cost: 100,
    damage: 15,
    range: 6.0,
    fireRate: 1.5,
    projectileSpeed: 20,
    special: null,
    color: { r: 0.4, g: 0.6, b: 0.3 },
    description: 'Fast attack, low damage',
    descriptionRu: 'Высокая скорострельность и слабый урон'
  },
  CANNON: {
    id: 'cannon',
    name: 'Cannon Tower',
    nameRu: 'Пушечная башня',
    cost: 200,
    damage: 40,
    range: 4.5,
    fireRate: 0.5,
    projectileSpeed: 12,
    splashRadius: 2.0,
    splashFalloff: 0.5,
    special: 'splash',
    color: { r: 0.6, g: 0.5, b: 0.3 },
    description: 'AOE splash damage',
    descriptionRu: 'Мощный взрывной урон по области'
  },
  ICE: {
    id: 'ice',
    name: 'Cryo Tower',
    nameRu: 'Крио-башня',
    cost: 150,
    damage: 8,
    range: 5.0,
    fireRate: 1.2,
    projectileSpeed: 15,
    slowFactor: 0.5,
    slowDuration: 2.0,
    special: 'slow',
    color: { r: 0.3, g: 0.7, b: 0.9 },
    description: 'Slows enemies by 50%',
    descriptionRu: 'Замедляет врагов на 50%'
  },
  LIGHTNING: {
    id: 'lightning',
    name: 'Arc Tower',
    nameRu: 'Дуговая башня',
    cost: 250,
    damage: 25,
    range: 5.5,
    fireRate: 0.8,
    projectileSpeed: 100,
    chainCount: 3,
    chainDecay: 0.7,
    special: 'chain',
    color: { r: 0.6, g: 0.3, b: 0.9 },
    description: 'Chain lightning hits 3 targets',
    descriptionRu: 'Цепная дуга бьет до трех целей'
  },
  SNIPER: {
    id: 'sniper',
    name: 'Relay Tower',
    nameRu: 'Релейная башня',
    cost: 300,
    damage: 100,
    range: 10.0,
    fireRate: 0.3,
    projectileSpeed: 50,
    critChance: 0.25,
    critMultiplier: 2.0,
    special: 'crit',
    color: { r: 0.5, g: 0.2, b: 0.2 },
    description: 'Long range, 25% crit chance',
    descriptionRu: 'Большая дальность и 25% шанс критического урона'
  }
};

const LEVEL_MULTIPLIERS = {
  1: { damage: 1.0, range: 1.0, fireRate: 1.0 },
  2: { damage: 1.25, range: 1.15, fireRate: 1.1 },
  3: { damage: 1.5, range: 1.3, fireRate: 1.2 },
  4: { damage: 1.75, range: 1.45, fireRate: 1.3 },
  5: { damage: 2.0, range: 1.6, fireRate: 1.4 }
};

export function getTowerType(typeId) {
  for (const key in TowerTypes) {
    if (TowerTypes[key].id === typeId) {
      return TowerTypes[key];
    }
  }
  return TowerTypes.ARCHER;
}

export function getTowerStats(typeId, level = 1) {
  const base = getTowerType(typeId);
  const mult = LEVEL_MULTIPLIERS[Math.min(level, 5)] || LEVEL_MULTIPLIERS[5];

  return {
    ...base,
    level,
    damage: Math.round(base.damage * mult.damage),
    range: parseFloat((base.range * mult.range).toFixed(1)),
    fireRate: parseFloat((base.fireRate * mult.fireRate).toFixed(2)),
    upgradeCost: getUpgradeCost(base.cost, level)
  };
}

export function getUpgradeCost(baseCost, currentLevel) {
  if (currentLevel >= 5) return 0;
  return Math.round(baseCost * 0.5 * currentLevel);
}

export function getSellValue(baseCost, currentLevel) {
  let totalInvested = baseCost;
  for (let i = 1; i < currentLevel; i++) {
    totalInvested += getUpgradeCost(baseCost, i);
  }
  return Math.round(totalInvested * 0.5);
}

export function getAllTowerTypes() {
  return Object.values(TowerTypes);
}
