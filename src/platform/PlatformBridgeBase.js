/**
 * Platform Bridge Base Class
 * Abstract interface for platform-specific implementations
 */

export class PlatformBridge {
  constructor() {
    this._initialized = false;
  }

  // ==========================================
  // LIFECYCLE
  // ==========================================

  async init() {
    this._initialized = true;
  }

  async ready() {
    console.log('[PlatformBridge] ready()');
  }

  isPlatform() {
    return false;
  }

  // ==========================================
  // BILLING (Override in subclasses)
  // ==========================================

  async initPayments() {
    console.log('[PlatformBridge] initPayments() - not implemented');
    return false;
  }

  async getProducts(productIds) {
    console.log('[PlatformBridge] getProducts() - not implemented');
    return [];
  }

  async getPurchases() {
    console.log('[PlatformBridge] getPurchases() - not implemented');
    return [];
  }

  async purchase(options) {
    console.log('[PlatformBridge] purchase() - not implemented');
    return null;
  }

  async consumePurchase(purchaseToken) {
    console.log('[PlatformBridge] consumePurchase() - not implemented');
    return false;
  }

  // ==========================================
  // ADVERTISING
  // ==========================================

  async showInterstitial(context) {
    console.log(`[PlatformBridge] showInterstitial("${context}") - not implemented`);
    return { shown: false };
  }

  async showRewarded(rewardType) {
    console.log(`[PlatformBridge] showRewarded("${rewardType}") - not implemented`);
    return { rewarded: false, shown: false };
  }

  // ==========================================
  // STORAGE
  // ==========================================

  async saveProgress(payload) {
    console.log('[PlatformBridge] saveProgress()', payload);
    return { ok: true };
  }

  async loadProgress() {
    return { ok: true, data: { bestWave: 0 } };
  }

  // ==========================================
  // PLAYER
  // ==========================================

  async getPlayer() {
    return null;
  }

  async isAuthenticated() {
    return false;
  }

  getLanguage() {
    return 'en';
  }
}
