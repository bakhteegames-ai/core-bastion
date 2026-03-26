/**
 * PlatformBridge
 * Abstract interface for platform-specific functionality.
 * Provides a unified API for ads, storage, and platform info.
 *
 * Platform implementations (YandexBridge, EditorBridge) must implement all methods.
 */

/**
 * @typedef {Object} PlatformBridgeInterface
 * @property {Function} init - Initialize the platform SDK
 * @property {Function} showFullscreenAd - Show interstitial/fullscreen ad
 * @property {Function} showRewardedAd - Show rewarded video ad
 * @property {Function} getLanguage - Get current platform language
 * @property {Function} saveData - Save data to platform storage
 * @property {Function} loadData - Load data from platform storage
 * @property {Function} isInitialized - Check if platform is initialized
 */

/**
 * Base PlatformBridge class.
 * Subclasses must override all methods.
 */
export class PlatformBridge {
  constructor() {
    this._initialized = false;
  }

  /**
   * Initialize the platform SDK.
   * @returns {Promise<boolean>}
   */
  async init() {
    throw new Error('PlatformBridge.init() must be implemented by subclass');
  }

  /**
   * Show fullscreen/interstitial ad.
   * @returns {Promise<boolean>} - true if ad was shown or skipped gracefully
   */
  async showFullscreenAd() {
    throw new Error('PlatformBridge.showFullscreenAd() must be implemented by subclass');
  }

  /**
   * Show rewarded video ad.
   * @returns {Promise<boolean>} - true if reward was granted
   */
  async showRewardedAd() {
    throw new Error('PlatformBridge.showRewardedAd() must be implemented by subclass');
  }

  /**
   * Get current platform language.
   * @returns {string} - Language code (e.g., 'en', 'ru')
   */
  getLanguage() {
    throw new Error('PlatformBridge.getLanguage() must be implemented by subclass');
  }

  /**
   * Save data to platform storage.
   * @param {Object} data - Data to save
   * @returns {Promise<boolean>}
   */
  async saveData(data) {
    throw new Error('PlatformBridge.saveData() must be implemented by subclass');
  }

  /**
   * Load data from platform storage.
   * @returns {Promise<Object|null>}
   */
  async loadData() {
    throw new Error('PlatformBridge.loadData() must be implemented by subclass');
  }

  /**
   * Check if platform is initialized.
   * @returns {boolean}
   */
  get isInitialized() {
    return this._initialized;
  }
}

/**
 * Create the appropriate platform bridge based on environment.
 * @returns {PlatformBridge}
 */
export async function createPlatformBridge() {
  // Check for Yandex environment
  const isYandex = _detectYandexEnvironment();

  if (isYandex) {
    console.log('[PlatformBridge] Detected Yandex environment');
    const { YandexBridge } = await import('./YandexBridge.js');
    return new YandexBridge();
  }

  // Default to EditorBridge (stub/local development)
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
