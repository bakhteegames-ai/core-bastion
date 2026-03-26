/**
 * SaveService
 * Persists and loads game progress.
 * MVP Schema: { bestWave: number }
 * Task 3.4: Save High Wave
 */

const STORAGE_KEY = 'core_bastion_mvp';

/**
 * Default save data schema for MVP.
 * @type {Object}
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
   * Call after platformBridge is ready.
   * @returns {Promise<void>}
   */
  async initialize() {
    await this._load();
    this._initialized = true;
  }

  /**
   * Load saved data from platform storage or localStorage.
   * @returns {Promise<void>}
   */
  async _load() {
    try {
      let data = null;

      // Try platform bridge first (Yandex cloud storage)
      if (this._platformBridge && this._platformBridge.isInitialized) {
        data = await this._platformBridge.loadData();
      }

      // Fallback to localStorage
      if (!data) {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          data = JSON.parse(saved);
        }
      }

      // Validate and apply schema: { bestWave: number }
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
   * Save data to platform storage and localStorage.
   * Schema: { bestWave: number }
   * @returns {Promise<void>}
   */
  async _save() {
    const data = {
      bestWave: this._bestWave
    };

    try {
      // Save to localStorage (always, as backup)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

      // Save to platform bridge if available
      if (this._platformBridge && this._platformBridge.isInitialized) {
        await this._platformBridge.saveData(data);
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
   * Alias for bestWave (backward compatibility).
   * @returns {number}
   */
  get highWave() {
    return this._bestWave;
  }

  /**
   * Update best wave if current wave is higher.
   * @param {number} wave - Current wave number
   * @returns {Promise<boolean>} - true if new best wave was set
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
   * Alias for updateBestWave (backward compatibility).
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
        await this._platformBridge.saveData(DEFAULT_SAVE_DATA);
      }
    } catch (e) {
      console.warn('[SaveService] Failed to clear save data:', e);
    }
    console.log('[SaveService] Save data reset');
  }
}
