/**
 * YandexBridge
 * Integration with Yandex Games SDK.
 * Implements PlatformBridge interface for Yandex Games platform.
 */

import { PlatformBridge } from './PlatformBridge.js';

export class YandexBridge extends PlatformBridge {
  constructor() {
    super();
    this._sdk = null;
    this._player = null;
    this._ysdk = null;
    this._storageKey = 'core_bastion_mvp';
  }

  /**
   * Check if running inside Yandex Games environment.
   * @returns {boolean}
   */
  static isYandexEnvironment() {
    try {
      return window.location.hostname.includes('yandex') ||
             window.location.hostname.includes('yandexgames') ||
             window.parent !== window;
    } catch (e) {
      return false;
    }
  }

  /**
   * Initialize Yandex SDK.
   * @returns {Promise<boolean>}
   */
  async init() {
    if (this._initialized) {
      console.log('[YandexBridge] Already initialized');
      return true;
    }

    // Check if in Yandex environment
    if (!YandexBridge.isYandexEnvironment()) {
      console.log('[YandexBridge] Not in Yandex environment, using stub mode');
      this._initialized = true;
      return true;
    }

    try {
      // Load Yandex SDK script
      await this._loadSDK();

      // Initialize SDK
      this._ysdk = await window.YaGames.init();

      console.log('[YandexBridge] Yandex SDK initialized successfully');
      this._initialized = true;

      return true;
    } catch (e) {
      console.error('[YandexBridge] Failed to initialize Yandex SDK:', e);
      return false;
    }
  }

  /**
   * Load Yandex SDK script.
   * @returns {Promise<void>}
   */
  _loadSDK() {
    return new Promise((resolve, reject) => {
      if (window.YaGames) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://yandex.ru/games/sdk/v2';
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Yandex SDK script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize player (optional, for extended features).
   * @param {Object} options - Options for player init
   * @returns {Promise<Object|null>}
   */
  async initPlayer(options = { scopes: false }) {
    if (!this._ysdk) {
      console.log('[YandexBridge] SDK not initialized, cannot init player');
      return null;
    }

    try {
      this._player = await this._ysdk.getPlayer(options);
      console.log('[YandexBridge] Player initialized');
      return this._player;
    } catch (e) {
      console.error('[YandexBridge] Failed to initialize player:', e);
      return null;
    }
  }

  /**
   * Show fullscreen/interstitial ad.
   * @returns {Promise<boolean>}
   */
  async showFullscreenAd() {
    if (!this._ysdk) {
      console.log('[YandexBridge] SDK not available, skipping fullscreen ad');
      return true;
    }

    return new Promise((resolve) => {
      this._ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => console.log('[YandexBridge] Fullscreen ad opened'),
          onClose: (wasShown) => {
            console.log('[YandexBridge] Fullscreen ad closed, shown:', wasShown);
            resolve(true);
          },
          onError: (e) => {
            console.error('[YandexBridge] Fullscreen ad error:', e);
            resolve(true); // Resolve true to not block game flow
          }
        }
      });
    });
  }

  /**
   * Show rewarded video ad.
   * @returns {Promise<boolean>} - true if reward was granted
   */
  async showRewardedAd() {
    if (!this._ysdk) {
      console.log('[YandexBridge] SDK not available, simulating rewarded ad');
      return true;
    }

    return new Promise((resolve) => {
      this._ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => console.log('[YandexBridge] Rewarded ad opened'),
          onRewarded: () => {
            console.log('[YandexBridge] Rewarded ad granted');
            resolve(true);
          },
          onClose: () => {
            console.log('[YandexBridge] Rewarded ad closed without reward');
            resolve(false);
          },
          onError: (e) => {
            console.error('[YandexBridge] Rewarded ad error:', e);
            resolve(false);
          }
        }
      });
    });
  }

  /**
   * Get current platform language.
   * @returns {string}
   */
  getLanguage() {
    if (this._ysdk && this._ysdk.environment && this._ysdk.environment.i18n) {
      return this._ysdk.environment.i18n.lang || 'ru';
    }
    return 'ru';
  }

  /**
   * Save data to platform storage.
   * Falls back to localStorage if player is not initialized.
   * @param {Object} data - Data to save
   * @returns {Promise<boolean>}
   */
  async saveData(data) {
    // Try player data first (Yandex cloud storage)
    if (this._player) {
      try {
        await this._player.setData(data, false);
        console.log('[YandexBridge] Data saved to player storage');
        return true;
      } catch (e) {
        console.error('[YandexBridge] Failed to save to player storage:', e);
      }
    }

    // Fallback to localStorage
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(data));
      console.log('[YandexBridge] Data saved to localStorage');
      return true;
    } catch (e) {
      console.error('[YandexBridge] Failed to save to localStorage:', e);
      return false;
    }
  }

  /**
   * Load data from platform storage.
   * Falls back to localStorage if player is not initialized.
   * @returns {Promise<Object|null>}
   */
  async loadData() {
    // Try player data first (Yandex cloud storage)
    if (this._player) {
      try {
        const data = await this._player.getData();
        console.log('[YandexBridge] Data loaded from player storage');
        return data;
      } catch (e) {
        console.error('[YandexBridge] Failed to load from player storage:', e);
      }
    }

    // Fallback to localStorage
    try {
      const data = localStorage.getItem(this._storageKey);
      if (data) {
        console.log('[YandexBridge] Data loaded from localStorage');
        return JSON.parse(data);
      }
      return null;
    } catch (e) {
      console.error('[YandexBridge] Failed to load from localStorage:', e);
      return null;
    }
  }

  /**
   * Get device type from SDK.
   * @returns {string}
   */
  getDeviceType() {
    if (this._ysdk && this._ysdk.deviceInfo) {
      return this._ysdk.deviceInfo.type || 'desktop';
    }
    return 'desktop';
  }

  /**
   * Get player name (if available).
   * @returns {string}
   */
  getPlayerName() {
    if (this._player && this._player.name) {
      return this._player.name;
    }
    return 'Player';
  }

  /**
   * Get player avatar URL (if available).
   * @returns {string|null}
   */
  getPlayerAvatar() {
    if (this._player && this._player.photo) {
      return this._player.photo;
    }
    return null;
  }

  /**
   * Get raw SDK instance.
   * @returns {Object|null}
   */
  get sdk() {
    return this._ysdk;
  }

  /**
   * Get player object.
   * @returns {Object|null}
   */
  get player() {
    return this._player;
  }
}
