/**
 * PlatformBridge
 * Abstract interface for platform-specific functionality.
 * Exact API per docs specification.
 */

/**
 * Base PlatformBridge class.
 * Subclasses must implement all methods.
 */
export class PlatformBridge {
  constructor() {
    this._initialized = false;
  }

  /**
   * Initialize the platform SDK.
   * @returns {Promise<void>}
   */
  async init() {
    throw new Error('PlatformBridge.init() must be implemented by subclass');
  }

  /**
   * Signal that the game is ready for interaction.
   * Calls platform loading API to dismiss loading screen.
   * @returns {Promise<void>}
   */
  async ready() {
    throw new Error('PlatformBridge.ready() must be implemented by subclass');
  }

  /**
   * Show interstitial/fullscreen ad.
   * @param {string} context - Context for ad (e.g., 'restart', 'menu')
   * @returns {Promise<{ shown: boolean; reason?: string }>}
   */
  async showInterstitial(context) {
    throw new Error('PlatformBridge.showInterstitial() must be implemented by subclass');
  }

  /**
   * Show rewarded video ad.
   * @param {string} rewardType - Type of reward (e.g., 'continue')
   * @returns {Promise<{ rewarded: boolean; shown: boolean; reason?: string }>}
   */
  async showRewarded(rewardType) {
    throw new Error('PlatformBridge.showRewarded() must be implemented by subclass');
  }

  /**
   * Save progress to platform storage.
   * @param {{ bestWave: number }} payload
   * @returns {Promise<{ ok: boolean; reason?: string }>}
   */
  async saveProgress(payload) {
    throw new Error('PlatformBridge.saveProgress() must be implemented by subclass');
  }

  /**
   * Load progress from platform storage.
   * @returns {Promise<{ ok: boolean; data: { bestWave: number }; reason?: string }>}
   */
  async loadProgress() {
    throw new Error('PlatformBridge.loadProgress() must be implemented by subclass');
  }

  /**
   * Check if platform is initialized.
   * @returns {boolean}
   */
  get isInitialized() {
    return this._initialized;
  }

  /**
   * Get current language (normalized to 'en' or 'ru').
   * @returns {string}
   */
  getLanguage() {
    return 'en';
  }
}

/**
 * Create the appropriate platform bridge based on environment.
 * @returns {Promise<PlatformBridge>}
 */
export async function createPlatformBridge() {
  const isYandex = _detectYandexEnvironment();

  if (isYandex) {
    console.log('[PlatformBridge] Detected Yandex environment');
    const { YandexBridge } = await import('./YandexBridge.js');
    return new YandexBridge();
  }

  console.log('[PlatformBridge] Using EditorBridge (local development)');
  const { EditorBridge } = await import('./EditorBridge.js');
  return new EditorBridge();
}

/**
 * Detect if running in Yandex Games environment.
 * @returns {boolean}
 */
function _detectYandexEnvironment() {
  try {
    return window.location.hostname.includes('yandex') ||
           window.location.hostname.includes('yandexgames') ||
           window.parent !== window;
  } catch (e) {
    return false;
  }
}
