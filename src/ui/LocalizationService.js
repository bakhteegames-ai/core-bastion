/**
 * LocalizationService
 * Manages UI language and string resolution.
 * Integrates with PlatformBridge for platform language detection.
 */

import { getString, getStrings, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './strings.js';

export class LocalizationService {
  constructor(platformBridge = null) {
    this._platformBridge = platformBridge;
    this._currentLang = DEFAULT_LANGUAGE;
    this._initialized = false;
  }

  /**
   * Initialize localization service.
   * Detects language from platform or browser.
   * @returns {Promise<void>}
   */
  async initialize() {
    // Try to get language from platform bridge
    if (this._platformBridge && this._platformBridge.isInitialized) {
      const platformLang = this._platformBridge.getLanguage();
      if (platformLang && SUPPORTED_LANGUAGES.includes(platformLang)) {
        this._currentLang = platformLang;
        console.log(`[LocalizationService] Platform language: ${this._currentLang}`);
        this._initialized = true;
        return;
      }
    }

    // Fallback to browser language
    const browserLang = this._detectBrowserLanguage();
    if (browserLang) {
      this._currentLang = browserLang;
    }

    console.log(`[LocalizationService] Using language: ${this._currentLang}`);
    this._initialized = true;
  }

  /**
   * Detect browser language.
   * @returns {string|null}
   */
  _detectBrowserLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    if (!browserLang) return null;

    // Extract language code (e.g., 'en-US' -> 'en')
    const langCode = browserLang.split('-')[0].toLowerCase();

    if (SUPPORTED_LANGUAGES.includes(langCode)) {
      return langCode;
    }

    return null;
  }

  /**
   * Get current language.
   * @returns {string}
   */
  get language() {
    return this._currentLang;
  }

  /**
   * Set language manually.
   * @param {string} lang
   */
  setLanguage(lang) {
    if (SUPPORTED_LANGUAGES.includes(lang)) {
      this._currentLang = lang;
      console.log(`[LocalizationService] Language set to: ${lang}`);
    }
  }

  /**
   * Get a localized string.
   * @param {string} key - String key
   * @returns {string}
   */
  get(key) {
    return getString(key, this._currentLang);
  }

  /**
   * Get all strings for current language.
   * @returns {Object}
   */
  getAll() {
    return getStrings(this._currentLang);
  }

  /**
   * Check if initialized.
   * @returns {boolean}
   */
  get isInitialized() {
    return this._initialized;
  }
}

// Singleton instance
let _instance = null;

/**
 * Get or create the singleton LocalizationService instance.
 * @param {PlatformBridge} platformBridge
 * @returns {LocalizationService}
 */
export function getLocalizationService(platformBridge = null) {
  if (!_instance) {
    _instance = new LocalizationService(platformBridge);
  }
  return _instance;
}
