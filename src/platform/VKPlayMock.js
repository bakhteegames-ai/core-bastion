/**
 * VK Play Mock
 * For local testing of VK Play API
 */

export class VKPlayMock {
  constructor() {
    this.isInitialized = false;
    this.player = null;
    this.coins = 0;
    this.purchases = [];
    this.adDelay = 1000;
    this.simulateFailures = false;
    this.storage = {};
  }

  async init() {
    console.log('[VKPlayMock] Initialized');
    this.isInitialized = true;
    this.player = {
      id: 'mock_player_123',
      name: 'Test Player',
      avatar: null
    };
    
    // Load stored data
    this._loadFromStorage();
    
    return true;
  }

  _loadFromStorage() {
    try {
      const data = localStorage.getItem('vkplay_mock_data');
      if (data) {
        const parsed = JSON.parse(data);
        this.coins = parsed.coins || 0;
        this.purchases = parsed.purchases || [];
        this.storage = parsed.storage || {};
      }
    } catch (e) {
      console.warn('[VKPlayMock] Could not load stored data');
    }
  }

  _saveToStorage() {
    try {
      localStorage.setItem('vkplay_mock_data', JSON.stringify({
        coins: this.coins,
        purchases: this.purchases,
        storage: this.storage
      }));
    } catch (e) {
      console.warn('[VKPlayMock] Could not save data');
    }
  }

  // ==========================================
  // BILLING
  // ==========================================

  async initPayments() {
    console.log('[VKPlayMock] Payments initialized');
    return true;
  }

  async purchase(options) {
    if (this.simulateFailures) {
      throw new Error('Simulated purchase failure');
    }

    console.log(`[VKPlayMock] Purchasing: ${options.id}`);
    
    // Simulate delay
    await new Promise(r => setTimeout(r, 500));
    
    const orderId = `mock_order_${Date.now()}`;
    this.purchases.push({
      orderId,
      productId: options.id,
      purchaseTime: Date.now()
    });
    
    // Add coins for testing
    if (options.id.includes('gold')) {
      const amounts = { gold_s: 250, gold_m: 1000, gold_l: 2500 };
      this.coins += amounts[options.id] || 100;
    }
    
    this._saveToStorage();
    
    return {
      purchaseToken: orderId,
      productID: options.id
    };
  }

  async getPurchases() {
    return this.purchases;
  }

  async consumePurchase(token) {
    console.log(`[VKPlayMock] Consuming: ${token}`);
    this.purchases = this.purchases.filter(p => p.orderId !== token);
    this._saveToStorage();
    return true;
  }

  // ==========================================
  // ADVERTISING
  // ==========================================

  async showRewarded(placement) {
    console.log(`[VKPlayMock] Showing rewarded ad: ${placement}`);
    
    await new Promise(r => setTimeout(r, this.adDelay));
    
    if (this.simulateFailures) {
      return { rewarded: false, shown: true };
    }
    
    // Give bonus coins for watching
    this.coins += 10;
    this._saveToStorage();
    
    return { rewarded: true, shown: true };
  }

  async showInterstitial(placement) {
    console.log(`[VKPlayMock] Showing interstitial ad: ${placement}`);
    
    await new Promise(r => setTimeout(r, this.adDelay));
    
    return { shown: !this.simulateFailures };
  }

  // ==========================================
  // STORAGE
  // ==========================================

  async saveData(key, data) {
    this.storage[key] = data;
    this._saveToStorage();
    return true;
  }

  async loadData(key) {
    return this.storage[key] || null;
  }

  // ==========================================
  // PLAYER
  // ==========================================

  async getPlayer() {
    return this.player;
  }

  async isAuthenticated() {
    return true;
  }

  getLanguage() {
    return 'ru';
  }

  async ready() {
    console.log('[VKPlayMock] Ready');
  }

  isPlatform() {
    return true;
  }

  // ==========================================
  // MOCK UTILITIES
  // ==========================================

  getCoins() {
    return this.coins;
  }

  spendCoins(amount) {
    if (this.coins >= amount) {
      this.coins -= amount;
      this._saveToStorage();
      return true;
    }
    return false;
  }

  setAdDelay(ms) {
    this.adDelay = ms;
  }

  setSimulateFailures(value) {
    this.simulateFailures = value;
  }

  reset() {
    this.coins = 0;
    this.purchases = [];
    this.storage = {};
    localStorage.removeItem('vkplay_mock_data');
    console.log('[VKPlayMock] Reset complete');
  }
}
