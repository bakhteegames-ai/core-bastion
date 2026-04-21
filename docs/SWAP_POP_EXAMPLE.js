/**
 * Swap & Pop Enemy Removal - Zero GC Pattern
 * 
 * This pattern avoids Array.splice() which causes:
 * 1. Array re-indexing (O(n) operation)
 * 2. Potential GC pressure from internal array reallocation
 */

// ============================================
// BEFORE (Bad - triggers GC during gameplay)
// ============================================
_onEnemyDeath_BAD(enemy) {
  // ... reward logic ...
  
  const index = this.enemies.indexOf(enemy);
  if (index !== -1) {
    this.enemies.splice(index, 1); // BAD: O(n), may trigger GC
  }
  
  enemy.destroy(); // BAD: creates GC work
}

// ============================================
// AFTER (Good - O(1), no GC)
// ============================================
_onEnemyDeath_GOOD(enemy) {
  // ... reward logic ...
  
  const index = this.enemies.indexOf(enemy);
  if (index !== -1) {
    // SWAP & POP - O(1) removal
    const lastEnemy = this.enemies[this.enemies.length - 1];
    this.enemies[index] = lastEnemy;
    this.enemies.pop();
  }
  
  // Return to pool instead of destroy
  if (this.enemyPool) {
    this.enemyPool.release(enemy);
  } else {
    enemy.entity.enabled = false;
  }
}

// ============================================
// Full EnemyManager Implementation with Pool
// ============================================
export class EnemyManager {
  constructor(app, sceneFactory, assetLoader) {
    this.app = app;
    this.sceneFactory = sceneFactory;
    this.assetLoader = assetLoader;
    
    // Pre-allocate vectors (NO new Vec3 in update!)
    this._tempPos = new pc.Vec3();
    this._tempDir = new pc.Vec3();
    
    // Enemy pool - warmup during BUILD_PHASE
    this.enemyPool = null;
    this.activeEnemies = []; // Track active enemies
    
    // Create parent entity for all enemies
    this.enemiesParent = new pc.Entity('Enemies');
    this.app.root.addChild(this.enemiesParent);
  }
  
  /**
   * Initialize pool during BUILD_PHASE warmup
   */
  initializePool(initialSize = 50, maxSize = 200) {
    this.enemyPool = new EntityPool(
      this.app,
      () => this._createEnemyEntity(),
      (e) => this._resetEnemyEntity(e),
      this.enemiesParent,
      initialSize,
      maxSize
    );
    
    console.log(`[EnemyManager] Pool initialized: ${initialSize} pre-allocated`);
  }
  
  /**
   * Spawn enemy from pool (called by WaveManager)
   */
  spawnEnemy(enemyData, waveNumber) {
    if (!this.enemyPool) {
      console.error('[EnemyManager] Pool not initialized!');
      return null;
    }
    
    const spawnPos = this._getSpawnPosition();
    const enemy = this.enemyPool.get({
      typeId: enemyData.typeId || 'grunt',
      hp: enemyData.hp,
      speed: enemyData.speed,
      goldReward: enemyData.goldReward,
      waveNumber: waveNumber
    }, spawnPos);
    
    if (enemy) {
      this.activeEnemies.push(enemy);
      EventBus.emit(GameEvents.ENEMY_SPAWNED, { 
        enemy: enemy, 
        position: spawnPos 
      });
    }
    
    return enemy;
  }
  
  /**
   * Remove enemy using swap-pop (called on death or reach base)
   */
  removeEnemy(enemy) {
    const index = this.activeEnemies.indexOf(enemy);
    if (index !== -1) {
      // SWAP & POP - O(1)
      const last = this.activeEnemies[this.activeEnemies.length - 1];
      this.activeEnemies[index] = last;
      this.activeEnemies.pop();
      
      // Return to pool
      this.enemyPool.release(enemy);
    }
  }
  
  /**
   * Update all active enemies
   */
  update(dt) {
    // Pre-allocated vector for distance checks
    const checkPos = this._tempPos;
    const checkDir = this._tempDir;
    
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      
      if (enemy && enemy.isActive()) {
        enemy.update(dt);
        
        // Check if reached base
        if (enemy.hasReachedBase()) {
          this.removeEnemy(enemy);
          EventBus.emit(GameEvents.ENEMY_REACHED_BASE, { enemy });
        }
      }
    }
  }
  
  _createEnemyEntity() {
    // Create entity template (will be reused)
    const entity = new pc.Entity('Enemy');
    entity.addComponent('render', { type: 'box' });
    entity.enabled = false; // Hidden until activated
    return entity;
  }
  
  _resetEnemyEntity(entity) {
    // Reset entity state for reuse
    entity.setLocalPosition(0, 0, 0);
    entity.enabled = false;
  }
  
  _getSpawnPosition() {
    // Return spawn position from level data
    return { x: 0, y: 0, z: 0 };
  }
}
