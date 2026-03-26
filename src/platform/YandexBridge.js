/**
 * YandexBridge
 * Integration with Yandex Games SDK.
 * Task 6.1: Yandex SDK Integration
 */

export class YandexBridge {
  constructor() {
    this._initialized = false;
    this._sdk = null;
    this._player = null;
    this._ysdk = null;

    // Callbacks
    this._onReadyCallback = null;
    this._onErrorCallback = null;
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
      if (this._onReadyCallback) {
        this._onReadyCallback(null);
      }
      return true;
    }

    try {
      // Load Yandex SDK script
      await this._loadSDK();

      // Initialize SDK
      this._ysdk = await window.YaGames.init();

      console.log('[YandexBridge] Yandex SDK initialized successfully');
      this._initialized = true;

      if (this._onReadyCallback) {
        this._onReadyCallback(this._ysdk);
      }

      return true;
    } catch (e) {
      console.error('[YandexBridge] Failed to initialize Yandex SDK:', e);

      if (this._onErrorCallback) {
        this._onErrorCallback(e);
      }

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
      script.onerror = (e) => reject(new Error('Failed to load Yandex SDK script'));
      document.head.appendChild(script);
    });
  }

  /**
   * Set callback for when SDK is ready.
   * @param {Function} callback
   */
  onReady(callback) {
    this._onReadyCallback = callback;
  }

  /**
   * Set callback for SDK errors.
   * @param {Function} callback
   */
  onError(callback) {
    this._onErrorCallback = callback;
  }

  /**
   * Initialize player.
   * @param {object} options - Options for player init
   * @returns {Promise<object|null>}
   */
  async initPlayer(options = { scopes: false }) {
    if (!this._ysdk) {
      console.log('[YandexBridge] SDK not initialized, using stub player');
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
   * Get player info.
   * @returns {object|null}
   */
  get player() {
    return this._player;
  }

  /**
   * Get player name.
   * @returns {string}
   */
  getPlayerName() {
    if (this._player && this._player.name) {
      return this._player.name;
    }
    return 'Player';
  }

  /**
   * Get player avatar URL.
   * @returns {string|null}
   */
  getPlayerAvatar() {
    if (this._player && this._player.photo) {
      return this._player.photo;
    }
    return null;
  }

  /**
   * Save player data.
   * @param {object} data - Data to save
   * @param {boolean} flush - Force flush to server
   * @returns {Promise<boolean>}
   */
  async saveData(data, flush = false) {
    if (!this._player) {
      console.log('[YandexBridge] No player, saving to localStorage');
      try {
        localStorage.setItem('yandex_game_data', JSON.stringify(data));
        return true;
      } catch (e) {
        console.error('[YandexBridge] Failed to save to localStorage:', e);
        return false;
      }
    }

    try {
      await this._player.setData(data, flush);
      console.log('[YandexBridge] Data saved');
      return true;
    } catch (e) {
      console.error('[YandexBridge] Failed to save data:', e);
      return false;
    }
  }

  /**
   * Load player data.
   * @returns {Promise<object|null>}
   */
  async loadData() {
    if (!this._player) {
      console.log('[YandexBridge] No player, loading from localStorage');
      try {
        const data = localStorage.getItem('yandex_game_data');
        return data ? JSON.parse(data) : null;
      } catch (e) {
        console.error('[YandexBridge] Failed to load from localStorage:', e);
        return null;
      }
    }

    try {
      const data = await this._player.getData();
      console.log('[YandexBridge] Data loaded');
      return data;
    } catch (e) {
      console.error('[YandexBridge] Failed to load data:', e);
      return null;
    }
  }

  /**
   * Show fullscreen ad.
   * @returns {Promise<boolean>}
   */
  async showFullscreenAd() {
    if (!this._ysdk) {
      console.log('[YandexBridge] SDK not available, skipping ad');
      return true;
    }

    try {
      await this._ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => console.log('[YandexBridge] Fullscreen ad opened'),
          onClose: (wasShown) => console.log('[YandexBridge] Fullscreen ad closed, shown:', wasShown),
          onError: (e) => console.error('[YandexBridge] Fullscreen ad error:', e)
        }
      });
      return true;
    } catch (e) {
      console.error('[YandexBridge] Failed to show fullscreen ad:', e);
      return false;
    }
  }

  /**
   * Show rewarded ad.
   * @returns {Promise<boolean>}
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
            console.log('[YandexBridge] Rewarded ad rewarded');
            resolve(true);
          },
          onClose: () => {
            console.log('[YandexBridge] Rewarded ad closed');
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
   * Show sticky banner (if supported).
   */
  async showStickyBanner() {
    if (!this._ysdk) {
      console.log('[YandexBridge] SDK not available, skipping banner');
      return;
    }

    try {
      await this._ysdk.adv.showBannerAdv();
      console.log('[YandexBridge] Banner ad shown');
    } catch (e) {
      console.error('[YandexBridge] Failed to show banner:', e);
    }
  }

  /**
   * Hide sticky banner.
   */
  async hideStickyBanner() {
    if (!this._ysdk) {
      return;
    }

    try {
      await this._ysdk.adv.hideBannerAdv();
      console.log('[YandexBridge] Banner ad hidden');
    } catch (e) {
      console.error('[YandexBridge] Failed to hide banner:', e);
    }
  }

  /**
   * Get current language.
   * @returns {string}
   */
  getLanguage() {
    if (this._ysdk && this._ysdk.environment && this._ysdk.environment.i18n) {
      return this._ysdk.environment.i18n.lang || 'ru';
    }
    return 'ru';
  }

  /**
   * Get device type.
   * @returns {string}
   */
  getDeviceType() {
    if (this._ysdk && this._ysdk.deviceInfo) {
      return this._ysdk.deviceInfo.type || 'desktop';
    }
    return 'desktop';
  }

  /**
   * Check if SDK is initialized.
   * @returns {boolean}
   */
  get isInitialized() {
    return this._initialized;
  }

  /**
   * Get raw SDK instance.
   * @returns {object|null}
   */
  get sdk() {
    return this._ysdk;
  }
}
