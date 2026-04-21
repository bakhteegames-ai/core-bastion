/**
 * Live production ability definitions.
 * This is the single source of truth for the shipped ability bar + runtime.
 */
export const ABILITIES = {
  airstrike: {
    id: 'airstrike',
    name: 'Air Strike',
    nameRu: 'Авиаудар',
    cost: 100,
    cooldown: 60,
    icon: '💣',
    description: 'Deal 50 damage to all enemies',
    descriptionRu: 'Нанести 50 урона всем врагам',
    hotkey: '1',
    effect: {
      type: 'global_damage',
      damage: 50
    }
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    nameRu: 'Заморозка',
    cost: 75,
    cooldown: 45,
    icon: '❄️',
    description: 'Slow all enemies by 70% for 3s',
    descriptionRu: 'Замедлить всех врагов на 70% на 3 сек',
    hotkey: '2',
    effect: {
      type: 'global_slow',
      slowAmount: 0.7,
      duration: 3
    }
  },
  heal: {
    id: 'heal',
    name: 'Heal Base',
    nameRu: 'Лечение базы',
    cost: 150,
    cooldown: 90,
    icon: '❤️',
    description: 'Restore 3 base HP',
    descriptionRu: 'Восстановить 3 HP базы',
    hotkey: '3',
    effect: {
      type: 'base_heal',
      amount: 3
    }
  },
  goldrush: {
    id: 'goldrush',
    name: 'Gold Rush',
    nameRu: 'Золотая лихорадка',
    cost: 0,
    cooldown: 120,
    icon: '💰',
    description: '2x gold for 10s',
    descriptionRu: '2x золота на 10 сек',
    hotkey: '4',
    effect: {
      type: 'gold_multiplier',
      multiplier: 2,
      duration: 10
    }
  }
};

export function getAbility(abilityId) {
  return ABILITIES[abilityId] || null;
}

export function getAllAbilities() {
  return { ...ABILITIES };
}
