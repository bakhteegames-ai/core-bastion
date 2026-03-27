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
   * @param {pc.Color} color - Effect color
   */
  createHitEffect(position, color = new pc.Color(1, 0.8, 0.2)) {
    this._createBurstEffect(position, color, 6, 0.3, 0.5);
  }

  /**
   * Create a death effect at position.
   * @param {object} position - { x, y, z }
   */
  createDeathEffect(position) {
    // Big burst + fade
    this._createBurstEffect(position, new pc.Color(0.9, 0.3, 0.2), 12, 0.5, 0.8);
    this._createRingEffect(position, new pc.Color(1, 0.5, 0.3));
  }

  /**
   * Create a leak effect (enemy reached base).
   * @param {object} position - { x, y, z }
   */
  createLeakEffect(position) {
    // Red flash at base
    this._createFlashEffect(position, new pc.Color(1, 0.2, 0.1), 0.5);
  }

  /**
   * Create a build effect at position.
   * @param {object} position - { x, y, z }
   */
  createBuildEffect(position) {
    // Cyan/gold burst
    this._createBurstEffect(position, new pc.Color(0.3, 0.9, 1.0), 8, 0.4, 0.6);
    this._createRingEffect(position, new pc.Color(0.95, 0.9, 0.75));
  }

  /**
   * Create a projectile trail effect.
   * @param {object} position - { x, y, z }
   */
  createProjectileTrail(position) {
    // Small fading sphere
    const entity = new pc.Entity('TrailParticle');
    entity.addComponent('render', { type: 'sphere' });
    entity.setLocalPosition(position.x, position.y, position.z);
    entity.setLocalScale(0.1, 0.1, 0.1);

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.7, 0.9, 1.0);
    material.emissive = new pc.Color(0.3, 0.5, 0.6);
    material.opacity = 0.6;
    material.update();
    entity.render.material = material;

    this.app.root.addChild(entity);

    this._effects.push({
      entity: entity,
      type: 'trail',
      lifetime: 0,
      maxLifetime: 0.2,
      update: (dt, effect) => {
        effect.lifetime += dt;
        const progress = effect.lifetime / effect.maxLifetime;
        const scale = 0.1 * (1 - progress);
        entity.setLocalScale(scale, scale, scale);
        if (entity.render && entity.render.material) {
          entity.render.material.opacity = 0.6 * (1 - progress);
        }
      }
    });
  }

  /**
   * Create burst particle effect.
   */
  _createBurstEffect(position, color, particleCount, speed, lifetime) {
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const angleV = (Math.random() - 0.5) * 0.5;
      
      const entity = new pc.Entity('BurstParticle');
      entity.addComponent('render', { type: 'sphere' });
      entity.setLocalPosition(position.x, position.y + 0.5, position.z);
      entity.setLocalScale(0.15, 0.15, 0.15);

      const material = new pc.StandardMaterial();
      material.diffuse = color.clone();
      material.emissive = new pc.Color(
        color.r * 0.5,
        color.g * 0.5,
        color.b * 0.5
      );
      material.update();
      entity.render.material = material;

      this.app.root.addChild(entity);

      const velocity = {
        x: Math.cos(angle) * speed * (0.5 + Math.random() * 0.5),
        y: 0.5 + angleV * speed,
        z: Math.sin(angle) * speed * (0.5 + Math.random() * 0.5)
      };

      this._effects.push({
        entity: entity,
        type: 'burst',
        lifetime: 0,
        maxLifetime: lifetime,
        velocity: velocity,
        gravity: -1.5,
        update: (dt, effect) => {
          effect.lifetime += dt;
          const progress = effect.lifetime / effect.maxLifetime;
          
          // Move particle
          effect.velocity.y += effect.gravity * dt;
          const pos = entity.getLocalPosition();
          entity.setLocalPosition(
            pos.x + effect.velocity.x * dt,
            pos.y + effect.velocity.y * dt,
            pos.z + effect.velocity.z * dt
          );
          
          // Fade and shrink
          const scale = 0.15 * (1 - progress);
          entity.setLocalScale(scale, scale, scale);
        }
      });
    }
  }

  /**
   * Create expanding ring effect.
   */
  _createRingEffect(position, color) {
    const entity = new pc.Entity('RingEffect');
    entity.addComponent('render', { type: 'torus' });
    entity.setLocalPosition(position.x, 0.1, position.z);
    entity.setLocalScale(0.5, 0.5, 0.1);
    entity.setLocalEulerAngles(90, 0, 0);

    const material = new pc.StandardMaterial();
    material.diffuse = color.clone();
    material.emissive = new pc.Color(
      color.r * 0.5,
      color.g * 0.5,
      color.b * 0.5
    );
    material.opacity = 0.7;
    material.update();
    entity.render.material = material;

    this.app.root.addChild(entity);

    this._effects.push({
      entity: entity,
      type: 'ring',
      lifetime: 0,
      maxLifetime: 0.4,
      update: (dt, effect) => {
        effect.lifetime += dt;
        const progress = effect.lifetime / effect.maxLifetime;
        
        // Expand
        const scale = 0.5 + progress * 2;
        entity.setLocalScale(scale, scale, 0.1);
        
        // Fade
        if (entity.render && entity.render.material) {
          entity.render.material.opacity = 0.7 * (1 - progress);
        }
      }
    });
  }

  /**
   * Create flash effect at position.
   */
  _createFlashEffect(position, color, duration) {
    const entity = new pc.Entity('FlashEffect');
    entity.addComponent('render', { type: 'sphere' });
    entity.setLocalPosition(position.x, position.y + 1, position.z);
    entity.setLocalScale(2, 2, 2);

    const material = new pc.StandardMaterial();
    material.diffuse = color.clone();
    material.emissive = color.clone();
    material.opacity = 0.8;
    material.update();
    entity.render.material = material;

    this.app.root.addChild(entity);

    this._effects.push({
      entity: entity,
      type: 'flash',
      lifetime: 0,
      maxLifetime: duration,
      update: (dt, effect) => {
        effect.lifetime += dt;
        const progress = effect.lifetime / effect.maxLifetime;
        
        // Fade out
        if (entity.render && entity.render.material) {
          entity.render.material.opacity = 0.8 * (1 - progress);
        }
        
        // Shrink
        const scale = 2 * (1 - progress * 0.5);
        entity.setLocalScale(scale, scale, scale);
      }
    });
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
