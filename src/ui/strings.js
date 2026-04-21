/**
 * UI strings and localization helpers.
 */

export const SUPPORTED_LANGUAGES = ['en', 'ru'];
export const DEFAULT_LANGUAGE = 'en';

export const STRINGS = {
  en: {
    'hud.wave': 'Wave',
    'hud.hp': 'Core Integrity',
    'hud.gold': 'Command Budget',
    'hud.build_phase': 'Build Window',
    'hud.best': 'Best',

    'menu.title': 'Core Bastion',
    'menu.subtitle': 'A breached orbital fortress is collapsing around its reactor.',
    'menu.best_wave': 'Best Wave',
    'menu.play': 'Deploy',

    'defeat.title': 'Breach Confirmed',
    'defeat.wave': 'Wave',
    'defeat.best': 'Best',
    'defeat.continue_ad': 'Emergency Continue',
    'defeat.restart': 'Re-arm Bastion',

    'msg.not_enough_gold': 'Not enough gold',
    'msg.slot_occupied': 'Slot occupied',

    'tower.archer': 'Archer Tower',
    'tower.cannon': 'Cannon Tower',
    'tower.ice': 'Cryo Tower',
    'tower.lightning': 'Arc Tower',
    'tower.sniper': 'Relay Tower',

    'tower.damage': 'Damage',
    'tower.range': 'Range',
    'tower.speed': 'Speed',
    'tower.upgrade': 'Upgrade',
    'tower.sell': 'Sell',
    'tower.max_level': 'Max Level',

    'ability.airstrike': 'Air Strike',
    'ability.airstrike.desc': 'Deal 100 damage in area',
    'ability.freeze': 'Freeze',
    'ability.freeze.desc': 'Freeze all enemies for 3s',
    'ability.heal': 'Heal Core',
    'ability.heal.desc': 'Restore 3 core HP',
    'ability.goldrush': 'Gold Rush',
    'ability.goldrush.desc': '2x gold for 10s',
    'ability.cooldown': 'Cooldown',
    'ability.free': 'Free'
  },

  ru: {
    'hud.wave': 'Волна',
    'hud.hp': 'Целостность ядра',
    'hud.gold': 'Ресурсы командования',
    'hud.build_phase': 'Окно подготовки',
    'hud.best': 'Рекорд',

    'menu.title': 'Core Bastion',
    'menu.subtitle': 'Орбитальная крепость пробита. Удерживайте мост и защищайте реактор.',
    'menu.best_wave': 'Лучшая волна',
    'menu.play': 'В бой',

    'defeat.title': 'Прорыв подтвержден',
    'defeat.wave': 'Волна',
    'defeat.best': 'Рекорд',
    'defeat.continue_ad': 'Экстренное продолжение',
    'defeat.restart': 'Поднять бастион',

    'msg.not_enough_gold': 'Недостаточно золота',
    'msg.slot_occupied': 'Слот занят',

    'tower.archer': 'Лучевая башня',
    'tower.cannon': 'Пушечная башня',
    'tower.ice': 'Крио-башня',
    'tower.lightning': 'Дуговая башня',
    'tower.sniper': 'Релейная башня',

    'tower.damage': 'Урон',
    'tower.range': 'Дальность',
    'tower.speed': 'Скорость',
    'tower.upgrade': 'Улучшить',
    'tower.sell': 'Продать',
    'tower.max_level': 'Макс. уровень',

    'ability.airstrike': 'Авиоудар',
    'ability.airstrike.desc': 'Наносит 100 урона по области',
    'ability.freeze': 'Заморозка',
    'ability.freeze.desc': 'Останавливает врагов на 3 секунды',
    'ability.heal': 'Ремонт ядра',
    'ability.heal.desc': 'Восстанавливает 3 HP ядра',
    'ability.goldrush': 'Золотой прилив',
    'ability.goldrush.desc': '2x золота на 10 секунд',
    'ability.cooldown': 'Перезарядка',
    'ability.free': 'Бесплатно'
  }
};

export function getString(key, lang = DEFAULT_LANGUAGE) {
  const normalized = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  return STRINGS[normalized]?.[key] || STRINGS[DEFAULT_LANGUAGE]?.[key] || key;
}

export function getStrings(lang = DEFAULT_LANGUAGE) {
  const normalized = SUPPORTED_LANGUAGES.includes(lang) ? lang : DEFAULT_LANGUAGE;
  return { ...STRINGS[normalized] };
}

export function normalizeLanguage(lang) {
  if (!lang) return DEFAULT_LANGUAGE;
  const code = lang.split('-')[0].toLowerCase();
  return code === 'ru' ? 'ru' : 'en';
}
