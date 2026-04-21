/**
 * YandexBridge
 * Integration with Yandex Games SDK.
 * Implements exact PlatformBridge API for Yandex Games platform.
 */

import { PlatformBridge } from './PlatformBridgeBase.js';

export class YandexBridge extends PlatformBridge {
  constructor() {
    super();
    this._ysdk = null;
    this._player = null;
    this._storageKey = 'core_bastion_mvp';
    this._leaderboardsReady = false;
  }

  get isYandex() {
    return true;
  }

  /**
   * Check if running inside Yandex Games environment.
   * @returns {boolean}
   */
  static isYandexEnvironment() {
    try {
      const hostname = window.location.hostname;
      const isLocal = hostname === 'localhost' || 
                      hostname === '127.0.0.1' || 
                      hostname.startsWith('192.168.') ||
                      hostname.startsWith('10.') ||
                      hostname.includes('ngrok.io') ||
                      hostname.endsWith('.local');
      
      const hasYaGames = typeof window.YaGames !== 'undefined';
      return hasYaGames && !isLocal;
    } catch (e) {
      return false;
    }
  }

  async init() {
    if (this._initialized) {
      return;
    }

    if (!YandexBridge.isYandexEnvironment()) {
      console.log('[YandexBridge] Not in Yandex environment');
      this._initialized = true;
      return;
    }

    try {
      await this._loadSDK();
      this._ysdk = await window.YaGames.init();
      console.log('[YandexBridge] Yandex SDK initialized');
      this._initialized = true;
    } catch (e) {
      console.error('[YandexBridge] Failed to initialize:', e);
      throw e;
    }
  }

  async ready() {
    if (this._ysdk && this._ysdk.features && this._ysdk.features.LoadingAPI) {
      try {
        this._ysdk.features.LoadingAPI.ready();
        console.log('[YandexBridge] LoadingAPI.ready() called');
      } catch (e) {
        console.warn('[YandexBridge] LoadingAPI.ready() failed:', e);
      }
    } else {
      console.log('[YandexBridge] ready() - no LoadingAPI available');
    }
  }

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

  async _initPlayer() {
    if (this._player) return;

    if (!this._ysdk) {
      console.log('[YandexBridge] No SDK, cannot init player');
      return;
    }

    try {
      this._player = await this._ysdk.getPlayer({ scopes: false });
      console.log('[YandexBridge] Player initialized');
    } catch (e) {
      console.warn('[YandexBridge] Player init failed:', e);
    }
  }

  async showInterstitial(context) {
    if (!this._ysdk) {
      console.log(`[YandexBridge] showInterstitial("${context}") - no SDK`);
      return { shown: false, reason: 'no_sdk' };
    }

    return new Promise((resolve) => {
      this._ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => console.log('[YandexBridge] Interstitial opened'),
          onClose: (wasShown) => {
            console.log(`[YandexBridge] Interstitial closed, shown: ${wasShown}`);
            resolve({ shown: wasShown });
          },
          onError: (e) => {
            console.error('[YandexBridge] Interstitial error:', e);
            resolve({ shown: false, reason: String(e) });
          }
        }
      });
    });
  }

  async showRewarded(rewardType) {
    if (!this._ysdk) {
      console.log(`[YandexBridge] showRewarded("${rewardType}") - no SDK`);
      return { rewarded: false, shown: false, reason: 'no_sdk' };
    }

    return new Promise((resolve) => {
      let rewarded = false;

      this._ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: () => console.log('[YandexBridge] Rewarded ad opened'),
          onRewarded: () => {
            rewarded = true;
            console.log('[YandexBridge] Rewarded ad granted');
          },
          onClose: () => {
            console.log(`[YandexBridge] Rewarded ad closed, rewarded: ${rewarded}`);
            resolve({ rewarded, shown: true });
          },
          onError: (e) => {
            console.error('[YandexBridge] Rewarded ad error:', e);
            resolve({ rewarded: false, shown: false, reason: String(e) });
          }
        }
      });
    });
  }

  async saveProgress(payload) {
    const data = {
      bestWave: typeof payload?.bestWave === 'number' ? payload.bestWave : 0,
      data: payload?.data && typeof payload.data === 'object' ? payload.data : {}
    };

    await this._initPlayer();

    if (this._player) {
      try {
        await this._player.setData(data, false);
        console.log(`[YandexBridge] saveProgress({ bestWave: ${data.bestWave} }) to cloud`);
        return { ok: true };
      } catch (e) {
        console.warn('[YandexBridge] Cloud save failed, trying localStorage:', e);
      }
    }

    try {
      localStorage.setItem(this._storageKey, JSON.stringify(data));
      console.log(`[YandexBridge] saveProgress({ bestWave: ${data.bestWave} }) to localStorage`);
      return { ok: true };
    } catch (e) {
      console.error('[YandexBridge] saveProgress failed:', e);
      return { ok: false, reason: e.message };
    }
  }

  async loadProgress() {
    await this._initPlayer();

    if (this._player) {
      try {
        const data = await this._player.getData();
        if (data && typeof data.bestWave === 'number') {
          console.log(`[YandexBridge] loadProgress() from cloud: bestWave=${data.bestWave}`);
          return { ok: true, data: { bestWave: data.bestWave, data: data.data || {} } };
        }
      } catch (e) {
        console.warn('[YandexBridge] Cloud load failed, trying localStorage:', e);
      }
    }

    try {
      const saved = localStorage.getItem(this._storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        const bestWave = typeof data.bestWave === 'number' ? data.bestWave : 0;
        console.log(`[YandexBridge] loadProgress() from localStorage: bestWave=${bestWave}`);
        return { ok: true, data: { bestWave, data: data.data || {} } };
      }
      return { ok: true, data: { bestWave: 0, data: {} } };
    } catch (e) {
      console.error('[YandexBridge] loadProgress failed:', e);
      return { ok: false, data: { bestWave: 0, data: {} }, reason: e.message };
    }
  }

  getLanguage() {
    if (this._ysdk && this._ysdk.environment && this._ysdk.environment.i18n) {
      const lang = this._ysdk.environment.i18n.lang || 'en';
      return lang === 'ru' ? 'ru' : 'en';
    }
    return 'en';
  }

  get sdk() {
    return this._ysdk;
  }

  async initPayments() {
    if (!this._ysdk) {
      console.log('[YandexBridge] initPayments() - no SDK');
      return false;
    }

    try {
      if (this._ysdk.payments) {
        console.log('[YandexBridge] Payments initialized');
        return true;
      }
    } catch (e) {
      console.warn('[YandexBridge] Payments init failed:', e);
    }
    return false;
  }

  async getProducts(productIds) {
    if (!this._ysdk || !this._ysdk.payments) {
      return [];
    }

    try {
      const products = await this._ysdk.payments.getCatalog();
      return products || [];
    } catch (e) {
      console.error('[YandexBridge] getProducts error:', e);
      return [];
    }
  }

  async getPurchases() {
    if (!this._ysdk || !this._ysdk.payments) {
      return [];
    }

    try {
      const purchases = await this._ysdk.payments.getPurchases();
      return purchases || [];
    } catch (e) {
      console.error('[YandexBridge] getPurchases error:', e);
      return [];
    }
  }

  async purchase(options) {
    if (!this._ysdk || !this._ysdk.payments) {
      console.log('[YandexBridge] purchase() - no payments');
      return null;
    }

    try {
      const result = await this._ysdk.payments.purchase(options);
      console.log('[YandexBridge] purchase result:', result);
      return result;
    } catch (e) {
      console.error('[YandexBridge] purchase error:', e);
      return null;
    }
  }

  async consumePurchase(purchaseToken) {
    if (!this._ysdk || !this._ysdk.payments) {
      return false;
    }

    try {
      await this._ysdk.payments.consumePurchase(purchaseToken);
      console.log('[YandexBridge] Purchase consumed:', purchaseToken);
      return true;
    } catch (e) {
      console.error('[YandexBridge] consumePurchase error:', e);
      return false;
    }
  }

  async initLeaderboard() {
    this._leaderboardsReady = Boolean(this._ysdk?.leaderboard);
    return this._leaderboardsReady;
  }

  async submitLeaderboardScore(_mode, _score) {
    return false;
  }

  async getLeaderboardEntries(_mode, _count = 10) {
    return [];
  }

  async getPlayerScore(_mode) {
    return 0;
  }
}
