import { getTowerType, getTowerStats } from '../data/towerTypes.js';

/**
 * TowerController
 * Manages tower targeting and firing logic.
 * Task 2.4: Tower Targeting
 * Task 2.5: Projectile firing
 * Task 4-a: Tower Types Integration
 */
export class TowerController {
  constructor(app, projectileController) {
    this.app = app;
    this.projectileController = projectileController;
    this.towers = []; // Array of tower data objects
    this._onFireCallback = null; // Callback for audio/VFX when tower fires
  }
  
  /**
   * Set callback for when a tower fires.
   * @param {Function} callback - Function(towerPosition)
   */
  setOnFireCallback(callback) {
    this._onFireCallback = callback;
  }

  /**
   * Register a tower for targeting control.
   * @param {object} towerData - { entity, slotId, position, typeId?, level? }
   */
  registerTower(towerData) {
    const typeId = towerData.typeId || 'archer';
    const level = towerData.level || 1;
    const towerType = getTowerType(typeId);
    const stats = getTowerStats(typeId, level);
    
    this.towers.push({
      entity: towerData.entity,
      slotId: towerData.slotId,
      position: towerData.position,
      typeId: typeId,
      level: level,
      target: null,
      range: stats.range,
      damage: stats.damage,
      fireRate: stats.fireRate,
      fireCooldown: 0,
      onHitCallback: null,
      // Special properties
      splashRadius: towerType.splashRadius || 0,
      splashFalloff: towerType.splashFalloff || 0.5,
      slowFactor: towerType.slowFactor || 0,
      slowDuration: towerType.slowDuration || 0,
      chainCount: towerType.chainCount || 0,
      chainDecay: towerType.chainDecay || 0.7,
      critChance: towerType.critChance || 0,
      critMultiplier: towerType.critMultiplier || 2.0,
      projectileSpeed: stats.projectileSpeed
    });
    console.log(`[TowerController] Tower registered on slot ${towerData.slotId} (type: ${typeId}, level: ${level})`);
  }

  /**
   * Set callback for when a tower hits an enemy.
   * @param {Function} callback - Function(enemy, damage)
   */
  setOnHitCallback(callback) {
    this.towers.forEach(tower => {
      tower.onHitCallback = callback;
    });
  }

  /**
   * Unregister a tower.
   * @param {string} slotId
   */
  unregisterTower(slotId) {
    const index = this.towers.findIndex(t => t.slotId === slotId);
    if (index !== -1) {
      this.towers.splice(index, 1);
      console.log(`[TowerController] Tower unregistered from slot ${slotId}`);
    }
  }

  /**
   * Update all towers - find targets, rotate, and fire.
   * @param {EnemyAgent[]} enemies - Array of active enemy agents
   * @param {number} dt - Delta time in seconds
   */
  update(enemies, dt) {
    this.towers.forEach(tower => {
      this._updateTower(tower, enemies, dt);
    });
  }

  /**
   * Update a single tower.
   */
  _updateTower(tower, enemies, dt) {
    // Update cooldown
    if (tower.fireCooldown > 0) {
      tower.fireCooldown -= dt;
    }

    // Find and update target
    const newTarget = this._findNearestEnemy(tower, enemies);
    tower.target = newTarget;

    // Rotate towards target if we have one
    if (tower.target && tower.target.isActive && tower.entity) {
      this._rotateTowardsTarget(tower);

      // Fire if cooldown is ready
      if (tower.fireCooldown <= 0) {
        this._fire(tower, enemies);
        tower.fireCooldown = 1 / tower.fireRate; // Reset cooldown
      }
    }
  }

  /**
   * Find the nearest enemy within range.
   * @returns {EnemyAgent|null}
   */
  _findNearestEnemy(tower, enemies) {
    let nearestEnemy = null;
    let nearestDistance = Infinity;

    for (const enemy of enemies) {
      // Skip invalid enemies
      if (!enemy || !enemy.isActive || enemy.isDead()) {
        continue;
      }

      const enemyPos = enemy.position;
      if (!enemyPos) continue;

      // Calculate distance
      const dx = enemyPos.x - tower.position.x;
      const dz = enemyPos.z - tower.position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      // Check if in range and closer than current nearest
      if (distance <= tower.range && distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    return nearestEnemy;
  }

  /**
   * Instantly rotate tower to face target.
   */
  _rotateTowardsTarget(tower) {
    const target = tower.target;
    if (!target || !target.position) return;

    const targetPos = target.position;
    const towerPos = tower.position;

    // Calculate angle to target
    const dx = targetPos.x - towerPos.x;
    const dz = targetPos.z - towerPos.z;
    const angle = Math.atan2(dx, dz);

    // Convert to degrees and set rotation
    const angleDegrees = -angle * (180 / Math.PI);
    tower.entity.setLocalEulerAngles(0, angleDegrees, 0);
  }

  /**
   * Fire a projectile at the current target.
   * @param {object} tower - Tower data
   * @param {EnemyAgent[]} enemies - All active enemies (for AOE/chain)
   */
  _fire(tower, enemies) {
    if (!tower.target || !this.projectileController) return;

    // Create projectile from tower position
    const startPos = {
      x: tower.position.x,
      y: tower.position.y + 0.5, // Slightly above tower
      z: tower.position.z
    };

    // Calculate damage (with crit for sniper)
    let damage = tower.damage;
    let isCrit = false;
    if (tower.critChance > 0 && Math.random() < tower.critChance) {
      damage = Math.round(damage * tower.critMultiplier);
      isCrit = true;
      console.log(`[TowerController] CRITICAL HIT! ${damage} damage`);
    }

    // Create projectile with tower type options
    this.projectileController.createProjectile(
      startPos,
      tower.target,
      {
        typeId: tower.typeId,
        damage: damage,
        onHitCallback: tower.onHitCallback,
        splashRadius: tower.splashRadius,
        splashFalloff: tower.splashFalloff,
        slowFactor: tower.slowFactor,
        slowDuration: tower.slowDuration,
        chainCount: tower.chainCount,
        chainDecay: tower.chainDecay,
        isCrit: isCrit,
        speed: tower.projectileSpeed,
        enemies: enemies // For AOE and chain lightning
      }
    );
    
    // Fire callback for audio
    if (this._onFireCallback) {
      this._onFireCallback(tower.position);
    }

    console.log(`[TowerController] Tower on slot ${tower.slotId} fired (${tower.typeId})`);
  }

  /**
   * Upgrade a tower's level.
   * @param {string} slotId
   * @returns {boolean} - true if upgraded successfully
   */
  upgradeTower(slotId) {
    const tower = this.towers.find(t => t.slotId === slotId);
    if (!tower || tower.level >= 5) {
      console.log(`[TowerController] Cannot upgrade tower on slot ${slotId}`);
      return false;
    }

    tower.level++;
    const newStats = getTowerStats(tower.typeId, tower.level);
    
    // Update tower stats
    tower.range = newStats.range;
    tower.damage = newStats.damage;
    tower.fireRate = newStats.fireRate;
    tower.projectileSpeed = newStats.projectileSpeed;

    console.log(`[TowerController] Tower on slot ${slotId} upgraded to level ${tower.level}`);
    return true;
  }

  /**
   * Get tower data by slot ID.
   * @param {string} slotId
   * @returns {object|null}
   */
  getTower(slotId) {
    return this.towers.find(t => t.slotId === slotId) || null;
  }

  /**
   * Get a tower's current target.
   */
  getTowerTarget(slotId) {
    const tower = this.towers.find(t => t.slotId === slotId);
    return tower ? tower.target : null;
  }

  /**
   * Get all towers.
   */
  getTowers() {
    return this.towers;
  }

  /**
   * Clear all towers (unregister, don't destroy entities).
   */
  clear() {
    this.towers = [];
  }

  /**
   * Clear all towers (alias for clear).
   */
  clearTowers() {
    this.clear();
  }
}
