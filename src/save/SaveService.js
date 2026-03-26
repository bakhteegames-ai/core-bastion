/**
 * SaveService
 * Persists and loads game progress.
 * Task 3.4: Save High Wave
 */

const STORAGE_KEY = 'coreBastion_save';

export class SaveService {
  constructor() {
    this._highWave = 0;
    this._load();
  }

  /**
   * Load saved data from localStorage.
   */
  _load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        this._highWave = data.highWave || 0;
        console.log(`[SaveService] Loaded high wave: ${this._highWave}`);
      }
    } catch (e) {
      console.warn('[SaveService] Failed to load save data:', e);
      this._highWave = 0;
    }
  }

  /**
   * Save data to localStorage.
   */
  _save() {
    try {
      const data = {
        highWave: this._highWave
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log(`[SaveService] Saved high wave: ${this._highWave}`);
    } catch (e) {
      console.warn('[SaveService] Failed to save data:', e);
    }
  }

  /**
   * Get the highest wave reached.
   * @returns {number}
   */
  get highWave() {
    return this._highWave;
  }

  /**
   * Update high wave if current wave is higher.
   * @param {number} wave - Current wave number
   * @returns {boolean} - true if new high wave was set
   */
  updateHighWave(wave) {
    if (wave > this._highWave) {
      this._highWave = wave;
      this._save();
      console.log(`[SaveService] New high wave: ${this._highWave}`);
      return true;
    }
    return false;
  }

  /**
   * Reset all saved data.
   */
  reset() {
    this._highWave = 0;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[SaveService] Failed to clear save data:', e);
    }
    console.log('[SaveService] Save data reset');
  }
}
