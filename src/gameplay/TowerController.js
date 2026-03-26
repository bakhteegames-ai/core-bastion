import { TOWER_RANGE, TOWER_FIRE_RATE } from '../data/balance.js';

/**
 * TowerController
 * Manages tower targeting and firing logic.
 * Task 2.4: Tower Targeting
 * Task 2.5: Projectile firing
 */
export class TowerController {
  constructor(app, projectileController) {
    this.app = app;
    this.projectileController = projectileController;
    this.towers = []; // Array of tower data objects
  }

  /**
   * Register a tower for targeting control.
   * @param {object} towerData - { entity, slotId, position }
   */
  registerTower(towerData) {
    this.towers.push({
      entity: towerData.entity,
      slotId: towerData.slotId,
      position: towerData.position,
      target: null,
      range: TOWER_RANGE,
      fireRate: TOWER_FIRE_RATE,
      fireCooldown: 0, // Time until next shot
      onHitCallback: null
    });
    console.log(`[TowerController] Tower registered on slot ${towerData.slotId}`);
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
        this._fire(tower);
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
   */
  _fire(tower) {
    if (!tower.target || !this.projectileController) return;

    // Create projectile from tower position
    const startPos = {
      x: tower.position.x,
      y: tower.position.y + 0.5, // Slightly above tower
      z: tower.position.z
    };

    this.projectileController.createProjectile(
      startPos,
      tower.target,
      tower.onHitCallback
    );

    console.log(`[TowerController] Tower on slot ${tower.slotId} fired`);
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
