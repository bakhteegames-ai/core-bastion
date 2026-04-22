/**
 * VFXController
 * Manages visual effects for gameplay feedback.
 * All effects are code-driven and lightweight.
 *
 * License: CC0 (code-generated effects)
 */

import * as pc from 'playcanvas';

export class VFXController {
  constructor(app) {
    this.app = app;
    this._effects = [];

    console.log('[VFXController] Initialized');
  }

  /**
   * Create a hit effect at position.
   * @param {object} position - { x, y, z }
   * @param {object|pc.Color} options - Effect options or legacy color argument
   */
  createHitEffect(position, options = {}) {
    const hitOptions =
      options instanceof pc.Color
        ? { color: options }
        : options || {};

    const color = this._toColor(hitOptions.color || this._getCombatColor(hitOptions.typeId));
    const burstCount =
      hitOptions.splashRadius > 0 ? 10 : hitOptions.typeId === 'sniper' ? 4 : 6;
    const burstSpeed =
      hitOptions.typeId === 'sniper' ? 0.42 : hitOptions.splashRadius > 0 ? 0.56 : 0.38;
    const burstLifetime =
      hitOptions.typeId === 'sniper' ? 0.18 : hitOptions.splashRadius > 0 ? 0.42 : 0.28;

    this._createBurstEffect(position, color, burstCount, burstSpeed, burstLifetime, {
      scale: hitOptions.typeId === 'sniper' ? 0.1 : 0.14,
      yOffset: 0.45,
      gravity: hitOptions.typeId === 'sniper' ? -0.8 : -1.2
    });

    this._createRingEffect(
      position,
      this._mixColor(color, new pc.Color(1, 1, 1), 0.22),
      {
        radius: hitOptions.splashRadius > 0 ? 0.8 : 0.45,
        expand: hitOptions.splashRadius > 0 ? 2.5 : 1.65,
        lifetime: hitOptions.typeId === 'sniper' ? 0.18 : 0.28,
        opacity: 0.72
      }
    );

    if (hitOptions.typeId === 'ice') {
      this._createRingEffect(position, new pc.Color(0.8, 0.96, 1.0), {
        radius: 0.25,
        expand: 1.2,
        lifetime: 0.24,
        yOffset: 0.12,
        opacity: 0.5
      });
    }

    if (hitOptions.typeId === 'lightning') {
      this._createFlashEffect(position, new pc.Color(0.88, 0.72, 1.0), 0.14, {
        scale: 0.85,
        yOffset: 0.5,
        opacity: 0.68
      });
    }

    if (hitOptions.typeId === 'cannon' || hitOptions.isCrit) {
      this._createFlashEffect(
        position,
        hitOptions.isCrit ? new pc.Color(1.0, 0.86, 0.38) : color,
        0.16,
        {
          scale: hitOptions.isCrit ? 1.25 : 1.0,
          yOffset: 0.55,
          opacity: 0.76
        }
      );
    }
  }

  /**
   * Create a death effect at position.
   * @param {object} position - { x, y, z }
   */
  createDeathEffect(position) {
    const color = new pc.Color(0.95, 0.35, 0.22);
    this._createBurstEffect(position, color, 12, 0.52, 0.62, {
      scale: 0.18,
      yOffset: 0.5,
      gravity: -1.5
    });
    this._createRingEffect(position, new pc.Color(1.0, 0.58, 0.34), {
      radius: 0.55,
      expand: 2.8,
      lifetime: 0.42
    });
    this._createFlashEffect(position, color, 0.18, {
      scale: 1.3,
      yOffset: 0.7,
      opacity: 0.78
    });
  }

  /**
   * Create a leak effect (enemy reached base).
   * @param {object} position - { x, y, z }
   */
  createLeakEffect(position) {
    this._createFlashEffect(position, new pc.Color(1, 0.2, 0.1), 0.5, {
      scale: 1.8,
      yOffset: 1,
      opacity: 0.82
    });
    this._createRingEffect(position, new pc.Color(1, 0.35, 0.18), {
      radius: 0.7,
      expand: 3.4,
      lifetime: 0.44,
      opacity: 0.66
    });
  }

  /**
   * Create a build effect at position.
   * @param {object} position - { x, y, z }
   */
  createBuildEffect(position) {
    this._createBurstEffect(position, new pc.Color(0.3, 0.9, 1.0), 8, 0.4, 0.5, {
      scale: 0.15,
      yOffset: 0.4,
      gravity: -1.0
    });
    this._createRingEffect(position, new pc.Color(0.95, 0.9, 0.75), {
      radius: 0.5,
      expand: 1.9,
      lifetime: 0.32,
      opacity: 0.72
    });
  }

  /**
   * Create a projectile trail effect.
   * @param {object} position - { x, y, z }
   */
  createProjectileTrail(position, options = {}) {
    const entity = new pc.Entity('TrailParticle');
    entity.addComponent('render', { type: 'sphere' });
    entity.setLocalPosition(position.x, position.y, position.z);
    entity.setLocalScale(0.1, 0.1, 0.1);
    entity.render.material = this._createMaterial(
      this._toColor(options.color || new pc.Color(0.7, 0.9, 1.0)),
      {
        emissiveStrength: 0.6,
        opacity: 0.58
      }
    );

    this.app.root.addChild(entity);

    this._effects.push({
      entity,
      lifetime: 0,
      maxLifetime: 0.16,
      update: (dt, effect) => {
        const progress = effect.lifetime / effect.maxLifetime;
        const scale = 0.1 * (1 - progress);
        entity.setLocalScale(scale, scale, scale);
        entity.render.material.opacity = 0.58 * (1 - progress);
      }
    });
  }

  /**
   * Create a portal spawn pulse.
   */
  createSpawnEffect(position, options = {}) {
    const color = this._toColor(options.color || new pc.Color(1.0, 0.42, 0.22));
    this._createRingEffect(position, color, {
      radius: 0.62,
      expand: 2.1,
      lifetime: 0.36,
      yOffset: 0.14,
      opacity: 0.7
    });
    this._createFlashEffect(position, this._mixColor(color, new pc.Color(1, 1, 1), 0.18), 0.16, {
      scale: 0.95,
      yOffset: 0.8,
      opacity: 0.62
    });
    this._createBurstEffect(position, color, 5, 0.26, 0.34, {
      scale: 0.12,
      yOffset: 0.45,
      gravity: -0.45
    });
  }

  /**
   * Create a low-cost core danger pulse.
   */
  createCoreAlertEffect(position, options = {}) {
    const color = this._toColor(options.color || new pc.Color(0.95, 0.58, 0.24));
    this._createRingEffect(position, color, {
      radius: 1.1,
      expand: 2.8,
      lifetime: 0.42,
      yOffset: 0.12,
      opacity: 0.55
    });
    this._createRingEffect(position, new pc.Color(1.0, 0.82, 0.42), {
      radius: 0.55,
      expand: 1.8,
      lifetime: 0.24,
      yOffset: 0.16,
      opacity: 0.48
    });
    this._createFlashEffect(position, color, 0.14, {
      scale: 1.2,
      yOffset: 1.1,
      opacity: 0.4
    });
  }

  _getCombatColor(typeId) {
    switch (typeId) {
      case 'cannon':
        return new pc.Color(1.0, 0.55, 0.2);
      case 'ice':
        return new pc.Color(0.45, 0.88, 1.0);
      case 'lightning':
        return new pc.Color(0.8, 0.64, 1.0);
      case 'sniper':
        return new pc.Color(1.0, 0.46, 0.32);
      case 'archer':
      default:
        return new pc.Color(0.74, 0.95, 0.42);
    }
  }

  _createBurstEffect(position, color, particleCount, speed, lifetime, options = {}) {
    const baseScale = options.scale ?? 0.15;
    const yOffset = options.yOffset ?? 0.5;
    const gravity = options.gravity ?? -1.5;

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const entity = new pc.Entity('BurstParticle');
      entity.addComponent('render', { type: 'sphere' });
      entity.setLocalPosition(position.x, position.y + yOffset, position.z);
      entity.setLocalScale(baseScale, baseScale, baseScale);
      entity.render.material = this._createMaterial(color, {
        emissiveStrength: 0.68,
        opacity: 0.86
      });

      this.app.root.addChild(entity);

      const velocity = {
        x: Math.cos(angle) * speed * (0.55 + Math.random() * 0.45),
        y: 0.42 + Math.random() * speed * 0.35,
        z: Math.sin(angle) * speed * (0.55 + Math.random() * 0.45)
      };

      this._effects.push({
        entity,
        lifetime: 0,
        maxLifetime: lifetime,
        velocity,
        gravity,
        update: (dt, effect) => {
          effect.velocity.y += effect.gravity * dt;
          const pos = entity.getLocalPosition();
          entity.setLocalPosition(
            pos.x + effect.velocity.x * dt,
            pos.y + effect.velocity.y * dt,
            pos.z + effect.velocity.z * dt
          );

          const progress = effect.lifetime / effect.maxLifetime;
          const scale = baseScale * (1 - progress);
          entity.setLocalScale(scale, scale, scale);
          entity.render.material.opacity = 0.86 * (1 - progress);
        }
      });
    }
  }

  _createRingEffect(position, color, options = {}) {
    const radius = options.radius ?? 0.5;
    const lifetime = options.lifetime ?? 0.4;
    const expand = options.expand ?? 2;
    const yOffset = options.yOffset ?? 0.1;
    const opacity = options.opacity ?? 0.7;

    const entity = new pc.Entity('RingEffect');
    entity.addComponent('render', { type: 'torus' });
    entity.setLocalPosition(position.x, position.y + yOffset, position.z);
    entity.setLocalScale(radius, radius, 0.1);
    entity.setLocalEulerAngles(90, 0, 0);
    entity.render.material = this._createMaterial(color, {
      emissiveStrength: 0.56,
      opacity
    });

    this.app.root.addChild(entity);

    this._effects.push({
      entity,
      lifetime: 0,
      maxLifetime: lifetime,
      update: (dt, effect) => {
        const progress = effect.lifetime / effect.maxLifetime;
        const scale = radius + progress * expand;
        entity.setLocalScale(scale, scale, 0.1);
        entity.render.material.opacity = opacity * (1 - progress);
      }
    });
  }

  _createFlashEffect(position, color, duration, options = {}) {
    const scale = options.scale ?? 2;
    const opacity = options.opacity ?? 0.8;
    const yOffset = options.yOffset ?? 1;

    const entity = new pc.Entity('FlashEffect');
    entity.addComponent('render', { type: 'sphere' });
    entity.setLocalPosition(position.x, position.y + yOffset, position.z);
    entity.setLocalScale(scale, scale, scale);
    entity.render.material = this._createMaterial(color, {
      emissiveStrength: 1,
      opacity
    });

    this.app.root.addChild(entity);

    this._effects.push({
      entity,
      lifetime: 0,
      maxLifetime: duration,
      update: (dt, effect) => {
        const progress = effect.lifetime / effect.maxLifetime;
        entity.render.material.opacity = opacity * (1 - progress);
        const flashScale = scale * (1 - progress * 0.45);
        entity.setLocalScale(flashScale, flashScale, flashScale);
      }
    });
  }

  _createMaterial(color, options = {}) {
    const material = new pc.StandardMaterial();
    material.diffuse = color.clone();
    material.emissive = new pc.Color(
      color.r * (options.emissiveStrength ?? 0.5),
      color.g * (options.emissiveStrength ?? 0.5),
      color.b * (options.emissiveStrength ?? 0.5)
    );

    if (options.opacity !== undefined) {
      material.opacity = options.opacity;
      if (options.opacity < 1) {
        material.blendType = pc.BLEND_NORMAL;
      }
    }

    material.update();
    return material;
  }

  _toColor(color) {
    if (color instanceof pc.Color) {
      return color.clone();
    }

    return new pc.Color(color.r, color.g, color.b, color.a ?? 1);
  }

  _mixColor(a, b, t) {
    return new pc.Color(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t,
      a.a + ((b.a ?? 1) - (a.a ?? 1)) * t
    );
  }

  /**
   * Update all effects.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    for (let i = this._effects.length - 1; i >= 0; i--) {
      const effect = this._effects[i];
      effect.lifetime += dt;

      if (effect.update) {
        effect.update(dt, effect);
      }

      if (effect.lifetime >= effect.maxLifetime) {
        if (effect.entity) {
          effect.entity.destroy();
        }
        this._effects.splice(i, 1);
      }
    }
  }

  /**
   * Clear all effects.
   */
  clearEffects() {
    for (const effect of this._effects) {
      if (effect.entity) {
        effect.entity.destroy();
      }
    }
    this._effects = [];
  }

  /**
   * Destroy the controller.
   */
  destroy() {
    this.clearEffects();
    console.log('[VFXController] Destroyed');
  }
}
