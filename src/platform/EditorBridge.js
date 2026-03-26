/**
 * EditorBridge
 * Platform bridge for local development / editor environment.
 * Implements PlatformBridge interface with stub behavior.
 */

import { PlatformBridge } from './PlatformBridge.js';

export class EditorBridge extends PlatformBridge {
  constructor() {
    super();
    this._storageKey = 'core_bastion_mvp';
  }

  /**
   * Initialize the platform (no-op for editor).
   * @returns {Promise<boolean>}
   */
  async init() {
    console.log('[EditorBridge] Initialized (local development mode)');
    this._initialized = true;
    return true;
  }

  /**
   * Show fullscreen ad (stub - always succeeds).
   * @returns {Promise<boolean>}
   */
  async showFullscreenAd() {
    console.log('[EditorBridge] showFullscreenAd() - stub, skipping ad');
    return true;
  }

  /**
   * Show rewarded ad (stub - simulates reward granted).
   * @returns {Promise<boolean>}
   */
  async showRewardedAd() {
    console.log('[EditorBridge] showRewardedAd() - stub, simulating reward');
    return true;
  }

  /**
   * Get current language (defaults to Russian for Yandex target).
   * @returns {string}
   */
  getLanguage() {
    // Check localStorage for saved language preference
    const savedLang = localStorage.getItem('core_bastion_lang');
    return savedLang || 'ru';
  }

  /**
   * Save data to localStorage.
   * @param {Object} data - Data to save
   * @returns {Promise<boolean>}
   */
  async saveData(data) {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(data));
      console.log('[EditorBridge] Data saved to localStorage');
      return true;
    } catch (e) {
      console.error('[EditorBridge] Failed to save data:', e);
      return false;
    }
  }

  /**
   * Load data from localStorage.
   * @returns {Promise<Object|null>}
   */
  async loadData() {
    try {
      const data = localStorage.getItem(this._storageKey);
      if (data) {
        console.log('[EditorBridge] Data loaded from localStorage');
        return JSON.parse(data);
      }
      return null;
    } catch (e) {
      console.error('[EditorBridge] Failed to load data:', e);
      return null;
    }
  }
}
