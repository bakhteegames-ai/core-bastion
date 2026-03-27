/**
 * UI Strings - Localization
 * Canonical EN/RU string table for MVP.
 * Uses lowercase dot-notation keys.
 */

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ['en', 'ru'];

/**
 * Default language
 */
export const DEFAULT_LANGUAGE = 'en';

/**
 * Complete string table for all UI text.
 * Structure: { en: {...}, ru: {...} }
 * Keys use lowercase dot-notation.
 */
export const STRINGS = {
  en: {
    // HUD
    'hud.wave': 'Wave',
    'hud.hp': 'Base HP',
    'hud.gold': 'Gold',
    'hud.build_phase': 'Build Phase',
    'hud.best': 'Best',
    
    // Menu
    'menu.title': 'Core Bastion',
    'menu.subtitle': 'Tower Defense',
    'menu.best_wave': 'Best Wave',
    'menu.play': 'Play',
    
    // Defeat
    'defeat.title': 'Defeat',
    'defeat.wave': 'Wave',
    'defeat.best': 'Best',
    'defeat.continue_ad': 'Continue (Ad)',
    'defeat.restart': 'Restart',
    
    // Messages
    'msg.not_enough_gold': 'Not enough gold',
    'msg.slot_occupied': 'Slot occupied',
    
    // Towers
    'tower.archer': 'Archer Tower',
    'tower.cannon': 'Cannon Tower',
    'tower.ice': 'Ice Tower',
    'tower.lightning': 'Lightning Tower',
    'tower.sniper': 'Sniper Tower',
    
    'tower.damage': 'Damage',
    'tower.range': 'Range',
    'tower.speed': 'Speed',
    'tower.upgrade': 'Upgrade',
    'tower.sell': 'Sell',
    'tower.max_level': 'MAX LEVEL',
    
    // Abilities
    'ability.airstrike': 'Air Strike',
    'ability.airstrike.desc': 'Deal 100 damage in area',
    'ability.freeze': 'Freeze',
    'ability.freeze.desc': 'Freeze all enemies for 3s',
    'ability.heal': 'Heal Base',
    'ability.heal.desc': 'Restore 3 base HP',
    'ability.goldrush': 'Gold Rush',
    'ability.goldrush.desc': '2x gold for 10s',
    'ability.cooldown': 'Cooldown',
    'ability.free': 'Free'
  },

  ru: {
    // HUD
    'hud.wave': 'Волна',
    'hud.hp': 'HP Базы',
    'hud.gold': 'Золото',
    'hud.build_phase': 'Подготовка',
    'hud.best': 'Рекорд',
    
    // Menu
    'menu.title': 'Core Bastion',
    'menu.subtitle': 'Tower Defense',
    'menu.best_wave': 'Лучшая волна',
    'menu.play': 'Играть',
    
    // Defeat
    'defeat.title': 'Поражение',
    'defeat.wave': 'Волна',
    'defeat.best': 'Рекорд',
    'defeat.continue_ad': 'Продолжить (Реклама)',
    'defeat.restart': 'Заново',
    
    // Messages
    'msg.not_enough_gold': 'Недостаточно золота',
    'msg.slot_occupied': 'Слот занят',
    
    // Towers
    'tower.archer': 'Башня лучников',
    'tower.cannon': 'Пушечная башня',
    'tower.ice': 'Ледяная башня',
    'tower.lightning': 'Молниевая башня',
    'tower.sniper': 'Снайперская башня',
    
    'tower.damage': 'Урон',
    'tower.range': 'Радиус',
    'tower.speed': 'Скорость',
    'tower.upgrade': 'Улучшить',
    'tower.sell': 'Продать',
    'tower.max_level': 'МАКС. УРОВЕНЬ',
    
    // Abilities
    'ability.airstrike': 'Авиаудар',
    'ability.airstrike.desc': '100 урона по области',
    'ability.freeze': 'Заморозка',
    'ability.freeze.desc': 'Заморозить врагов на 3 сек',
    'ability.heal': 'Лечение базы',
    'ability.heal.desc': 'Восстановить 3 HP базы',
    'ability.goldrush': 'Золотая лихорадка',
    'ability.goldrush.desc': '2x золота на 10 сек',
    'ability.cooldown': 'Кулдаун',
    'ability.free': 'Бесплатно'
  }
};

/**
 * Get a string in the specified language.
 * @param {string} key - String key (e.g., 'hud.wave', 'menu.play')
 * @param {string} lang - Language code ('en' or 'ru')
 * @returns {string}
 */
export function getString(key, lang = DEFAULT_LANGUAGE) {
  // Normalize language
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    lang = DEFAULT_LANGUAGE;
  }

  // Get string from table
  const langStrings = STRINGS[lang];
  if (langStrings && langStrings[key]) {
    return langStrings[key];
  }

  // Fallback to default language
  const defaultStrings = STRINGS[DEFAULT_LANGUAGE];
  if (defaultStrings && defaultStrings[key]) {
    return defaultStrings[key];
  }

  // Key not found - return key itself
  console.warn(`[strings] Missing string key: ${key}`);
  return key;
}

/**
 * Get all strings for a language.
 * @param {string} lang - Language code
 * @returns {Object}
 */
export function getStrings(lang = DEFAULT_LANGUAGE) {
  if (!SUPPORTED_LANGUAGES.includes(lang)) {
    lang = DEFAULT_LANGUAGE;
  }
  return { ...STRINGS[lang] };
}

/**
 * Normalize a language code to 'en' or 'ru'.
 * @param {string} lang - Raw language code
 * @returns {string}
 */
export function normalizeLanguage(lang) {
  if (!lang) return DEFAULT_LANGUAGE;
  const code = lang.split('-')[0].toLowerCase();
  return code === 'ru' ? 'ru' : 'en';
}
