import { getEnemyComposition, getEnemyStats, getEnemyType } from '../data/enemyTypes.js';
import { EnemyAgent } from './EnemyAgent.js';
import { ObjectPool } from './ObjectPool.js';

/**
 * EnemySpawner
 * Handles spawning of enemies with type system integration.
 * Task 4-b: Enemy types integration
 */
export class EnemySpawner {
  constructor(app, options = {}) {
    this.app = app;
    this.assetLoader = options.assetLoader || null;
    this._enemyPools = new Map();
    this._poolInitialSize = options.enemyPoolInitialSize || 6;
    this._poolMaxSize = options.enemyPoolMaxSize || 160;

    // Callbacks
    this._onEnemySpawnedCallback = null;
    this._onEnemyDeathCallback = null;
    this._onEnemyLeakCallback = null;
    this._onBossSpawnCallback = null;

    // Tracking
    this._activeEnemies = [];
    this._totalSpawned = 0;
    this._totalKilled = 0;
    this._totalLeaked = 0;
  }

  _getPool(typeId) {
    if (this._enemyPools.has(typeId)) {
      return this._enemyPools.get(typeId);
    }

    const pool = new ObjectPool(
      () => new EnemyAgent(this.app, {
        typeId,
        waveNumber: 1,
        assetLoader: this.assetLoader
      }),
      (enemy) => enemy.reset(),
      this._poolInitialSize,
      this._poolMaxSize
    );

    this._enemyPools.set(typeId, pool);
    return pool;
  }

  _removeActiveEnemy(enemy) {
    const index = this._activeEnemies.indexOf(enemy);
    if (index === -1) return;
    this._activeEnemies[index] = this._activeEnemies[this._activeEnemies.length - 1];
    this._activeEnemies.pop();
  }

  _releaseEnemy(enemy) {
    if (!enemy) return;
    this._getPool(enemy.typeId || 'grunt').release(enemy);
  }

  /**
   * Set callback for when an enemy is spawned.
   * @param {Function} callback - Function(enemy)
   */
  setOnEnemySpawned(callback) {
    this._onEnemySpawnedCallback = callback;
  }

  /**
   * Set callback for when an enemy dies.
   * @param {Function} callback - Function(enemy, goldReward)
   */
  setOnEnemyDeath(callback) {
    this._onEnemyDeathCallback = callback;
  }

  /**
   * Set callback for when an enemy leaks (reaches endpoint).
   * @param {Function} callback - Function(enemy, leakDamage)
   */
  setOnEnemyLeak(callback) {
    this._onEnemyLeakCallback = callback;
  }

  /**
   * Set callback for when a boss spawns.
   * @param {Function} callback - Function(bossEnemy, waveNumber)
   */
  setOnBossSpawn(callback) {
    this._onBossSpawnCallback = callback;
  }

  /**
   * Generate enemy wave data for a specific wave number.
   * @param {number} waveNumber
   * @returns {Array} Array of enemy spawn data
   */
  generateWave(waveNumber) {
    const composition = getEnemyComposition(waveNumber);

    return composition.map(typeId => {
      const stats = getEnemyStats(typeId, waveNumber);
      return {
        typeId,
        waveNumber,
        hp: stats.hp,
        speed: stats.speed,
        goldReward: stats.goldReward,
        leakDamage: stats.leakDamage,
        armor: stats.armor,
        canFly: stats.canFly,
        scale: stats.scale,
        special: stats.special,
        abilities: stats.abilities || []
      };
    });
  }

  /**
   * Spawn a single enemy.
   * @param {Object} enemyData - Enemy configuration
   * @returns {EnemyAgent} The spawned enemy
   */
  spawnEnemy(enemyData) {
    const typeId = enemyData.typeId || 'grunt';
    const pool = this._getPool(typeId);
    const enemy = pool.get({
      ...enemyData,
      typeId,
      waveNumber: enemyData.waveNumber || 1,
      assetLoader: this.assetLoader
    });

    if (!enemy) {
      return null;
    }

    // Set up callbacks
    enemy.setOnDeath((e) => this._handleEnemyDeath(e));
    enemy.setOnReachEndpoint((e) => this._handleEnemyLeak(e));
    enemy.setOnSummonMinions((data) => this._handleBossSummon(data, enemyData.waveNumber));

    // Track enemy
    this._activeEnemies.push(enemy);
    this._totalSpawned++;

    // Notify spawn
    if (this._onEnemySpawnedCallback) {
      this._onEnemySpawnedCallback(enemy);
    }

    // Check for boss spawn
    if (enemy.typeId === 'boss' && this._onBossSpawnCallback) {
      this._onBossSpawnCallback(enemy, enemyData.waveNumber);
    }

    console.log(`[EnemySpawner] Spawned ${enemy.typeId} (HP: ${enemy.hp}, Speed: ${enemy._speed})`);

    return enemy;
  }

  /**
   * Spawn multiple enemies from wave data.
   * @param {Array} waveData - Array of enemy data from generateWave()
   * @param {number} delay - Delay between spawns in seconds
   * @returns {Array} Array of spawned enemies
   */
  spawnWave(waveData, spawnDelay = 0) {
    const enemies = [];

    waveData.forEach((enemyData, index) => {
      // Use setTimeout-like behavior for staggered spawning
      // The actual spawning timing is handled by WaveManager
      const enemy = this.spawnEnemy(enemyData);
      enemies.push(enemy);
    });

    return enemies;
  }

  /**
   * Handle enemy death.
   * @param {EnemyAgent} enemy
   */
  _handleEnemyDeath(enemy) {
    this._activeEnemies = this._activeEnemies.filter(e => e !== enemy);
    this._totalKilled++;

    if (this._onEnemyDeathCallback) {
      this._onEnemyDeathCallback(enemy, enemy.goldReward);
    }

    console.log(`[EnemySpawner] Enemy ${enemy.typeId} killed (total killed: ${this._totalKilled})`);
  }

  /**
   * Handle enemy leak.
   * @param {EnemyAgent} enemy
   */
  _handleEnemyLeak(enemy) {
    this._activeEnemies = this._activeEnemies.filter(e => e !== enemy);
    this._totalLeaked++;

    if (this._onEnemyLeakCallback) {
      this._onEnemyLeakCallback(enemy, enemy.leakDamage);
    }

    console.log(`[EnemySpawner] Enemy ${enemy.typeId} leaked (damage: ${enemy.leakDamage})`);
  }

  /**
   * Handle boss summon minions ability.
   * @param {Object} summonData
   * @param {number} waveNumber
   */
  _handleBossSummon(summonData, waveNumber) {
    console.log(`[EnemySpawner] Boss summons ${summonData.count} minions`);

    // Check if this is a custom spawn with specific position
    const basePosition = summonData.spawnPosition || null;

    for (let i = 0; i < summonData.count; i++) {
      const stats = getEnemyStats(summonData.typeId, waveNumber);

      // Spawn at boss position with small offset
      const offset = basePosition ? {
        x: basePosition.x + (Math.random() - 0.5) * 2,
        z: basePosition.z + (Math.random() - 0.5) * 2
      } : {
        x: (Math.random() - 0.5) * 2,
        z: (Math.random() - 0.5) * 2
      };

      const minionData = {
        typeId: summonData.typeId,
        waveNumber: summonData.waveNumber || waveNumber,
        hp: summonData.customHP || stats.hp,
        speed: stats.speed,
        goldReward: Math.floor(stats.goldReward * 0.5), // Minions give less gold
        spawnOffset: offset
      };

      // Spawn minion (simplified - actual position offset would need path integration)
      this.spawnEnemy(minionData);
    }
  }

  /**
   * Get all active enemies.
   * @returns {Array}
   */
  getActiveEnemies() {
    return this._activeEnemies.filter(e => e.isActive);
  }

  /**
   * Get count of active enemies.
   * @returns {number}
   */
  getActiveEnemyCount() {
    return this._activeEnemies.filter(e => e.isActive).length;
  }

  /**
   * Get total enemies spawned.
   * @returns {number}
   */
  getTotalSpawned() {
    return this._totalSpawned;
  }

  /**
   * Get total enemies killed.
   * @returns {number}
   */
  getTotalKilled() {
    return this._totalKilled;
  }

  /**
   * Get total enemies leaked.
   * @returns {number}
   */
  getTotalLeaked() {
    return this._totalLeaked;
  }

  /**
   * Check if wave is a boss wave.
   * @param {number} waveNumber
   * @returns {boolean}
   */
  isBossWave(waveNumber) {
    return waveNumber % 10 === 0;
  }

  /**
   * Get wave composition summary.
   * @param {number} waveNumber
   * @returns {Object} Summary with counts per type
   */
  getWaveSummary(waveNumber) {
    const composition = this.generateWave(waveNumber);
    const summary = {
      total: composition.length,
      types: {},
      isBossWave: this.isBossWave(waveNumber)
    };

    composition.forEach(enemy => {
      if (!summary.types[enemy.typeId]) {
        summary.types[enemy.typeId] = 0;
      }
      summary.types[enemy.typeId]++;
    });

    return summary;
  }

  /**
   * Update all active enemies.
   * @param {number} dt - Delta time
   */
  update(dt) {
    this._activeEnemies.forEach(enemy => {
      if (enemy.isActive) {
        enemy.update(dt);
      }
    });

    // Clean up inactive enemies
    this._activeEnemies = this._activeEnemies.filter(e => e.isActive);
  }

  /**
   * Reset spawner state.
   */
  reset() {
    // Destroy all active enemies
    this._activeEnemies.forEach(enemy => {
      enemy.destroy();
    });

    this._activeEnemies = [];
    this._totalSpawned = 0;
    this._totalKilled = 0;
    this._totalLeaked = 0;

    console.log('[EnemySpawner] Reset');
  }

  /**
   * Find enemy at position (for tower targeting).
   * @param {Object} position - {x, z}
   * @param {number} radius - Search radius
   * @returns {EnemyAgent|null}
   */
  findEnemyAtPosition(position, radius) {
    for (const enemy of this._activeEnemies) {
      if (!enemy.isActive) continue;

      const enemyPos = enemy.position;
      if (!enemyPos) continue;

      const dx = position.x - enemyPos.x;
      const dz = position.z - enemyPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= radius + enemy.collisionRadius) {
        return enemy;
      }
    }

    return null;
  }

  /**
   * Find all enemies in radius.
   * @param {Object} position - {x, z}
   * @param {number} radius - Search radius
   * @returns {Array}
   */
  findEnemiesInRadius(position, radius) {
    const enemies = [];

    for (const enemy of this._activeEnemies) {
      if (!enemy.isActive) continue;

      const enemyPos = enemy.position;
      if (!enemyPos) continue;

      const dx = position.x - enemyPos.x;
      const dz = position.z - enemyPos.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance <= radius) {
        enemies.push({ enemy, distance });
      }
    }

    // Sort by distance
    enemies.sort((a, b) => a.distance - b.distance);

    return enemies.map(e => e.enemy);
  }

  /**
   * Get all active enemies (for ultimate system).
   * @returns {Array<EnemyAgent>}
   */
  getActiveEnemies() {
    return this._activeEnemies.filter(e => e.isActive);
  }

  /**
   * Find the furthest progressed enemy (closest to endpoint).
   * @returns {EnemyAgent|null}
   */
  findFurthestEnemy() {
    let furthest = null;
    let maxProgress = -1;

    for (const enemy of this._activeEnemies) {
      if (!enemy.isActive) continue;

      // Use waypoint index as progress indicator
      if (enemy._currentWaypointIndex > maxProgress) {
        maxProgress = enemy._currentWaypointIndex;
        furthest = enemy;
      }
    }

    return furthest;
  }

  /**
   * Apply slow effect to all enemies in radius.
   * @param {Object} position - {x, z}
   * @param {number} radius
   * @param {number} slowFactor
   * @param {number} duration
   * @returns {number} Number of enemies affected
   */
  applySlowInRadius(position, radius, slowFactor, duration) {
    const enemies = this.findEnemiesInRadius(position, radius);
    let count = 0;

    enemies.forEach(enemy => {
      enemy.applySlow(slowFactor, duration);
      count++;
    });

    return count;
  }

  /**
   * Deal damage to all enemies in radius.
   * @param {Object} position - {x, z}
   * @param {number} radius
   * @param {number} damage
   * @returns {number} Number of enemies hit
   */
  dealDamageInRadius(position, radius, damage) {
    const enemies = this.findEnemiesInRadius(position, radius);
    let count = 0;

    enemies.forEach(enemy => {
      enemy.takeDamage(damage);
      count++;
    });

    return count;
  }
}
