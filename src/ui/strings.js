/**
 * UI Strings - Localization
 * Canonical EN/RU string table for MVP.
 * Task 3.3: HUD Core - String constants
 */

/**
 * Supported languages
 */
export const SUPPORTED_LANGUAGES = ['en', 'ru'];

/**
 * Default language (Russian for Yandex Games primary audience)
 */
export const DEFAULT_LANGUAGE = 'ru';

/**
 * Complete string table for all UI text.
 * Structure: { en: {...}, ru: {...} }
 */
export const STRINGS = {
  en: {
    // HUD labels
    WAVE: 'Wave',
    BASE_HP: 'Base HP',
    GOLD: 'Gold',
    BUILD_PHASE: 'Build Phase',
    BEST: 'Best',

    // Main menu
    GAME_TITLE: 'Core Bastion',
    SUBTITLE: 'Tower Defense',
    BEST_WAVE: 'Best Wave',
    PLAY: 'Play',

    // Defeat screen
    DEFEAT: 'Defeat',
    DEFEAT_WAVE: 'Wave',
    DEFEAT_BEST: 'Best',
    CONTINUE_AD: 'Continue (Ad)',
    RESTART: 'Restart',

    // Game messages
    NOT_ENOUGH_GOLD: 'Not enough gold',
    SLOT_OCCUPIED: 'Slot occupied'
  },

  ru: {
    // HUD labels
    WAVE: 'Волна',
    BASE_HP: 'HP Базы',
    GOLD: 'Золото',
    BUILD_PHASE: 'Подготовка',
    BEST: 'Рекорд',

    // Main menu
    GAME_TITLE: 'Core Bastion',
    SUBTITLE: 'Tower Defense',
    BEST_WAVE: 'Лучшая волна',
    PLAY: 'Играть',

    // Defeat screen
    DEFEAT: 'Поражение',
    DEFEAT_WAVE: 'Волна',
    DEFEAT_BEST: 'Рекорд',
    CONTINUE_AD: 'Продолжить (Реклама)',
    RESTART: 'Заново',

    // Game messages
    NOT_ENOUGH_GOLD: 'Недостаточно золота',
    SLOT_OCCUPIED: 'Слот занят'
  }
};

/**
 * Get a string in the specified language.
 * Falls back to default language if key or language not found.
 * @param {string} key - String key (e.g., 'WAVE', 'PLAY')
 * @param {string} lang - Language code ('en' or 'ru')
 * @returns {string}
 */
export function getString(key, lang = DEFAULT_LANGUAGE) {
  // Validate language
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
