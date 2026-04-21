/**
 * Live production ability definitions.
 */
export const ABILITIES = {
  airstrike: {
    id: 'airstrike',
    name: 'Air Strike',
    nameRu: 'Авиоудар',
    cost: 100,
    cooldown: 60,
    icon: 'AS',
    description: 'Deal 50 damage to all enemies',
    descriptionRu: 'Наносит 50 урона всем врагам',
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
    icon: 'FR',
    description: 'Slow all enemies by 70% for 3s',
    descriptionRu: 'Замедляет всех врагов на 70% на 3 секунды',
    hotkey: '2',
    effect: {
      type: 'global_slow',
      slowAmount: 0.7,
      duration: 3
    }
  },
  heal: {
    id: 'heal',
    name: 'Heal Core',
    nameRu: 'Ремонт ядра',
    cost: 150,
    cooldown: 90,
    icon: 'HL',
    description: 'Restore 3 base HP',
    descriptionRu: 'Восстанавливает 3 HP ядра',
    hotkey: '3',
    effect: {
      type: 'base_heal',
      amount: 3
    }
  },
  goldrush: {
    id: 'goldrush',
    name: 'Gold Rush',
    nameRu: 'Золотой прилив',
    cost: 0,
    cooldown: 120,
    icon: 'GR',
    description: '2x gold for 10s',
    descriptionRu: 'Дает 2x золота на 10 секунд',
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
