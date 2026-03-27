/**
 * IAP Products Definition
 * In-app purchase items for Yandex Games and VK Play
 */

export const IAP_PRODUCTS = {
  STARTER_PACK: {
    id: 'starter_pack',
    name: 'Starter Pack',
    nameRu: 'Стартовый набор',
    price: 99,
    currency: 'RUB',
    type: 'consumable',
    rewards: {
      gold: 500,
      abilities: 3
    },
    description: '500 gold + 3 ability uses',
    descriptionRu: '500 золота + 3 использования способностей'
  },
  NO_ADS: {
    id: 'no_ads',
    name: 'Remove Ads',
    nameRu: 'Убрать рекламу',
    price: 299,
    currency: 'RUB',
    type: 'non-consumable',
    rewards: {
      noAds: true
    },
    description: 'Disable interstitial ads',
    descriptionRu: 'Отключить межстраничную рекламу'
  },
  GOLD_S: {
    id: 'gold_s',
    name: '250 Gold',
    nameRu: '250 золота',
    price: 49,
    currency: 'RUB',
    type: 'consumable',
    rewards: {
      gold: 250
    },
    description: 'Small gold pack',
    descriptionRu: 'Маленький пакет золота'
  },
  GOLD_M: {
    id: 'gold_m',
    name: '1000 Gold',
    nameRu: '1000 золота',
    price: 149,
    currency: 'RUB',
    type: 'consumable',
    rewards: {
      gold: 1000
    },
    description: 'Medium gold pack',
    descriptionRu: 'Средний пакет золота'
  },
  GOLD_L: {
    id: 'gold_l',
    name: '2500 Gold',
    nameRu: '2500 золота',
    price: 299,
    currency: 'RUB',
    type: 'consumable',
    rewards: {
      gold: 2500
    },
    description: 'Large gold pack',
    descriptionRu: 'Большой пакет золота'
  }
};

/**
 * Get product by ID
 */
export function getProduct(productId) {
  for (const key in IAP_PRODUCTS) {
    if (IAP_PRODUCTS[key].id === productId) {
      return IAP_PRODUCTS[key];
    }
  }
  return null;
}

/**
 * Get all products
 */
export function getAllProducts() {
  return Object.values(IAP_PRODUCTS);
}

/**
 * Get products by type
 */
export function getProductsByType(type) {
  return Object.values(IAP_PRODUCTS).filter(p => p.type === type);
}
