/**
 * EditorBridge
 * Platform bridge for local development / editor environment.
 * Implements exact PlatformBridge API with stub behavior.
 */

import { PlatformBridge } from './PlatformBridgeBase.js';

export class EditorBridge extends PlatformBridge {
  constructor() {
    super();
    this._storageKey = 'core_bastion_mvp';
    this._lang = 'en';
  }

  /**
   * Initialize the platform (no-op for editor).
   * @returns {Promise<void>}
   */
  async init() {
    console.log('[EditorBridge] Initialized (local development mode)');
    this._initialized = true;
  }

  /**
   * Signal game ready (stub - immediate resolve).
   * @returns {Promise<void>}
   */
  async ready() {
    console.log('[EditorBridge] ready() called - game ready for interaction');
  }

  /**
   * Show interstitial ad (stub - always succeeds without showing).
   * @param {string} context
   * @returns {Promise<{ shown: boolean; reason?: string }>}
   */
  async showInterstitial(context) {
    console.log(`[EditorBridge] showInterstitial("${context}") - stub, skipping ad`);
    return { shown: false, reason: 'local_development' };
  }

  /**
   * Show rewarded ad (stub - simulates reward granted).
   * @param {string} rewardType
   * @returns {Promise<{ rewarded: boolean; shown: boolean; reason?: string }>}
   */
  async showRewarded(rewardType) {
    console.log(`[EditorBridge] showRewarded("${rewardType}") - stub, simulating reward`);
    return { rewarded: true, shown: false, reason: 'local_development' };
  }

  /**
   * Save progress to localStorage.
   * @param {{ bestWave: number }} payload
   * @returns {Promise<{ ok: boolean; reason?: string }>}
   */
  async saveProgress(payload) {
    try {
      const data = {
        bestWave: typeof payload?.bestWave === 'number' ? payload.bestWave : 0,
        data: payload?.data && typeof payload.data === 'object' ? payload.data : {}
      };
      localStorage.setItem(this._storageKey, JSON.stringify(data));
      console.log(`[EditorBridge] saveProgress({ bestWave: ${data.bestWave} })`);
      return { ok: true };
    } catch (e) {
      console.error('[EditorBridge] Failed to save progress:', e);
      return { ok: false, reason: e.message };
    }
  }

  /**
   * Load progress from localStorage.
   * @returns {Promise<{ ok: boolean; data: { bestWave: number }; reason?: string }>}
   */
  async loadProgress() {
    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        const bestWave = typeof data.bestWave === 'number' ? data.bestWave : 0;
        const extraData = data?.data && typeof data.data === 'object' ? data.data : {};
        console.log(`[EditorBridge] loadProgress() -> bestWave: ${bestWave}`);
        return { ok: true, data: { bestWave, data: extraData } };
      }
      return { ok: true, data: { bestWave: 0, data: {} } };
    } catch (e) {
      console.error('[EditorBridge] Failed to load progress:', e);
      return { ok: false, data: { bestWave: 0, data: {} }, reason: e.message };
    }
  }

  /**
   * Get current language (defaults to en).
   * @returns {string}
   */
  getLanguage() {
    // Check localStorage or browser language
    const savedLang = localStorage.getItem('core_bastion_lang');
    if (savedLang === 'en' || savedLang === 'ru') {
      return savedLang;
    }
    
    // Detect from browser
    const browserLang = (navigator.language || 'en').split('-')[0].toLowerCase();
    return browserLang === 'ru' ? 'ru' : 'en';
  }
}
