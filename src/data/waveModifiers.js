/**
 * Wave Modifiers
 * Random modifiers applied every N waves to shake up gameplay.
 * Each modifier has a weight (rarity) and can stack.
 */

export const MODIFIER_RARITY = {
  COMMON: 3,    // 37.5% chance
  UNCOMMON: 2,  // 25% chance  
  RARE: 1       // 12.5% chance
};

export const WAVE_MODIFIERS = {
  // COMMON
  'swarm': {
    id: 'swarm',
    name: 'Рой',
    description: 'В 2 раза больше врагов, но у них -30% HP',
    rarity: MODIFIER_RARITY.COMMON,
    icon: 'crowd',
    effects: {
      enemyCountMultiplier: 2.0,
      enemyHpMultiplier: 0.7,
      spawnIntervalMultiplier: 0.6
    }
  },

  'tank_wave': {
    id: 'tank_wave',
    name: 'Броня',
    description: 'Все враги имеют +3 брони',
    rarity: MODIFIER_RARITY.COMMON,
    icon: 'shield',
    effects: {
      armorBonus: 3
    }
  },

  'rush': {
    id: 'rush',
    name: 'Натиск',
    description: 'Враги на 50% быстрее',
    rarity: MODIFIER_RARITY.COMMON,
    icon: 'bolt',
    effects: {
      speedMultiplier: 1.5
    }
  },

  // UNCOMMON
  'expensive_towers': {
    id: 'expensive_towers',
    name: 'Инфляция',
    description: 'Башни стоят на 40% дороже',
    rarity: MODIFIER_RARITY.UNCOMMON,
    icon: 'coin-up',
    effects: {
      towerCostMultiplier: 1.4
    }
  },

  'short_build': {
    id: 'short_build',
    name: 'Спешка',
    description: 'Фаза строительства длится всего 1.5 секунды',
    rarity: MODIFIER_RARITY.UNCOMMON,
    icon: 'clock',
    effects: {
      buildPhaseDuration: 1.5
    }
  },

  'flying_horde': {
    id: 'flying_horde',
    name: 'Воздушное вторжение',
    description: '50% врагов — летающие (игнорируют ледяные башни)',
    rarity: MODIFIER_RARITY.UNCOMMON,
    icon: 'wing',
    effects: {
      flyerChance: 0.5
    }
  },

  // RARE
  'double_boss': {
    id: 'double_boss',
    name: 'Двойной босс',
    description: '2 босса вместо 1 на босс-волне',
    rarity: MODIFIER_RARITY.RARE,
    icon: 'crown',
    effects: {
      bossCount: 2,
      bossHpMultiplier: 0.8
    }
  },

  'regeneration': {
    id: 'regeneration',
    name: 'Регенерация',
    description: 'Враги восстанавливают 2% HP каждую секунду',
    rarity: MODIFIER_RARITY.RARE,
    icon: 'heart-plus',
    effects: {
      hpRegenPercent: 0.02
    }
  },

  'elite_minions': {
    id: 'elite_minions',
    name: 'Элита',
    description: 'Обычные враги имеют +50% HP и +20% урона базе',
    rarity: MODIFIER_RARITY.RARE,
    icon: 'star',
    effects: {
      enemyHpMultiplier: 1.5,
      leakDamageMultiplier: 1.2
    }
  }
};

/**
 * Get modifier by ID
 */
export function getModifier(id) {
  return WAVE_MODIFIERS[id] || null;
}

/**
 * Get all modifiers as array
 */
export function getAllModifiers() {
  return Object.values(WAVE_MODIFIERS);
}

/**
 * Pick random modifiers for a run
 * @param {number} count - How many modifiers to pick
 * @param {number} waveInterval - Apply every N waves
 * @returns {Array} [{wave: number, modifier: object}]
 */
export function generateModifierSchedule(count = 3, waveInterval = 5) {
  const schedule = [];
  const available = getAllModifiers();
  
  // Weighted pool
  const pool = [];
  available.forEach(mod => {
    for (let i = 0; i < mod.rarity; i++) {
      pool.push(mod);
    }
  });

  for (let i = 0; i < count; i++) {
    const wave = (i + 1) * waveInterval;
    const randomIndex = Math.floor(Math.random() * pool.length);
    schedule.push({
      wave,
      modifier: pool[randomIndex]
    });
  }

  return schedule;
}

/**
 * Check if a wave has an active modifier
 */
export function getModifierForWave(waveNumber, schedule) {
  const entry = schedule.find(s => s.wave === waveNumber);
  return entry ? entry.modifier : null;
}
