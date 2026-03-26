/**
 * SaveService
 * Persists and loads game progress.
 * MVP Schema: { bestWave: number }
 * Uses PlatformBridge for storage.
 */

const STORAGE_KEY = 'core_bastion_mvp';

/**
 * Default save data schema for MVP.
 */
const DEFAULT_SAVE_DATA = {
  bestWave: 0
};

export class SaveService {
  constructor(platformBridge = null) {
    this._platformBridge = platformBridge;
    this._bestWave = 0;
    this._initialized = false;
  }

  /**
   * Initialize and load saved data.
   * @returns {Promise<void>}
   */
  async initialize() {
    await this._load();
    this._initialized = true;
  }

  /**
   * Load saved data from platform storage.
   * @returns {Promise<void>}
   */
  async _load() {
    try {
      let data = null;

      // Use platform bridge if available
      if (this._platformBridge && this._platformBridge.isInitialized) {
        const result = await this._platformBridge.loadProgress();
        if (result.ok) {
          data = result.data;
        }
      }

      // Fallback to localStorage
      if (!data) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          data = JSON.parse(saved);
        }
      }

      // Validate schema: { bestWave: number }
      if (data && typeof data.bestWave === 'number') {
        this._bestWave = data.bestWave;
        console.log(`[SaveService] Loaded bestWave: ${this._bestWave}`);
      } else {
        this._bestWave = 0;
        console.log('[SaveService] No valid save data, starting fresh');
      }
    } catch (e) {
      console.warn('[SaveService] Failed to load save data:', e);
      this._bestWave = 0;
    }
  }

  /**
   * Save data to platform storage.
   * @returns {Promise<void>}
   */
  async _save() {
    const payload = { bestWave: this._bestWave };

    try {
      // Always save to localStorage as backup
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));

      // Save to platform bridge if available
      if (this._platformBridge && this._platformBridge.isInitialized) {
        await this._platformBridge.saveProgress(payload);
      }

      console.log(`[SaveService] Saved bestWave: ${this._bestWave}`);
    } catch (e) {
      console.warn('[SaveService] Failed to save data:', e);
    }
  }

  /**
   * Get the highest wave reached.
   * @returns {number}
   */
  get bestWave() {
    return this._bestWave;
  }

  /**
   * Alias for bestWave.
   * @returns {number}
   */
  get highWave() {
    return this._bestWave;
  }

  /**
   * Update best wave if current wave is higher.
   * @param {number} wave
   * @returns {Promise<boolean>}
   */
  async updateBestWave(wave) {
    if (wave > this._bestWave) {
      this._bestWave = wave;
      await this._save();
      console.log(`[SaveService] New bestWave: ${this._bestWave}`);
      return true;
    }
    return false;
  }

  /**
   * Alias for updateBestWave.
   * @param {number} wave
   * @returns {Promise<boolean>}
   */
  async updateHighWave(wave) {
    return this.updateBestWave(wave);
  }

  /**
   * Set the platform bridge for cloud storage support.
   * @param {PlatformBridge} bridge
   */
  setPlatformBridge(bridge) {
    this._platformBridge = bridge;
  }

  /**
   * Reset all saved data.
   * @returns {Promise<void>}
   */
  async reset() {
    this._bestWave = 0;
    try {
      localStorage.removeItem(STORAGE_KEY);
      if (this._platformBridge && this._platformBridge.isInitialized) {
        await this._platformBridge.saveProgress(DEFAULT_SAVE_DATA);
      }
    } catch (e) {
      console.warn('[SaveService] Failed to clear save data:', e);
    }
    console.log('[SaveService] Save data reset');
  }
}
