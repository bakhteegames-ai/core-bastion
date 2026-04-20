import { getWaveData } from '../data/waves.js';
import { EnemySpawner } from './EnemySpawner.js';
import { getEnemyComposition, getEnemyStats } from '../data/enemyTypes.js';
import { generateModifierSchedule, getModifierForWave } from '../data/waveModifiers.js';
import { WaveModifierSystem } from './WaveModifierSystem.js';
import { EventBus } from '../core/EventBus.js';

/**
 * WaveManager
 * Manages wave progression and spawning.
 * Task 3.1: Wave Manager Baseline
 * Task 4-b: Enemy types integration
 */
export class WaveManager {
  constructor(app, options = {}) {
    this.app = app;
    this._currentWave = 0;
    this._waveActive = false;
    this._enemiesSpawned = 0;
    this._enemiesRemaining = 0;
    this._spawnTimer = 0;
    this._spawnQueue = [];

    // Enemy spawner with type system
    this._spawner = options.spawner || new EnemySpawner(app, options);
    this._useEnemyTypes = options.useEnemyTypes !== false; // Default to true

    // Callbacks
    this._onSpawnEnemyCallback = null;
    this._onWaveCompleteCallback = null;
    this._onWaveStartCallback = null;
    this._onBossSpawnCallback = null;

    // Current wave data
    this._waveData = null;

    // Boss wave tracking
    this._isBossWave = false;
    this._bossSpawned = false;

    // Wave modifier system
    this._modifierSystem = new WaveModifierSystem();
    this._modifierSchedule = [];
    this._currentModifier = null;

    // Set up spawner callbacks
    this._setupSpawnerCallbacks();
  }

  /**
   * Set up spawner event callbacks.
   */
  _setupSpawnerCallbacks() {
    this._spawner.setOnEnemyDeath((enemy, goldReward) => {
      this.onEnemyRemoved();
    });

    this._spawner.setOnEnemyLeak((enemy, leakDamage) => {
      this.onEnemyRemoved();
    });

    this._spawner.setOnBossSpawn((enemy, waveNumber) => {
      this._bossSpawned = true;
      if (this._onBossSpawnCallback) {
        this._onBossSpawnCallback(enemy, waveNumber);
      }
    });
  }

  /**
   * Get the enemy spawner.
   */
  get spawner() {
    return this._spawner;
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
   * Check if current wave is a boss wave.
   */
  get isBossWave() {
    return this._isBossWave;
  }

  /**
   * Check if boss has been spawned in current wave.
   */
  get bossSpawned() {
    return this._bossSpawned;
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
   * Set callback for boss spawn.
   * @param {Function} callback - Function(bossEnemy, waveNumber)
   */
  setOnBossSpawn(callback) {
    this._onBossSpawnCallback = callback;
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
    this._enemiesSpawned = 0;
    this._spawnTimer = 0;
    this._waveActive = true;
    this._bossSpawned = false;

    // Check if boss wave
    this._isBossWave = this._currentWave % 10 === 0;

    // Check for wave modifier
    this._currentModifier = this._modifierSystem.onWaveStart(this._currentWave);
    if (this._currentModifier) {
      console.log(`[WaveManager] Modifier active: ${this._currentModifier.name}`);
    }

    if (this._useEnemyTypes) {
      // Use new enemy type system
      this._startWaveWithEnemyTypes();
    } else {
      // Use legacy wave data
      this._startWaveLegacy();
    }

    console.log(`[WaveManager] Starting wave ${this._currentWave}${this._isBossWave ? ' (BOSS WAVE)' : ''}`);
    console.log(`[WaveManager] Enemies: ${this._waveData.enemyCount || this._spawnQueue.length}`);
    console.log(`[WaveManager] Spawn interval: ${this._waveData.spawnInterval?.toFixed(2) || 1.0}s`);
  }

  /**
   * Start wave using enemy type system.
   */
  _startWaveWithEnemyTypes() {
    // Generate spawn queue from enemy types
    this._spawnQueue = this._spawner.generateWave(this._currentWave);
    
    // Apply modifier effects to enemy count
    const countMult = this._modifierSystem.getEnemyCountMultiplier();
    if (countMult !== 1.0) {
      const newCount = Math.floor(this._spawnQueue.length * countMult);
      // Extend queue by repeating random enemies
      while (this._spawnQueue.length < newCount) {
        const randomEnemy = this._spawnQueue[Math.floor(Math.random() * this._spawnQueue.length)];
        this._spawnQueue.push({ ...randomEnemy });
      }
      this._enemiesRemaining = this._spawnQueue.length;
    } else {
      this._enemiesRemaining = this._spawnQueue.length;
    }

    // Create wave data summary
    this._waveData = {
      enemyCount: this._spawnQueue.length,
      spawnInterval: this._calculateSpawnInterval(this._currentWave),
      isBossWave: this._isBossWave,
      composition: this._spawner.getWaveSummary(this._currentWave)
    };
    
    // Apply spawn interval modifier
    const intervalMult = this._modifierSystem.getSpawnIntervalMultiplier();
    if (intervalMult !== 1.0) {
      this._waveData.spawnInterval *= intervalMult;
    }

    if (this._onWaveStartCallback) {
      this._onWaveStartCallback(this._currentWave, this._waveData);
    }
  }

  /**
   * Start wave using legacy wave data.
   */
  _startWaveLegacy() {
    this._waveData = getWaveData(this._currentWave);
    this._enemiesRemaining = this._waveData.enemyCount;
    this._spawnQueue = [];

    if (this._onWaveStartCallback) {
      this._onWaveStartCallback(this._currentWave, this._waveData);
    }
  }

  /**
   * Calculate spawn interval based on wave number.
   * @param {number} waveNumber
   * @returns {number}
   */
  _calculateSpawnInterval(waveNumber) {
    // Base interval: 1.2s
    // Decreases by 0.05s per wave, minimum 0.5s
    return Math.max(0.5, 1.2 - (waveNumber - 1) * 0.05);
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

    console.log(`[WaveManager] Enemy removed, remaining: ${this._enemiesRemaining}`);

    // Check for wave completion
    const totalEnemies = this._waveData.enemyCount || this._spawnQueue.length || this._enemiesSpawned;
    if (this._enemiesRemaining <= 0 && this._enemiesSpawned >= totalEnemies) {
      this._completeWave();
    }
  }

  /**
   * Update wave spawning.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this._waveActive) return;

    // Update spawner enemies
    this._spawner.update(dt);

    // Check if all enemies have been spawned
    if (this._useEnemyTypes) {
      if (this._enemiesSpawned >= this._spawnQueue.length) {
        // Wave is waiting for all enemies to be killed or leak
        return;
      }
    } else {
      if (this._waveData && this._enemiesSpawned >= this._waveData.enemyCount) {
        return;
      }
    }

    // Update spawn timer
    this._spawnTimer += dt;

    // Get spawn interval
    const spawnInterval = this._waveData?.spawnInterval || 1.0;

    // Spawn enemy when timer exceeds interval
    if (this._spawnTimer >= spawnInterval) {
      this._spawnEnemy();
      this._spawnTimer = 0;
    }
  }

  /**
   * Spawn an enemy.
   */
  _spawnEnemy() {
    if (this._useEnemyTypes) {
      this._spawnEnemyFromQueue();
    } else {
      this._spawnEnemyLegacy();
    }
  }

  /**
   * Spawn enemy from type queue.
   */
  _spawnEnemyFromQueue() {
    if (this._enemiesSpawned >= this._spawnQueue.length) return;

    let enemyData = { ...this._spawnQueue[this._enemiesSpawned] };
    this._enemiesSpawned++;

    // Apply modifier modifications to enemy data
    if (this._modifierSystem) {
      enemyData = this._modifierSystem.modifyEnemyData(enemyData, this._currentWave);
    }

    console.log(`[WaveManager] Spawning enemy ${this._enemiesSpawned}/${this._spawnQueue.length} (${enemyData.typeId})`);

    // Use spawner to create enemy
    const enemy = this._spawner.spawnEnemy(enemyData);

    // Legacy callback support
    if (this._onSpawnEnemyCallback) {
      this._onSpawnEnemyCallback({
        ...enemyData,
        enemy // Pass the actual enemy instance
      });
    }
  }

  /**
   * Spawn enemy using legacy system.
   */
  _spawnEnemyLegacy() {
    if (!this._waveData || this._enemiesSpawned >= this._waveData.enemyCount) return;

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

    // Calculate reward and emit event for decoupled handling
    const reward = this._calculateWaveReward(this._currentWave);
    EventBus.emit('wave:completed', { waveIndex: this._currentWave, reward });

    if (this._onWaveCompleteCallback) {
      this._onWaveCompleteCallback(this._currentWave);
    }
  }

  /**
   * Calculate wave reward based on wave number.
   * @param {number} waveIndex - Current wave index
   * @returns {number} Gold reward
   */
  _calculateWaveReward(waveIndex) {
    // Base reward: 50 gold, increases by 10 per wave
    return 50 + (waveIndex * 10);
  }

  /**
   * Get active enemies from spawner.
   * @returns {Array}
   */
  getActiveEnemies() {
    return this._spawner.getActiveEnemies();
  }

  /**
   * Get count of active enemies.
   * @returns {number}
   */
  getActiveEnemyCount() {
    return this._spawner.getActiveEnemyCount();
  }

  /**
   * Find enemy at position.
   * @param {Object} position
   * @param {number} radius
   * @returns {EnemyAgent|null}
   */
  findEnemyAtPosition(position, radius) {
    return this._spawner.findEnemyAtPosition(position, radius);
  }

  /**
   * Find all enemies in radius.
   * @param {Object} position
   * @param {number} radius
   * @returns {Array}
   */
  findEnemiesInRadius(position, radius) {
    return this._spawner.findEnemiesInRadius(position, radius);
  }

  /**
   * Find the furthest progressed enemy.
   * @returns {EnemyAgent|null}
   */
  findFurthestEnemy() {
    return this._spawner.findFurthestEnemy();
  }

  /**
   * Apply slow effect to enemies in radius.
   * @param {Object} position
   * @param {number} radius
   * @param {number} factor
   * @param {number} duration
   * @returns {number}
   */
  applySlowInRadius(position, radius, factor, duration) {
    return this._spawner.applySlowInRadius(position, radius, factor, duration);
  }

  /**
   * Deal damage to enemies in radius.
   * @param {Object} position
   * @param {number} radius
   * @param {number} damage
   * @returns {number}
   */
  dealDamageInRadius(position, radius, damage) {
    return this._spawner.dealDamageInRadius(position, radius, damage);
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
    this._spawnQueue = [];
    this._isBossWave = false;
    this._bossSpawned = false;
    this._modifierSchedule = [];
    this._currentModifier = null;

    // Reset spawner
    this._spawner.reset();
    
    // Reset modifier system
    this._modifierSystem.setSchedule([]);

    console.log('[WaveManager] Reset');
  }

  /**
   * Set modifier schedule for current run
   */
  setModifierSchedule(schedule) {
    this._modifierSchedule = schedule || [];
    this._modifierSystem.setSchedule(schedule);
  }

  /**
   * Get active modifier for UI
   */
  getActiveModifier() {
    return this._currentModifier;
  }

  /**
   * Get modifier system for external queries
   */
  get modifierSystem() {
    return this._modifierSystem;
  }

  /**
   * Get wave preview for UI.
   * @param {number} waveNumber
   * @returns {Object}
   */
  getWavePreview(waveNumber) {
    const summary = this._spawner.getWaveSummary(waveNumber);

    return {
      waveNumber,
      totalEnemies: summary.total,
      types: summary.types,
      isBossWave: summary.isBossWave,
      spawnInterval: this._calculateSpawnInterval(waveNumber)
    };
  }

  /**
   * Get statistics.
   * @returns {Object}
   */
  getStats() {
    return {
      currentWave: this._currentWave,
      waveActive: this._waveActive,
      enemiesSpawned: this._enemiesSpawned,
      enemiesRemaining: this._enemiesRemaining,
      isBossWave: this._isBossWave,
      bossSpawned: this._bossSpawned,
      totalSpawned: this._spawner.getTotalSpawned(),
      totalKilled: this._spawner.getTotalKilled(),
      totalLeaked: this._spawner.getTotalLeaked()
    };
  }
}
