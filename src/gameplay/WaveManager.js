import { getWaveData } from '../data/waves.js';

/**
 * WaveManager
 * Manages wave progression and spawning.
 * Task 3.1: Wave Manager Baseline
 */
export class WaveManager {
  constructor(app) {
    this.app = app;
    this._currentWave = 0;
    this._waveActive = false;
    this._enemiesSpawned = 0;
    this._enemiesRemaining = 0;
    this._spawnTimer = 0;
    this._spawnQueue = [];

    // Callbacks
    this._onSpawnEnemyCallback = null;
    this._onWaveCompleteCallback = null;
    this._onWaveStartCallback = null;

    // Current wave data
    this._waveData = null;
  }

  /**
   * Get current wave number.
   */
  get currentWave() {
    return this._currentWave;
  }

  /**
   * Check if a wave is currently active.
   */
  get isWaveActive() {
    return this._waveActive;
  }

  /**
   * Get enemies remaining in current wave.
   */
  get enemiesRemaining() {
    return this._enemiesRemaining;
  }

  /**
   * Set callback for spawning an enemy.
   * @param {Function} callback - Function(enemyData)
   */
  setOnSpawnEnemy(callback) {
    this._onSpawnEnemyCallback = callback;
  }

  /**
   * Set callback for wave completion.
   * @param {Function} callback - Function(waveNumber)
   */
  setOnWaveComplete(callback) {
    this._onWaveCompleteCallback = callback;
  }

  /**
   * Set callback for wave start.
   * @param {Function} callback - Function(waveNumber, waveData)
   */
  setOnWaveStart(callback) {
    this._onWaveStartCallback = callback;
  }

  /**
   * Start the next wave.
   */
  startNextWave() {
    if (this._waveActive) {
      console.warn('[WaveManager] Wave already active');
      return;
    }

    this._currentWave++;
    this._waveData = getWaveData(this._currentWave);
    this._enemiesSpawned = 0;
    this._enemiesRemaining = this._waveData.enemyCount;
    this._spawnTimer = 0;
    this._waveActive = true;

    console.log(`[WaveManager] Starting wave ${this._currentWave}`);
    console.log(`[WaveManager] Enemies: ${this._waveData.enemyCount}, HP: ${this._waveData.enemyHP}, Speed: ${this._waveData.enemySpeed}`);
    console.log(`[WaveManager] Spawn interval: ${this._waveData.spawnInterval.toFixed(2)}s`);

    if (this._onWaveStartCallback) {
      this._onWaveStartCallback(this._currentWave, this._waveData);
    }
  }

  /**
   * Start a specific wave (for testing).
   */
  startWave(waveNumber) {
    this._currentWave = waveNumber - 1;
    this.startNextWave();
  }

  /**
   * Notify that an enemy was removed (killed or leaked).
   */
  onEnemyRemoved() {
    this._enemiesRemaining--;

    // Check for wave completion
    if (this._enemiesRemaining <= 0 && this._enemiesSpawned >= this._waveData.enemyCount) {
      this._completeWave();
    }
  }

  /**
   * Update wave spawning.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this._waveActive || !this._waveData) return;

    // Check if all enemies have been spawned
    if (this._enemiesSpawned >= this._waveData.enemyCount) {
      // Wave is now waiting for all enemies to be killed or leak
      return;
    }

    // Update spawn timer
    this._spawnTimer += dt;

    // Spawn enemy when timer exceeds interval
    if (this._spawnTimer >= this._waveData.spawnInterval) {
      this._spawnEnemy();
      this._spawnTimer = 0;
    }
  }

  /**
   * Spawn an enemy.
   */
  _spawnEnemy() {
    if (this._enemiesSpawned >= this._waveData.enemyCount) return;

    this._enemiesSpawned++;

    const enemyData = {
      waveNumber: this._currentWave,
      hp: this._waveData.enemyHP,
      speed: this._waveData.enemySpeed,
      goldReward: this._waveData.goldReward
    };

    console.log(`[WaveManager] Spawning enemy ${this._enemiesSpawned}/${this._waveData.enemyCount}`);

    if (this._onSpawnEnemyCallback) {
      this._onSpawnEnemyCallback(enemyData);
    }
  }

  /**
   * Complete the current wave.
   */
  _completeWave() {
    this._waveActive = false;
    console.log(`[WaveManager] Wave ${this._currentWave} complete`);

    if (this._onWaveCompleteCallback) {
      this._onWaveCompleteCallback(this._currentWave);
    }
  }

  /**
   * Reset wave manager.
   */
  reset() {
    this._currentWave = 0;
    this._waveActive = false;
    this._enemiesSpawned = 0;
    this._enemiesRemaining = 0;
    this._spawnTimer = 0;
    this._waveData = null;
    console.log('[WaveManager] Reset');
  }
}
