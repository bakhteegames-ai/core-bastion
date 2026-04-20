import * as pc from 'playcanvas';
import { getTowerType } from '../data/towerTypes.js';
import {
  PROJECTILE_SPEED,
  PROJECTILE_LIFETIME_MAX,
  PROJECTILE_HIT_RADIUS
} from '../data/balance.js';
import { EntityPool } from './ObjectPool.js';

/**
 * ProjectileController
 * Manages projectile creation, movement, and hit detection.
 * Task 2.5: Projectile and Hit Logic
 * Task 4-a: Tower Types Integration
 * OPTIMIZATION: Uses EntityPool for projectile reuse (reduces GC pressure)
 */
export class ProjectileController {
  constructor(app) {
    this.app = app;
    this.projectiles = [];
    this._onHitCallback = null; // External callback for hit effects (audio, VFX)
    
    // Initialize projectile entity pool
    this.projectilePool = new EntityPool(
      app,
      (typeId, isCrit) => this._createPooledProjectileEntity(typeId, isCrit),
      (entity) => this._resetPooledProjectileEntity(entity),
      null, // No parent - will be added to root when active
      30,   // Initial size
      100   // Max size
    );
    
    console.log('[ProjectileController] Initialized with EntityPool');
  }

  /**
   * Set callback for when a projectile hits.
   * @param {Function} callback - Function(position, target, options)
   */
  setOnHitCallback(callback) {
    this._onHitCallback = callback;
  }

  /**
   * Create a new projectile.
   * @param {object} startPosition - { x, y, z }
   * @param {EnemyAgent} target - The target enemy
   * @param {object} options - Projectile options
   * @returns {object|null} The projectile data or null for instant effects
   */
  createProjectile(startPosition, target, options = {}) {
    const {
      typeId = 'archer',
      damage = 10,
      onHitCallback = null,
      splashRadius = 0,
      splashFalloff = 0.5,
      slowFactor = 0,
      slowDuration = 0,
      chainCount = 0,
      chainDecay = 0.7,
      isCrit = false,
      speed = null,
      enemies = []
    } = options;

    const towerType = getTowerType(typeId);
    const projectileSpeed = speed || towerType.projectileSpeed || PROJECTILE_SPEED;

    // LIGHTNING: Instant chain damage, no projectile entity
    if (typeId === 'lightning') {
      this._applyChainLightning(target, damage, chainCount || 3, chainDecay || 0.7, startPosition);
      
      // Visual effect for lightning
      this._createLightningEffect(startPosition, target.position);
      
      // Callbacks
      if (onHitCallback) {
        onHitCallback(target, damage);
      }
      if (this._onHitCallback) {
        this._onHitCallback(startPosition, target, { typeId, isChain: true });
      }
      
      return null;
    }

    // Create projectile entity from pool for other types
    const entity = this.projectilePool.get({ typeId, isCrit }, startPosition);
    
    if (!entity) {
      console.warn('[ProjectileController] Pool exhausted, falling back to direct creation');
      // Fallback: create directly if pool is exhausted
      const fallbackEntity = this._createProjectileEntity(startPosition, typeId, isCrit);
      return this._createProjectileData(fallbackEntity, target, projectileSpeed, damage, onHitCallback, 
        splashRadius, splashFalloff, slowFactor, slowDuration, chainCount, chainDecay, isCrit, enemies, typeId);
    }

    return this._createProjectileData(entity, target, projectileSpeed, damage, onHitCallback, 
      splashRadius, splashFalloff, slowFactor, slowDuration, chainCount, chainDecay, isCrit, enemies, typeId);
  }

  /**
   * Create projectile data object.
   * @private
   */
  _createProjectileData(entity, target, speed, damage, onHitCallback, splashRadius, splashFalloff, 
                        slowFactor, slowDuration, chainCount, chainDecay, isCrit, enemies, typeId) {
    const projectile = {
      entity: entity,
      target: target,
      speed: speed,
      lifetime: 0,
      maxLifetime: PROJECTILE_LIFETIME_MAX,
      hitRadius: PROJECTILE_HIT_RADIUS,
      damage: damage,
      onHitCallback: onHitCallback,
      isActive: true,
      // Type-specific properties
      typeId: typeId,
      splashRadius: splashRadius,
      splashFalloff: splashFalloff,
      slowFactor: slowFactor,
      slowDuration: slowDuration,
      chainCount: chainCount,
      chainDecay: chainDecay,
      isCrit: isCrit,
      enemies: enemies
    };

    this.projectiles.push(projectile);
    return projectile;
  }

  /**
   * Create a projectile entity with type-specific visuals (for fallback).
   */
  _createProjectileEntity(startPosition, typeId, isCrit = false) {
    const entity = new pc.Entity(`Projectile_${typeId}`);
    const towerType = getTowerType(typeId);
    const color = towerType.color || { r: 0.9, g: 0.95, b: 1.0 };

    // Different shapes for different tower types
    switch (typeId) {
      case 'cannon':
        // Larger, slower cannonball
        entity.addComponent('render', { type: 'sphere' });
        entity.setLocalScale(0.35, 0.35, 0.35);
        break;
        
      case 'ice':
        // Ice shard (elongated diamond)
        entity.addComponent('render', { type: 'cone' });
        entity.setLocalScale(0.25, 0.4, 0.25);
        entity.setLocalEulerAngles(180, 0, 0);
        break;
        
      case 'sniper':
        // Fast, thin projectile
        entity.addComponent('render', { type: 'cylinder' });
        entity.setLocalScale(0.1, 0.5, 0.1);
        entity.setLocalEulerAngles(90, 0, 0);
        break;
        
      case 'archer':
      default:
        // Standard arrow projectile
        entity.addComponent('render', { type: 'sphere' });
        entity.setLocalScale(0.2, 0.2, 0.2);
        break;
    }

    entity.setLocalPosition(startPosition.x, startPosition.y, startPosition.z);

    // Material based on tower type
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(color.r, color.g, color.b);
    material.emissive = new pc.Color(color.r * 0.5, color.g * 0.5, color.b * 0.5);
    
    // Crit glow
    if (isCrit) {
      material.emissive = new pc.Color(1, 0.8, 0.2);
      material.diffuse = new pc.Color(1, 0.9, 0.5);
    }
    
    material.update();
    entity.render.material = material;

    this.app.root.addChild(entity);
    return entity;
  }

  /**
   * Create a pooled projectile entity with type-specific visuals.
   * Optimized for EntityPool reuse.
   * @private
   */
  _createPooledProjectileEntity(typeId, isCrit = false) {
    const entity = new pc.Entity(`Projectile_Pooled_${typeId}`);
    const towerType = getTowerType(typeId);
    const color = towerType.color || { r: 0.9, g: 0.95, b: 1.0 };

    // Different shapes for different tower types
    switch (typeId) {
      case 'cannon':
        entity.addComponent('render', { type: 'sphere' });
        entity.setLocalScale(0.35, 0.35, 0.35);
        break;
        
      case 'ice':
        entity.addComponent('render', { type: 'cone' });
        entity.setLocalScale(0.25, 0.4, 0.25);
        entity.setLocalEulerAngles(180, 0, 0);
        break;
        
      case 'sniper':
        entity.addComponent('render', { type: 'cylinder' });
        entity.setLocalScale(0.1, 0.5, 0.1);
        entity.setLocalEulerAngles(90, 0, 0);
        break;
        
      case 'archer':
      default:
        entity.addComponent('render', { type: 'sphere' });
        entity.setLocalScale(0.2, 0.2, 0.2);
        break;
    }

    // Material based on tower type
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(color.r, color.g, color.b);
    material.emissive = new pc.Color(color.r * 0.5, color.g * 0.5, color.b * 0.5);
    
    // Store original colors for reset
    entity._originalDiffuse = new pc.Color(color.r, color.g, color.b);
    entity._originalEmissive = new pc.Color(color.r * 0.5, color.g * 0.5, color.b * 0.5);
    
    // Crit glow
    if (isCrit) {
      material.emissive = new pc.Color(1, 0.8, 0.2);
      material.diffuse = new pc.Color(1, 0.9, 0.5);
      entity._critDiffuse = new pc.Color(1, 0.9, 0.5);
      entity._critEmissive = new pc.Color(1, 0.8, 0.2);
    }
    
    material.update();
    entity.render.material = material;
    
    // Initially disabled
    entity.enabled = false;

    return entity;
  }

  /**
   * Reset a pooled projectile entity for reuse.
   * @private
   */
  _resetPooledProjectileEntity(entity) {
    if (!entity) return;
    
    // Reset position
    entity.setLocalPosition(0, 0, 0);
    
    // Reset rotation
    entity.setLocalEulerAngles(0, 0, 0);
    
    // Restore original material colors
    const material = entity.render.material;
    if (entity._originalDiffuse && entity._originalEmissive) {
      material.diffuse = entity._originalDiffuse.clone();
      material.emissive = entity._originalEmissive.clone();
      material.update();
    }
    
    // Disable entity
    entity.enabled = false;
  }

  /**
   * Create a visual lightning effect.
   */
  _createLightningEffect(startPos, endPos) {
    // Create a series of small spheres to simulate lightning
    const segments = 5;
    const lightningEntities = [];
    
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startPos.x + (endPos.x - startPos.x) * t;
      const y = startPos.y + (endPos.y - startPos.y) * t;
      const z = startPos.z + (endPos.z - startPos.z) * t;
      
      // Add some randomness for lightning jaggedness
      const jitter = i > 0 && i < segments ? (Math.random() - 0.5) * 0.3 : 0;
      
      const entity = new pc.Entity(`LightningSegment_${i}`);
      entity.addComponent('render', { type: 'sphere' });
      entity.setLocalPosition(x + jitter, y + jitter, z);
      entity.setLocalScale(0.15, 0.15, 0.15);
      
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.6, 0.3, 0.9);
      material.emissive = new pc.Color(1, 0.7, 1);
      material.update();
      entity.render.material = material;
      
      this.app.root.addChild(entity);
      lightningEntities.push(entity);
    }
    
    // Remove after short delay
    setTimeout(() => {
      lightningEntities.forEach(e => e.destroy());
    }, 100);
  }

  /**
   * Apply chain lightning damage.
   */
  _applyChainLightning(startEnemy, damage, chainCount, decay, origin) {
    const hitEnemies = new Set();
    let currentEnemy = startEnemy;
    let currentDamage = damage;
    let lastPosition = origin;

    for (let i = 0; i < chainCount && currentEnemy; i++) {
      if (!currentEnemy.isActive || currentEnemy.isDead()) {
        // Find next target
        currentEnemy = this._findNextChainTarget(lastPosition, hitEnemies, currentEnemy);
        continue;
      }

      // Apply damage
      currentEnemy.takeDamage(Math.round(currentDamage));
      hitEnemies.add(currentEnemy);
      
      console.log(`[ProjectileController] Chain lightning hit ${i + 1}: ${Math.round(currentDamage)} damage`);

      // Find next target
      lastPosition = currentEnemy.position;
      currentEnemy = this._findNextChainTarget(lastPosition, hitEnemies, currentEnemy);
      
      // Decay damage
      currentDamage *= decay;
    }
  }

  /**
   * Find next target for chain lightning.
   */
  _findNextChainTarget(position, excludedEnemies, currentEnemy) {
    if (!this.projectiles.length) return null;
    
    // Get enemies from the most recent projectile's options
    const latestProjectile = this.projectiles[this.projectiles.length - 1];
    const enemies = latestProjectile?.enemies || [];
    
    let nearestEnemy = null;
    let nearestDistance = 5.0; // Max chain range

    for (const enemy of enemies) {
      if (!enemy || !enemy.isActive || enemy.isDead()) continue;
      if (excludedEnemies.has(enemy)) continue;

      const enemyPos = enemy.position;
      if (!enemyPos) continue;

      const dx = enemyPos.x - position.x;
      const dz = enemyPos.z - position.z;
      const distance = Math.sqrt(dx * dx + dz * dz);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestEnemy = enemy;
      }
    }

    return nearestEnemy;
  }

  /**
   * Apply splash damage in radius.
   */
  _applySplashDamage(position, radius, damage, falloff, enemies, primaryTarget) {
    let hitCount = 0;

    for (const enemy of enemies) {
      if (!enemy || !enemy.isActive || enemy.isDead()) continue;

      const enemyPos = enemy.position;
      if (!enemyPos) continue;

      const dx = enemyPos.x - position.x;
      const dy = enemyPos.y - position.y;
      const dz = enemyPos.z - position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= radius) {
        // Calculate damage with falloff
        const distanceRatio = distance / radius;
        const damageMultiplier = 1 - (distanceRatio * falloff);
        const actualDamage = Math.round(damage * damageMultiplier);

        enemy.takeDamage(actualDamage);
        hitCount++;
      }
    }

    console.log(`[ProjectileController] Splash damage hit ${hitCount} enemies`);
  }

  /**
   * Apply slow effect to enemy.
   */
  _applySlow(enemy, factor, duration) {
    if (enemy.applySlow && typeof enemy.applySlow === 'function') {
      enemy.applySlow(factor, duration);
    } else {
      // Direct slow application if method exists
      if (enemy._speed !== undefined) {
        const originalSpeed = enemy._originalSpeed || enemy._speed;
        enemy._originalSpeed = originalSpeed;
        enemy._speed = originalSpeed * factor;
        
        // Reset after duration
        setTimeout(() => {
          if (enemy._originalSpeed) {
            enemy._speed = enemy._originalSpeed;
          }
        }, duration * 1000);
      }
    }
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
        this._handleHit(projectile, i);
      }
    }
  }

  /**
   * Handle projectile hit.
   */
  _handleHit(projectile, index) {
    const target = projectile.target;
    const pos = projectile.entity ? projectile.entity.getLocalPosition() : projectile.target.position;

    // Apply base damage
    target.takeDamage(projectile.damage);
    console.log(`[ProjectileController] Hit! Dealt ${projectile.damage} damage (${projectile.typeId})${projectile.isCrit ? ' CRIT!' : ''}`);

    // Apply type-specific effects
    if (projectile.splashRadius > 0 && projectile.enemies) {
      // Cannon splash damage
      this._applySplashDamage(
        { x: pos.x, y: pos.y, z: pos.z },
        projectile.splashRadius,
        projectile.damage,
        projectile.splashFalloff,
        projectile.enemies,
        target
      );
    }

    if (projectile.slowFactor > 0) {
      // Ice slow effect
      this._applySlow(target, projectile.slowFactor, projectile.slowDuration);
    }

    // Callbacks
    if (projectile.onHitCallback) {
      projectile.onHitCallback(target, projectile.damage);
    }

    // External hit callback (for audio/VFX)
    if (this._onHitCallback) {
      this._onHitCallback(
        { x: pos.x, y: pos.y, z: pos.z },
        target,
        {
          typeId: projectile.typeId,
          isCrit: projectile.isCrit,
          splashRadius: projectile.splashRadius
        }
      );
    }

    this._destroyProjectile(index);
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
   * Destroy a projectile and return it to the pool.
   */
  _destroyProjectile(index) {
    const projectile = this.projectiles[index];
    if (projectile && projectile.entity) {
      // Return entity to pool instead of destroying
      this.projectilePool.release(projectile.entity);
    }
    this.projectiles.splice(index, 1);
  }

  /**
   * Destroy all projectiles and return them to the pool.
   */
  destroyAll() {
    for (const projectile of this.projectiles) {
      if (projectile.entity) {
        this.projectilePool.release(projectile.entity);
      }
    }
    this.projectiles = [];
  }
  
  /**
   * Get pool statistics for debugging.
   */
  getPoolStats() {
    if (this.projectilePool) {
      return this.projectilePool.getStats();
    }
    return null;
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
