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
    this._onHitCallback = null;

    this.projectilePool = new EntityPool(
      app,
      () => this._createPooledProjectileEntity(),
      (entity) => this._resetPooledProjectileEntity(entity),
      this.app.root,
      30,
      100
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

    if (typeId === 'lightning') {
      this._applyChainLightning(target, damage, chainCount || 3, chainDecay || 0.7, startPosition);
      this._createLightningEffect(startPosition, target.position);

      if (onHitCallback) {
        onHitCallback(target, damage);
      }
      if (this._onHitCallback) {
        this._onHitCallback(target.position, target, { typeId, isChain: true });
      }

      return null;
    }

    const entity = this.projectilePool.get({ typeId, isCrit }, startPosition);

    if (!entity) {
      console.warn('[ProjectileController] Pool exhausted, falling back to direct creation');
      const fallbackEntity = this._createProjectileEntity(startPosition, typeId, isCrit);
      return this._createProjectileData(
        fallbackEntity,
        target,
        projectileSpeed,
        damage,
        onHitCallback,
        splashRadius,
        splashFalloff,
        slowFactor,
        slowDuration,
        chainCount,
        chainDecay,
        isCrit,
        enemies,
        typeId
      );
    }

    return this._createProjectileData(
      entity,
      target,
      projectileSpeed,
      damage,
      onHitCallback,
      splashRadius,
      splashFalloff,
      slowFactor,
      slowDuration,
      chainCount,
      chainDecay,
      isCrit,
      enemies,
      typeId
    );
  }

  /**
   * Create projectile data object.
   * @private
   */
  _createProjectileData(
    entity,
    target,
    speed,
    damage,
    onHitCallback,
    splashRadius,
    splashFalloff,
    slowFactor,
    slowDuration,
    chainCount,
    chainDecay,
    isCrit,
    enemies,
    typeId
  ) {
    const projectile = {
      entity,
      target,
      speed,
      lifetime: 0,
      maxLifetime: PROJECTILE_LIFETIME_MAX,
      hitRadius: PROJECTILE_HIT_RADIUS,
      damage,
      onHitCallback,
      isActive: true,
      typeId,
      splashRadius,
      splashFalloff,
      slowFactor,
      slowDuration,
      chainCount,
      chainDecay,
      isCrit,
      enemies,
      visualRoll: 0
    };

    this.projectiles.push(projectile);
    return projectile;
  }

  /**
   * Create a projectile entity with type-specific visuals (for fallback).
   */
  _createProjectileEntity(startPosition, typeId, isCrit = false) {
    const entity = this._createProjectileVisualEntity(`Projectile_${typeId}`);
    entity._fromPool = false;
    this._configureProjectileEntity(entity, typeId, isCrit);
    entity.setLocalPosition(startPosition.x, startPosition.y, startPosition.z);
    this.app.root.addChild(entity);
    return entity;
  }

  /**
   * Create a pooled projectile entity with type-specific visuals.
   * Optimized for EntityPool reuse.
   * @private
   */
  _createPooledProjectileEntity() {
    const entity = this._createProjectileVisualEntity('Projectile_Pooled');
    entity._fromPool = true;
    entity.init = (initData = {}) => {
      this._configureProjectileEntity(entity, initData.typeId, initData.isCrit);
    };
    entity.enabled = false;
    return entity;
  }

  /**
   * Reset a pooled projectile entity for reuse.
   * @private
   */
  _resetPooledProjectileEntity(entity) {
    if (!entity) return;

    entity.setLocalPosition(0, 0, 0);
    entity.setLocalEulerAngles(0, 0, 0);
    entity._variantNodes?.forEach((node) => {
      node.enabled = false;
    });

    if (entity._trailNode) {
      entity._trailNode.enabled = false;
    }
    if (entity._haloNode) {
      entity._haloNode.enabled = false;
    }

    entity._spinSpeed = 0;
    entity.enabled = false;
  }

  /**
   * Create a visual lightning effect.
   */
  _createLightningEffect(startPos, endPos) {
    const segments = 6;
    const lightningEntities = [];
    const points = [{ x: startPos.x, y: startPos.y, z: startPos.z }];

    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      points.push({
        x: startPos.x + (endPos.x - startPos.x) * t + (Math.random() - 0.5) * 0.45,
        y: startPos.y + (endPos.y - startPos.y) * t + (Math.random() - 0.5) * 0.2,
        z: startPos.z + (endPos.z - startPos.z) * t + (Math.random() - 0.5) * 0.45
      });
    }

    points.push({ x: endPos.x, y: endPos.y, z: endPos.z });

    for (let i = 0; i < points.length - 1; i++) {
      const start = points[i];
      const end = points[i + 1];
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const segment = new pc.Entity(`LightningSegment_${i}`);
      segment.addComponent('render', { type: 'box' });
      segment.setLocalPosition(
        start.x + dx * 0.5,
        start.y + dy * 0.5,
        start.z + dz * 0.5
      );
      segment.setLocalScale(0.1, 0.1, length);
      segment.render.material = this._createLightningMaterial(0.9, 0.7);
      this._orientEntityToVector(segment, dx, dy, dz);
      this.app.root.addChild(segment);
      lightningEntities.push(segment);

      const node = new pc.Entity(`LightningNode_${i}`);
      node.addComponent('render', { type: 'sphere' });
      node.setLocalPosition(start.x, start.y, start.z);
      node.setLocalScale(0.18, 0.18, 0.18);
      node.render.material = this._createLightningMaterial(1.25, 0.88);
      this.app.root.addChild(node);
      lightningEntities.push(node);
    }

    const impactFlash = new pc.Entity('LightningImpact');
    impactFlash.addComponent('render', { type: 'sphere' });
    impactFlash.setLocalPosition(endPos.x, endPos.y, endPos.z);
    impactFlash.setLocalScale(0.28, 0.28, 0.28);
    impactFlash.render.material = this._createLightningMaterial(1.45, 0.95);
    this.app.root.addChild(impactFlash);
    lightningEntities.push(impactFlash);

    setTimeout(() => {
      lightningEntities.forEach((entity) => entity.destroy());
    }, 120);
  }

  _createLightningMaterial(emissiveStrength, opacity = 1) {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.82, 0.68, 1.0);
    material.emissive = new pc.Color(
      0.82 * emissiveStrength,
      0.68 * emissiveStrength,
      1.0 * emissiveStrength
    );
    material.opacity = opacity;
    if (opacity < 1) {
      material.blendType = pc.BLEND_NORMAL;
    }
    material.update();
    return material;
  }

  _createProjectileVisualEntity(name) {
    const entity = new pc.Entity(name);
    const core = this._createProjectilePart('Core', 'sphere');
    const shell = this._createProjectilePart('Shell', 'sphere');
    const dart = this._createProjectilePart('Dart', 'cylinder');
    const shard = this._createProjectilePart('Shard', 'cone');
    const trail = this._createProjectilePart('Trail', 'box');
    const halo = this._createProjectilePart('Halo', 'torus');

    dart.setLocalEulerAngles(90, 0, 0);
    shard.setLocalEulerAngles(90, 0, 180);
    halo.setLocalEulerAngles(90, 0, 0);

    entity.addChild(core);
    entity.addChild(shell);
    entity.addChild(dart);
    entity.addChild(shard);
    entity.addChild(trail);
    entity.addChild(halo);

    entity._coreNode = core;
    entity._shellNode = shell;
    entity._dartNode = dart;
    entity._shardNode = shard;
    entity._trailNode = trail;
    entity._haloNode = halo;
    entity._variantNodes = [core, shell, dart, shard];
    entity._spinSpeed = 0;

    return entity;
  }

  _createProjectilePart(name, type) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type });
    entity.render.material = this._createProjectileMaterial();
    entity.enabled = false;
    return entity;
  }

  _createProjectileMaterial() {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.8, 0.9, 1.0);
    material.emissive = new pc.Color(0.4, 0.5, 0.6);
    material.opacity = 1;
    material.update();
    return material;
  }

  _configureProjectileEntity(entity, typeId = 'archer', isCrit = false) {
    const towerType = getTowerType(typeId);
    const color = towerType.color || { r: 0.9, g: 0.95, b: 1.0 };

    entity._variantNodes.forEach((node) => {
      node.enabled = false;
      node.setLocalPosition(0, 0, 0);
      node.setLocalScale(0.2, 0.2, 0.2);
    });

    entity._trailNode.enabled = true;
    entity._haloNode.enabled = false;
    entity._spinSpeed = 0;

    switch (typeId) {
      case 'cannon':
        entity._coreNode.enabled = true;
        entity._shellNode.enabled = true;
        entity._trailNode.setLocalPosition(0, 0, -0.22);
        entity._trailNode.setLocalScale(0.14, 0.14, 0.34);
        entity._coreNode.setLocalScale(0.3, 0.3, 0.3);
        entity._shellNode.setLocalScale(0.44, 0.44, 0.44);
        entity._haloNode.enabled = true;
        entity._haloNode.setLocalScale(0.52, 0.52, 0.1);
        entity._spinSpeed = 120;
        this._setMaterialColor(entity._coreNode.render.material, color, 0.9);
        this._setMaterialColor(entity._shellNode.render.material, color, 0.35, 0.36);
        this._setMaterialColor(entity._trailNode.render.material, color, 0.5, 0.5);
        this._setMaterialColor(entity._haloNode.render.material, color, 0.6, 0.38);
        break;
      case 'ice':
        entity._shardNode.enabled = true;
        entity._shellNode.enabled = true;
        entity._shardNode.setLocalPosition(0, 0, 0.1);
        entity._shardNode.setLocalScale(0.22, 0.42, 0.22);
        entity._shellNode.setLocalScale(0.18, 0.18, 0.18);
        entity._trailNode.setLocalPosition(0, 0, -0.28);
        entity._trailNode.setLocalScale(0.1, 0.1, 0.46);
        entity._spinSpeed = 540;
        this._setMaterialColor(entity._shardNode.render.material, color, 1.0);
        this._setMaterialColor(entity._shellNode.render.material, color, 0.45, 0.45);
        this._setMaterialColor(entity._trailNode.render.material, color, 0.65, 0.58);
        break;
      case 'sniper':
        entity._dartNode.enabled = true;
        entity._shellNode.enabled = true;
        entity._dartNode.setLocalPosition(0, 0, 0.12);
        entity._dartNode.setLocalScale(0.08, 0.6, 0.08);
        entity._shellNode.setLocalScale(0.12, 0.12, 0.12);
        entity._trailNode.setLocalPosition(0, 0, -0.42);
        entity._trailNode.setLocalScale(0.06, 0.06, 0.95);
        this._setMaterialColor(entity._dartNode.render.material, color, 0.9);
        this._setMaterialColor(entity._shellNode.render.material, color, 0.45, 0.4);
        this._setMaterialColor(entity._trailNode.render.material, color, 0.8, 0.68);
        break;
      case 'archer':
      default:
        entity._coreNode.enabled = true;
        entity._shellNode.enabled = true;
        entity._coreNode.setLocalScale(0.18, 0.18, 0.18);
        entity._shellNode.setLocalScale(0.24, 0.24, 0.24);
        entity._trailNode.setLocalPosition(0, 0, -0.3);
        entity._trailNode.setLocalScale(0.08, 0.08, 0.55);
        this._setMaterialColor(entity._coreNode.render.material, color, 0.85);
        this._setMaterialColor(entity._shellNode.render.material, color, 0.35, 0.36);
        this._setMaterialColor(entity._trailNode.render.material, color, 0.55, 0.5);
        break;
    }

    if (isCrit) {
      entity._haloNode.enabled = true;
      entity._haloNode.setLocalScale(0.42, 0.42, 0.08);
      this._setMaterialColor(
        entity._haloNode.render.material,
        { r: 1.0, g: 0.86, b: 0.36 },
        1.0,
        0.82
      );
    }
  }

  _setMaterialColor(material, color, emissiveStrength = 0.6, opacity = 1) {
    material.diffuse = new pc.Color(color.r, color.g, color.b);
    material.emissive = new pc.Color(
      color.r * emissiveStrength,
      color.g * emissiveStrength,
      color.b * emissiveStrength
    );
    material.opacity = opacity;
    material.blendType = opacity < 1 ? pc.BLEND_NORMAL : pc.BLEND_NONE;
    material.update();
  }

  _orientEntityToVector(entity, dx, dy, dz, roll = 0) {
    const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
    const yaw = Math.atan2(dx, dz) * (180 / Math.PI);
    const pitch = -Math.atan2(dy, horizontalDistance) * (180 / Math.PI);
    entity.setLocalEulerAngles(pitch, yaw, roll);
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
        currentEnemy = this._findNextChainTarget(lastPosition, hitEnemies, currentEnemy);
        continue;
      }

      currentEnemy.takeDamage(Math.round(currentDamage));
      hitEnemies.add(currentEnemy);

      console.log(`[ProjectileController] Chain lightning hit ${i + 1}: ${Math.round(currentDamage)} damage`);

      lastPosition = currentEnemy.position;
      currentEnemy = this._findNextChainTarget(lastPosition, hitEnemies, currentEnemy);
      currentDamage *= decay;
    }
  }

  /**
   * Find next target for chain lightning.
   */
  _findNextChainTarget(position, excludedEnemies, currentEnemy) {
    if (!this.projectiles.length) return null;

    const latestProjectile = this.projectiles[this.projectiles.length - 1];
    const enemies = latestProjectile?.enemies || [];

    let nearestEnemy = null;
    let nearestDistance = 5.0;

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
        const distanceRatio = distance / radius;
        const damageMultiplier = 1 - distanceRatio * falloff;
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
    } else if (enemy._speed !== undefined) {
      const originalSpeed = enemy._originalSpeed || enemy._speed;
      enemy._originalSpeed = originalSpeed;
      enemy._speed = originalSpeed * factor;

      setTimeout(() => {
        if (enemy._originalSpeed) {
          enemy._speed = enemy._originalSpeed;
        }
      }, duration * 1000);
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

      projectile.lifetime += dt;

      if (projectile.lifetime >= projectile.maxLifetime) {
        console.log('[ProjectileController] Projectile timed out');
        this._destroyProjectile(i);
        continue;
      }

      const target = projectile.target;
      if (!target || !target.isActive || target.isDead()) {
        console.log('[ProjectileController] Target invalid, destroying projectile');
        this._destroyProjectile(i);
        continue;
      }

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

    target.takeDamage(projectile.damage);
    console.log(
      `[ProjectileController] Hit! Dealt ${projectile.damage} damage (${projectile.typeId})${projectile.isCrit ? ' CRIT!' : ''}`
    );

    if (projectile.splashRadius > 0 && projectile.enemies) {
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
      this._applySlow(target, projectile.slowFactor, projectile.slowDuration);
    }

    if (projectile.onHitCallback) {
      projectile.onHitCallback(target, projectile.damage);
    }

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
    const dx = targetPos.x - currentPos.x;
    const dy = targetPos.y - currentPos.y;
    const dz = targetPos.z - currentPos.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance <= projectile.hitRadius) {
      return true;
    }

    const moveDistance = projectile.speed * dt;
    const ratio = Math.min(moveDistance / distance, 1);
    const newX = currentPos.x + dx * ratio;
    const newY = currentPos.y + dy * ratio;
    const newZ = currentPos.z + dz * ratio;

    entity.setLocalPosition(newX, newY, newZ);
    projectile.visualRoll += (entity._spinSpeed || 0) * dt;
    this._orientEntityToVector(entity, dx, dy, dz, projectile.visualRoll);

    return false;
  }

  /**
   * Destroy a projectile and return it to the pool.
   */
  _destroyProjectile(index) {
    const projectile = this.projectiles[index];
    if (projectile && projectile.entity) {
      if (projectile.entity._fromPool) {
        this.projectilePool.release(projectile.entity);
      } else {
        projectile.entity.destroy();
      }
    }
    this.projectiles.splice(index, 1);
  }

  /**
   * Destroy all projectiles and return them to the pool.
   */
  destroyAll() {
    for (const projectile of this.projectiles) {
      if (projectile.entity) {
        if (projectile.entity._fromPool) {
          this.projectilePool.release(projectile.entity);
        } else {
          projectile.entity.destroy();
        }
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
