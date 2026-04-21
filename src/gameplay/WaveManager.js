import { getWaveData } from '../data/waves.js';
import { EnemySpawner } from './EnemySpawner.js';
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

    this._spawner = options.spawner || new EnemySpawner(app, options);
    this._useEnemyTypes = options.useEnemyTypes !== false;

    this._onSpawnEnemyCallback = null;
    this._onWaveCompleteCallback = null;
    this._onWaveStartCallback = null;
    this._onBossSpawnCallback = null;
    this._onEnemyDeathCallback = null;
    this._onEnemyLeakCallback = null;

    this._waveData = null;
    this._isBossWave = false;
    this._bossSpawned = false;
    this._modifierSystem = new WaveModifierSystem();
    this._modifierSchedule = [];
    this._currentModifier = null;

    this._setupSpawnerCallbacks();
  }

  _setupSpawnerCallbacks() {
    this._spawner.setOnEnemyDeath((enemy, goldReward) => {
      this.onEnemyRemoved();
      this._onEnemyDeathCallback?.(enemy, goldReward);
    });

    this._spawner.setOnEnemyLeak((enemy, leakDamage) => {
      this.onEnemyRemoved();
      this._onEnemyLeakCallback?.(enemy, leakDamage);
    });

    this._spawner.setOnBossSpawn((enemy, waveNumber) => {
      this._bossSpawned = true;
      this._onBossSpawnCallback?.(enemy, waveNumber);
    });
  }

  get spawner() {
    return this._spawner;
  }

  get currentWave() {
    return this._currentWave;
  }

  get isWaveActive() {
    return this._waveActive;
  }

  get enemiesRemaining() {
    return this._enemiesRemaining;
  }

  get isBossWave() {
    return this._isBossWave;
  }

  get bossSpawned() {
    return this._bossSpawned;
  }

  setOnSpawnEnemy(callback) {
    this._onSpawnEnemyCallback = callback;
  }

  setOnWaveComplete(callback) {
    this._onWaveCompleteCallback = callback;
  }

  setOnWaveStart(callback) {
    this._onWaveStartCallback = callback;
  }

  setOnBossSpawn(callback) {
    this._onBossSpawnCallback = callback;
  }

  setOnEnemyDeath(callback) {
    this._onEnemyDeathCallback = callback;
  }

  setOnEnemyLeak(callback) {
    this._onEnemyLeakCallback = callback;
  }

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
    this._isBossWave = this._currentWave % 10 === 0;

    this._currentModifier = this._modifierSystem.onWaveStart(this._currentWave);
    if (this._currentModifier) {
      console.log(`[WaveManager] Modifier active: ${this._currentModifier.name}`);
    }

    if (this._useEnemyTypes) {
      this._startWaveWithEnemyTypes();
    } else {
      this._startWaveLegacy();
    }

    console.log(`[WaveManager] Starting wave ${this._currentWave}${this._isBossWave ? ' (BOSS WAVE)' : ''}`);
    console.log(`[WaveManager] Enemies: ${this._waveData.enemyCount || this._spawnQueue.length}`);
    console.log(`[WaveManager] Spawn interval: ${this._waveData.spawnInterval?.toFixed(2) || 1.0}s`);
  }

  _startWaveWithEnemyTypes() {
    this._spawnQueue = this._spawner.generateWave(this._currentWave);

    const countMult = this._modifierSystem.getEnemyCountMultiplier();
    if (countMult !== 1.0) {
      const newCount = Math.floor(this._spawnQueue.length * countMult);
      while (this._spawnQueue.length < newCount) {
        const randomEnemy = this._spawnQueue[Math.floor(Math.random() * this._spawnQueue.length)];
        this._spawnQueue.push({ ...randomEnemy });
      }
      this._enemiesRemaining = this._spawnQueue.length;
    } else {
      this._enemiesRemaining = this._spawnQueue.length;
    }

    this._waveData = {
      enemyCount: this._spawnQueue.length,
      spawnInterval: this._calculateSpawnInterval(this._currentWave),
      isBossWave: this._isBossWave,
      composition: this._spawner.getWaveSummary(this._currentWave)
    };

    const intervalMult = this._modifierSystem.getSpawnIntervalMultiplier();
    if (intervalMult !== 1.0) {
      this._waveData.spawnInterval *= intervalMult;
    }

    this._onWaveStartCallback?.(this._currentWave, this._waveData);
  }

  _startWaveLegacy() {
    this._waveData = getWaveData(this._currentWave);
    this._enemiesRemaining = this._waveData.enemyCount;
    this._spawnQueue = [];
    this._onWaveStartCallback?.(this._currentWave, this._waveData);
  }

  _calculateSpawnInterval(waveNumber) {
    return Math.max(0.5, 1.2 - (waveNumber - 1) * 0.05);
  }

  startWave(waveNumber) {
    this._currentWave = waveNumber - 1;
    this.startNextWave();
  }

  onEnemyRemoved() {
    this._enemiesRemaining--;
    console.log(`[WaveManager] Enemy removed, remaining: ${this._enemiesRemaining}`);

    const totalEnemies = this._waveData?.enemyCount || this._spawnQueue.length || this._enemiesSpawned;
    if (this._enemiesRemaining <= 0 && this._enemiesSpawned >= totalEnemies) {
      this._completeWave();
    }
  }

  update(dt) {
    if (!this._waveActive) return;

    this._spawner.update(dt);

    if (this._useEnemyTypes) {
      if (this._enemiesSpawned >= this._spawnQueue.length) {
        return;
      }
    } else if (this._waveData && this._enemiesSpawned >= this._waveData.enemyCount) {
      return;
    }

    this._spawnTimer += dt;
    const spawnInterval = this._waveData?.spawnInterval || 1.0;

    if (this._spawnTimer >= spawnInterval) {
      this._spawnEnemy();
      this._spawnTimer = 0;
    }
  }

  _spawnEnemy() {
    if (this._useEnemyTypes) {
      this._spawnEnemyFromQueue();
    } else {
      this._spawnEnemyLegacy();
    }
  }

  _spawnEnemyFromQueue() {
    if (this._enemiesSpawned >= this._spawnQueue.length) return;

    let enemyData = { ...this._spawnQueue[this._enemiesSpawned] };
    this._enemiesSpawned++;

    if (this._modifierSystem) {
      enemyData = this._modifierSystem.modifyEnemyData(enemyData, this._currentWave);
    }

    console.log(`[WaveManager] Spawning enemy ${this._enemiesSpawned}/${this._spawnQueue.length} (${enemyData.typeId})`);
    const enemy = this._spawner.spawnEnemy(enemyData);

    if (this._onSpawnEnemyCallback) {
      this._onSpawnEnemyCallback({ ...enemyData, enemy });
    }
  }

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
    this._onSpawnEnemyCallback?.(enemyData);
  }

  _completeWave() {
    this._waveActive = false;
    console.log(`[WaveManager] Wave ${this._currentWave} complete`);

    const reward = this._calculateWaveReward(this._currentWave);
    EventBus.emit('wave:completed', { waveIndex: this._currentWave, reward });
    this._onWaveCompleteCallback?.(this._currentWave);
  }

  _calculateWaveReward(waveIndex) {
    return 50 + (waveIndex * 10);
  }

  getActiveEnemies() {
    return this._spawner.getActiveEnemies();
  }

  getActiveEnemyCount() {
    return this._spawner.getActiveEnemyCount();
  }

  findEnemyAtPosition(position, radius) {
    return this._spawner.findEnemyAtPosition(position, radius);
  }

  findEnemiesInRadius(position, radius) {
    return this._spawner.findEnemiesInRadius(position, radius);
  }

  findFurthestEnemy() {
    return this._spawner.findFurthestEnemy();
  }

  applySlowInRadius(position, radius, factor, duration) {
    return this._spawner.applySlowInRadius(position, radius, factor, duration);
  }

  dealDamageInRadius(position, radius, damage) {
    return this._spawner.dealDamageInRadius(position, radius, damage);
  }

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

    this._spawner.reset();
    this._modifierSystem.setSchedule([]);

    console.log('[WaveManager] Reset');
  }

  setModifierSchedule(schedule) {
    this._modifierSchedule = schedule || [];
    this._modifierSystem.setSchedule(schedule);
  }

  getActiveModifier() {
    return this._currentModifier;
  }

  get modifierSystem() {
    return this._modifierSystem;
  }

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
