/**
 * SaveService
 * Persists both scalar progress and namespaced feature saves.
 * Canonical payload shape: { bestWave: number, data: Record<string, unknown> }
 */

const STORAGE_KEY = 'core_bastion_mvp';

const DEFAULT_SAVE_DATA = {
  bestWave: 0,
  data: {}
};

export class SaveService {
  constructor(platformBridge = null) {
    this._platformBridge = platformBridge;
    this._state = structuredClone(DEFAULT_SAVE_DATA);
    this._initialized = false;
  }

  async initialize() {
    await this._load();
    this._initialized = true;
  }

  _normalizePayload(data) {
    if (!data || typeof data !== 'object') {
      return structuredClone(DEFAULT_SAVE_DATA);
    }

    const bestWave = typeof data.bestWave === 'number' ? data.bestWave : 0;
    const namespaceData = data.data && typeof data.data === 'object' ? data.data : {};
    return {
      bestWave,
      data: { ...namespaceData }
    };
  }

  async _load() {
    try {
      let data = null;

      if (this._platformBridge && this._platformBridge.isInitialized) {
        const result = await this._platformBridge.loadProgress();
        if (result?.ok && result.data) {
          data = result.data;
        }
      }

      if (!data && typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          data = JSON.parse(saved);
        }
      }

      this._state = this._normalizePayload(data);
      console.log(`[SaveService] Loaded bestWave: ${this._state.bestWave}`);
    } catch (e) {
      console.warn('[SaveService] Failed to load save data:', e);
      this._state = structuredClone(DEFAULT_SAVE_DATA);
    }
  }

  async _save() {
    const payload = this._normalizePayload(this._state);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      }

      if (this._platformBridge && this._platformBridge.isInitialized) {
        await this._platformBridge.saveProgress(payload);
      }

      console.log(`[SaveService] Saved bestWave: ${payload.bestWave}`);
    } catch (e) {
      console.warn('[SaveService] Failed to save data:', e);
    }
  }

  get bestWave() {
    return this._state.bestWave;
  }

  get highWave() {
    return this._state.bestWave;
  }

  async updateBestWave(wave) {
    if (wave > this._state.bestWave) {
      this._state.bestWave = wave;
      await this._save();
      console.log(`[SaveService] New bestWave: ${this._state.bestWave}`);
      return true;
    }
    return false;
  }

  async updateHighWave(wave) {
    return this.updateBestWave(wave);
  }

  setPlatformBridge(bridge) {
    this._platformBridge = bridge;
  }

  async loadData(key) {
    if (!key) return null;
    return this._state.data[key] ?? null;
  }

  async saveData(key, value) {
    if (!key) return false;
    this._state.data[key] = value;
    await this._save();
    return true;
  }

  async reset() {
    this._state = structuredClone(DEFAULT_SAVE_DATA);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(STORAGE_KEY);
      }
      if (this._platformBridge && this._platformBridge.isInitialized) {
        await this._platformBridge.saveProgress(structuredClone(DEFAULT_SAVE_DATA));
      }
    } catch (e) {
      console.warn('[SaveService] Failed to clear save data:', e);
    }
    console.log('[SaveService] Save data reset');
  }
}
