import * as pc from 'playcanvas';
import {
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME_MAX,
  PROJECTILE_HIT_RADIUS,
  TOWER_DAMAGE
} from '../data/balance.js';

/**
 * ProjectileController
 * Manages projectile creation, movement, and hit detection.
 * Task 2.5: Projectile and Hit Logic
 */
export class ProjectileController {
  constructor(app) {
    this.app = app;
    this.projectiles = [];
    this._onHitCallback = null; // External callback for hit effects (audio, VFX)
  }

  /**
   * Set callback for when a projectile hits.
   * @param {Function} callback - Function(position, target)
   */
  setOnHitCallback(callback) {
    this._onHitCallback = callback;
  }

  /**
   * Create a new projectile.
   * @param {object} startPosition - { x, y, z }
   * @param {EnemyAgent} target - The target enemy
   * @param {Function} onHitCallback - Called when projectile hits (enemy, damage)
   * @returns {object} The projectile data
   */
  createProjectile(startPosition, target, onHitCallback) {
    const entity = new pc.Entity('Projectile');

    // Visual: small bright pulse (per §7.5)
    entity.addComponent('render', {
      type: 'sphere'
    });

    entity.setLocalPosition(startPosition.x, startPosition.y, startPosition.z);
    entity.setLocalScale(0.2, 0.2, 0.2);

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.9, 0.95, 1.0); // Bright white/cyan
    material.emissive = new pc.Color(0.5, 0.7, 0.9);
    material.update();
    entity.render.material = material;

    this.app.root.addChild(entity);

    const projectile = {
      entity: entity,
      target: target,
      speed: PROJECTILE_SPEED,
      lifetime: 0,
      maxLifetime: PROJECTILE_LIFETIME_MAX,
      hitRadius: PROJECTILE_HIT_RADIUS,
      damage: TOWER_DAMAGE,
      onHitCallback: onHitCallback,
      isActive: true
    };

    this.projectiles.push(projectile);
    return projectile;
  }

  /**
   * Update all projectiles.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];

      if (!projectile.isActive) {
        this._destroyProjectile(i);
        continue;
      }

      // Update lifetime
      projectile.lifetime += dt;

      // Check timeout
      if (projectile.lifetime >= projectile.maxLifetime) {
        console.log('[ProjectileController] Projectile timed out');
        this._destroyProjectile(i);
        continue;
      }

      // Check if target is still valid
      const target = projectile.target;
      if (!target || !target.isActive || target.isDead()) {
        console.log('[ProjectileController] Target invalid, destroying projectile');
        this._destroyProjectile(i);
        continue;
      }

      // Move projectile towards target
      const hit = this._moveProjectile(projectile, dt);

      if (hit) {
        // Deal damage
        target.takeDamage(projectile.damage);
        console.log(`[ProjectileController] Hit! Dealt ${projectile.damage} damage`);

        // Callback
        if (projectile.onHitCallback) {
          projectile.onHitCallback(target, projectile.damage);
        }
        
        // External hit callback (for audio/VFX)
        if (this._onHitCallback) {
          const pos = entity.getLocalPosition();
          this._onHitCallback({ x: pos.x, y: pos.y, z: pos.z }, target);
        }

        this._destroyProjectile(i);
      }
    }
  }

  /**
   * Move projectile towards target and check for hit.
   * @returns {boolean} true if hit
   */
  _moveProjectile(projectile, dt) {
    const entity = projectile.entity;
    const target = projectile.target;

    if (!entity || !target) return false;

    const targetPos = target.position;
    if (!targetPos) return false;

    const currentPos = entity.getLocalPosition();

    // Calculate direction to target
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const dz = targetPos.z - currentPos.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    // Check hit (distance-based hit check per §6.8)
    if (distance <= projectile.hitRadius) {
      return true;
    }

    // Move towards target
    const moveDistance = projectile.speed * dt;
    const ratio = Math.min(moveDistance / distance, 1);

    const newX = currentPos.x + dx * ratio;
    const newY = currentPos.y + dy * ratio;
    const newZ = currentPos.z + dz * ratio;

    entity.setLocalPosition(newX, newY, newZ);

    return false;
  }

  /**
   * Destroy a projectile.
   */
  _destroyProjectile(index) {
    const projectile = this.projectiles[index];
    if (projectile && projectile.entity) {
      projectile.entity.destroy();
    }
    this.projectiles.splice(index, 1);
  }

  /**
   * Destroy all projectiles.
   */
  destroyAll() {
    for (const projectile of this.projectiles) {
      if (projectile.entity) {
        projectile.entity.destroy();
      }
    }
    this.projectiles = [];
  }

  /**
   * Clear all projectiles (alias for destroyAll).
   */
  clearProjectiles() {
    this.destroyAll();
  }

  /**
   * Get active projectile count.
   */
  getCount() {
    return this.projectiles.length;
  }
}
