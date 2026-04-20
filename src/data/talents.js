// src/data/talents.js
export const TALENT_CATEGORIES = {
  OFFENSE: 'offense',
  DEFENSE: 'defense',
  ECONOMY: 'economy',
  UTILITY: 'utility'
};

export const TALENTS = {
  'sharp_arrows': {
    id: 'sharp_arrows', name: 'Острые Стрелы',
    description: 'Увеличивает урон всех башен на {value}%',
    category: TALENT_CATEGORIES.OFFENSE, maxLevel: 5,
    baseValue: 0, valuePerLevel: 5, baseCost: 50, costScaling: 1.5, icon: 'sword'
  },
  'sniper_training': {
    id: 'sniper_training', name: 'Снайперская Подготовка',
    description: 'Увеличивает дальность всех башен на {value}%',
    category: TALENT_CATEGORIES.OFFENSE, maxLevel: 5,
    baseValue: 0, valuePerLevel: 3, baseCost: 60, costScaling: 1.6, icon: 'crosshair'
  },
  'crit_mastery': {
    id: 'crit_mastery', name: 'Мастер Критов',
    description: 'Критический урон сильнее на {value}%',
    category: TALENT_CATEGORIES.OFFENSE, maxLevel: 5,
    baseValue: 0, valuePerLevel: 10, baseCost: 80, costScaling: 1.7, icon: 'bolt'
  },
  'fortified_base': {
    id: 'fortified_base', name: 'Укреплённая База',
    description: 'База имеет +{value} HP в начале забега',
    category: TALENT_CATEGORIES.DEFENSE, maxLevel: 5,
    baseValue: 0, valuePerLevel: 2, baseCost: 40, costScaling: 1.4, icon: 'shield'
  },
  'emergency_repair': {
    id: 'emergency_repair', name: 'Аварийный Ремонт',
    description: 'Восстанавливает {value} HP базе после каждой волны',
    category: TALENT_CATEGORIES.DEFENSE, maxLevel: 3,
    baseValue: 0, valuePerLevel: 1, baseCost: 100, costScaling: 2.0, icon: 'wrench'
  },
  'greedy_goblin': {
    id: 'greedy_goblin', name: 'Жадный Гоблин',
    description: 'Начальное золото +{value}',
    category: TALENT_CATEGORIES.ECONOMY, maxLevel: 5,
    baseValue: 0, valuePerLevel: 15, baseCost: 30, costScaling: 1.3, icon: 'coins'
  },
  'bounty_hunter': {
    id: 'bounty_hunter', name: 'Охотник за Головами',
    description: 'Золото за убийство врагов +{value}%',
    category: TALENT_CATEGORIES.ECONOMY, maxLevel: 5,
    baseValue: 0, valuePerLevel: 8, baseCost: 55, costScaling: 1.5, icon: 'skull'
  },
  'interest_gains': {
    id: 'interest_gains', name: 'Банкир',
    description: 'Неиспользованное золото приносит {value}% бонуса между волнами',
    category: TALENT_CATEGORIES.ECONOMY, maxLevel: 3,
    baseValue: 0, valuePerLevel: 5, baseCost: 120, costScaling: 1.8, icon: 'chart'
  },
  'fast_builder': {
    id: 'fast_builder', name: 'Быстрый Строитель',
    description: 'Фаза строительства длится на {value} секунды дольше',
    category: TALENT_CATEGORIES.UTILITY, maxLevel: 3,
    baseValue: 0, valuePerLevel: 1, baseCost: 70, costScaling: 1.6, icon: 'hammer'
  },
  'second_chance': {
    id: 'second_chance', name: 'Второй Шанс',
    description: 'Один бесплатный Continue за забег (без рекламы)',
    category: TALENT_CATEGORIES.UTILITY, maxLevel: 1,
    baseValue: 0, valuePerLevel: 1, baseCost: 500, costScaling: 1.0, icon: 'heart'
  }
};

export function getTalentCost(talentId, currentLevel) {
  const talent = TALENTS[talentId];
  if (!talent || currentLevel >= talent.maxLevel) return Infinity;
  return Math.floor(talent.baseCost * Math.pow(currentLevel + 1, talent.costScaling));
}

export function getTalentValue(talentId, currentLevel) {
  const talent = TALENTS[talentId];
  if (!talent) return 0;
  return talent.baseValue + (currentLevel * talent.valuePerLevel);
}

export function getAllTalents() { return Object.values(TALENTS); }

export function calculateRunShards(waveReached, enemiesKilled, isVictory = false) {
  return 10 + (waveReached * 5) + Math.floor(enemiesKilled * 0.5) + (isVictory ? 50 : 0);
}
