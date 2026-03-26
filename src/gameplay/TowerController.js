import { TOWER_RANGE } from '../data/balance.js';

/**
 * TowerController
 * Manages tower targeting logic.
 * Task 2.4: Tower Targeting
 */
export class TowerController {
  constructor(app) {
    this.app = app;
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
      range: TOWER_RANGE
    });
    console.log(`[TowerController] Tower registered on slot ${towerData.slotId}`);
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
   * Update all towers - find targets and rotate towards them.
   * @param {EnemyAgent[]} enemies - Array of active enemy agents
   */
  update(enemies) {
    this.towers.forEach(tower => {
      this._updateTowerTarget(tower, enemies);
    });
  }

  /**
   * Update a single tower's target.
   */
  _updateTowerTarget(tower, enemies) {
    // Find nearest valid target
    const newTarget = this._findNearestEnemy(tower, enemies);

    // Update target
    tower.target = newTarget;

    // Rotate tower towards target if we have one
    if (tower.target && tower.target.isActive && tower.entity) {
      this._rotateTowardsTarget(tower);
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
   * Per §17.5: Tower Rotation: instant snap to target
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

    // Convert to degrees and set rotation (Y-axis rotation)
    const angleDegrees = -angle * (180 / Math.PI);

    // Instant snap rotation
    tower.entity.setLocalEulerAngles(0, angleDegrees, 0);
  }

  /**
   * Get a tower's current target.
   * @param {string} slotId
   * @returns {EnemyAgent|null}
   */
  getTowerTarget(slotId) {
    const tower = this.towers.find(t => t.slotId === slotId);
    return tower ? tower.target : null;
  }

  /**
   * Get all towers with their current targets.
   */
  getTowers() {
    return this.towers;
  }

  /**
   * Clear all towers.
   */
  clear() {
    this.towers = [];
  }
}
