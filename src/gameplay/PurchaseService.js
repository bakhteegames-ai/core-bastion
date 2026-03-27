/**
 * Purchase Service
 * Handles in-app purchases for Yandex Games and VK Play
 */

import { getProduct } from '../data/products.js';

export const PurchaseEvents = {
  PURCHASE_SUCCESS: 'purchase_success',
  PURCHASE_ERROR: 'purchase_error',
  PURCHASE_CANCEL: 'purchase_cancel'
};

export class PurchaseService {
  constructor(platformBridge, economyService) {
    this.platformBridge = platformBridge;
    this.economyService = economyService;
    this.ownedProducts = [];
    this.noAds = false;
    this.listeners = {};
    this.paymentsAvailable = false;
  }

  /**
   * Initialize purchase service
   */
  async initialize() {
    try {
      // Check if payments are available
      if (this.platformBridge.initPayments) {
        this.paymentsAvailable = await this.platformBridge.initPayments();
      }
      
      // Load existing purchases
      if (this.platformBridge.getPurchases) {
        const purchases = await this.platformBridge.getPurchases();
        this.processPurchases(purchases || []);
      }
      
      console.log(`[PurchaseService] Initialized. Payments available: ${this.paymentsAvailable}`);
    } catch (error) {
      console.error('[PurchaseService] Initialization error:', error);
    }
  }

  /**
   * Process loaded purchases
   */
  processPurchases(purchases) {
    for (const purchase of purchases) {
      if (purchase.productID === 'no_ads') {
        this.noAds = true;
        this.ownedProducts.push(purchase.productID);
      }
    }
    console.log(`[PurchaseService] Processed ${purchases.length} purchases. NoAds: ${this.noAds}`);
  }

  /**
   * Purchase a product
   */
  async purchaseProduct(productId) {
    const product = getProduct(productId);
    if (!product) {
      console.error(`[PurchaseService] Product not found: ${productId}`);
      return { status: 'error', error: 'Product not found' };
    }

    if (!this.paymentsAvailable) {
      console.warn('[PurchaseService] Payments not available');
      // Simulate purchase for testing
      return this.simulatePurchase(product);
    }

    try {
      const result = await this.platformBridge.purchase({
        id: productId,
        developerPayload: JSON.stringify({ timestamp: Date.now() })
      });

      if (result && result.purchaseToken) {
        // Apply rewards
        this.applyRewards(product.rewards);
        
        // Consume if consumable
        if (product.type === 'consumable') {
          await this.platformBridge.consumePurchase(result.purchaseToken);
        } else {
          this.ownedProducts.push(productId);
        }
        
        this.emit(PurchaseEvents.PURCHASE_SUCCESS, { product, purchase: result });
        return { status: 'success', purchase: result };
      }
      
      return { status: 'cancelled' };
    } catch (error) {
      console.error('[PurchaseService] Purchase error:', error);
      this.emit(PurchaseEvents.PURCHASE_ERROR, { product, error });
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Simulate purchase for testing
   */
  simulatePurchase(product) {
    console.log(`[PurchaseService] Simulating purchase: ${product.id}`);
    
    // Store in localStorage for persistence
    const simulatedPurchases = JSON.parse(localStorage.getItem('core_bastion_purchases') || '[]');
    simulatedPurchases.push({
      productID: product.id,
      purchaseTime: Date.now(),
      simulated: true
    });
    localStorage.setItem('core_bastion_purchases', JSON.stringify(simulatedPurchases));
    
    // Apply rewards
    this.applyRewards(product.rewards);
    
    if (product.type === 'non-consumable') {
      this.ownedProducts.push(product.id);
      if (product.id === 'no_ads') {
        this.noAds = true;
      }
    }
    
    this.emit(PurchaseEvents.PURCHASE_SUCCESS, { product, simulated: true });
    return { status: 'success', simulated: true };
  }

  /**
   * Apply purchase rewards
   */
  applyRewards(rewards) {
    if (!rewards) return;
    
    if (rewards.gold && this.economyService) {
      this.economyService.addGold(rewards.gold);
      console.log(`[PurchaseService] Applied ${rewards.gold} gold`);
    }
    
    if (rewards.noAds) {
      this.noAds = true;
      console.log('[PurchaseService] NoAds activated');
    }
    
    if (rewards.abilities) {
      const current = parseInt(localStorage.getItem('core_bastion_ability_rewards') || '0');
      localStorage.setItem('core_bastion_ability_rewards', (current + rewards.abilities).toString());
      console.log(`[PurchaseService] Added ${rewards.abilities} ability uses`);
    }
  }

  /**
   * Check if player has no ads
   */
  hasNoAds() {
    return this.noAds;
  }

  /**
   * Check if product is owned
   */
  isOwned(productId) {
    return this.ownedProducts.includes(productId);
  }

  /**
   * Check if payments are available
   */
  isPaymentsAvailable() {
    return this.paymentsAvailable;
  }

  /**
   * Get pending ability rewards
   */
  getPendingAbilityRewards() {
    return parseInt(localStorage.getItem('core_bastion_ability_rewards') || '0');
  }

  /**
   * Use one ability reward
   */
  useAbilityReward() {
    const current = this.getPendingAbilityRewards();
    if (current > 0) {
      localStorage.setItem('core_bastion_ability_rewards', (current - 1).toString());
      return true;
    }
    return false;
  }

  /**
   * Reset for testing
   */
  resetForTesting() {
    localStorage.removeItem('core_bastion_purchases');
    localStorage.removeItem('core_bastion_ability_rewards');
    this.ownedProducts = [];
    this.noAds = false;
    console.log('[PurchaseService] Reset for testing');
  }

  /**
   * Grant product for testing
   */
  grantProductForTesting(productId) {
    const product = getProduct(productId);
    if (product) {
      this.applyRewards(product.rewards);
      if (product.type === 'non-consumable') {
        this.ownedProducts.push(productId);
        if (productId === 'no_ads') this.noAds = true;
      }
    }
  }

  /**
   * Event handling
   */
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}
