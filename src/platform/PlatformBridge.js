/**
 * Platform Bridge Factory
 * Auto-detects and creates appropriate platform bridge
 */

import { PlatformBridge } from './PlatformBridgeBase.js';
import { YandexBridge } from './YandexBridge.js';
import { VKPlayBridge } from './VKPlayBridge.js';
import { VKPlayMock } from './VKPlayMock.js';
import { EditorBridge } from './EditorBridge.js';

/**
 * Create platform bridge based on environment
 * @param {Object} options - Configuration options
 * @param {boolean} options.useMock - Force use mock
 * @param {string} options.forcePlatform - Force specific platform
 * @returns {Promise<Object>} Platform bridge instance
 */
export async function createPlatformBridge(options = {}) {
  const { useMock = false, forcePlatform = null } = options;
  
  // Force mock for testing
  if (useMock) {
    console.log('[PlatformBridge] Using VKPlayMock (forced)');
    const mock = new VKPlayMock();
    await mock.init();
    return mock;
  }
  
  // Force specific platform
  if (forcePlatform) {
    console.log(`[PlatformBridge] Forcing platform: ${forcePlatform}`);
    switch (forcePlatform) {
      case 'yandex':
        const yandex = new YandexBridge();
        await yandex.init();
        return yandex;
      case 'vkplay':
        const vkplay = new VKPlayBridge();
        await vkplay.init();
        return vkplay;
      case 'editor': {
        const editor = new EditorBridge();
        await editor.init();
        return editor;
      }
    }
  }
  
  // Auto-detect platform
  
  // Check URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const platformParam = urlParams.get('platform');
  
  if (platformParam === 'yandex') {
    console.log('[PlatformBridge] Detected Yandex via URL param');
    const bridge = new YandexBridge();
    await bridge.init();
    return bridge;
  }
  
  if (platformParam === 'vkplay') {
    console.log('[PlatformBridge] Detected VK Play via URL param');
    const bridge = new VKPlayBridge();
    await bridge.init();
    return bridge;
  }
  
  // Check for Yandex Games environment
  const isYandex = window.YaGames || 
    window.location.hostname.includes('yandex') ||
    window.location.href.includes('yandex.ru/games');
  
  if (isYandex) {
    console.log('[PlatformBridge] Detected Yandex Games environment');
    const bridge = new YandexBridge();
    await bridge.init();
    return bridge;
  }
  
  // Check for VK Play environment
  const isVKPlay = window.VKPlaySDK ||
    window.location.hostname.includes('vkplay') ||
    window.location.hostname.includes('vk-play') ||
    navigator.userAgent.includes('VKPlay');
  
  if (isVKPlay) {
    console.log('[PlatformBridge] Detected VK Play environment');
    const bridge = new VKPlayBridge();
    await bridge.init();
    return bridge;
  }
  
  // Default to Editor bridge for local development
  console.log('[PlatformBridge] Using EditorBridge (local development)');
  const editor = new EditorBridge();
  await editor.init();
  return editor;
}

// Re-export bridge classes
export { PlatformBridge } from './PlatformBridgeBase.js';
export { YandexBridge } from './YandexBridge.js';
export { VKPlayBridge } from './VKPlayBridge.js';
export { VKPlayMock } from './VKPlayMock.js';
export { EditorBridge } from './EditorBridge.js';
