import * as pc from 'playcanvas';
import { WAYPOINTS } from '../data/level.js';
import {
  ENEMY_BASE_HP,
  ENEMY_BASE_SPEED,
  ENEMY_COLLISION_RADIUS,
  ENEMY_GOLD_REWARD
} from '../data/balance.js';
import { getEnemyType, getEnemyStats } from '../data/enemyTypes.js';

/**
 * EnemyAgent
 * Moves along the fixed waypoint path.
 * Task 1.5: Enemy Path Movement
 * Task 2.6: Enemy death and kill reward
 * Task 5.1: Visual Polish Pass
 * Task 4-b: Enemy types integration
 */
export class EnemyAgent {
  constructor(app, options = {}) {
    this.app = app;
    this.entity = null;
    this.assetLoader = options.assetLoader || null;

    // Get enemy type from typeId or use defaults
    const typeId = options.typeId || 'grunt';
    const enemyType = getEnemyType(typeId);
    const stats = getEnemyStats(typeId, options.waveNumber || 1);

    // Core type identifier
    this._typeId = typeId;

    // Stats - use options first, then calculated stats, then defaults
    this._hp = options.hp ?? stats.hp;
    this._maxHP = stats.hp;
    this._speed = options.speed ?? stats.speed;
    this._collisionRadius = ENEMY_COLLISION_RADIUS;
    this._goldReward = options.goldReward ?? stats.goldReward;
    this._leakDamage = stats.leakDamage;

    // Enemy type properties
    this._armor = stats.armor || 0;
    this._canFly = stats.canFly || false;
    this._scale = stats.scale || 1.0;
    this._color = enemyType.color;
    this._special = stats.special || null;
    this._name = enemyType.name;
    this._nameRu = enemyType.nameRu;

    // Slow effect
    this._slowFactor = 1.0;
    this._slowDuration = 0;

    // Boss abilities
    this._abilities = stats.abilities || [];
    this._abilityTriggers = { heal: 0.7, summon: 0.5, shield: 0.3 };
    this._triggeredAbilities = new Set();
    this._shieldActive = false;
    this._shieldReduction = 0;

    // Stealth visibility state
    this._isVisible = this._special !== 'stealth'; // Stealth starts invisible
    
    // Healer state
    this._lastHealTime = 0;
    
    // Spawner state
    this._lastSpawnTime = 0;
    
    // Speedster dash state
    this._isDashing = false;
    this._dashCooldown = 0;

    // Minion summon callback
    this._onSummonMinionsCallback = null;

    // Path state
    this._waypoints = WAYPOINTS;
    this._currentWaypointIndex = 0;
    this._isActive = true;

    // Callbacks
    this._onReachEndpointCallback = null;
    this._onDeathCallback = null;

    // Create visual entity
    this._createEntity();
  }

  _createEntity() {
    this.entity = new pc.Entity('Enemy');
    
    // Set spawn position with flying offset if needed
    const spawnY = this._canFly ? 1.5 : 0;
    this.entity.setLocalPosition(this._waypoints[0].x, spawnY, this._waypoints[0].z);

    // Apply scale
    this.entity.setLocalScale(this._scale, this._scale, this._scale);

    // Animation time for wobble effect
    this._animTime = Math.random() * Math.PI * 2;

    // Try to use GLB model first
    if (this.assetLoader) {
      const modelEntity = this.assetLoader.createEntityFromModel('enemy');
      if (modelEntity) {
        modelEntity.setLocalScale(0.02, 0.02, 0.02); // Scale down the monster model
        modelEntity.setLocalPosition(0, 0, 0);
        this.entity.addChild(modelEntity);
        this.modelEntity = modelEntity;
        this.bodyEntity = modelEntity;
        
        this.app.root.addChild(this.entity);
        console.log(`[EnemyAgent] Spawned ${this._typeId} with GLB model at (${this._waypoints[0].x}, ${this._waypoints[0].z})`);
        return;
      }
    }

    // Fallback to procedural model
    this._createProceduralModel();
    this.app.root.addChild(this.entity);
    console.log(`[EnemyAgent] Spawned ${this._typeId} (${this._nameRu}) with procedural model at (${this._waypoints[0].x}, ${this._waypoints[0].z})`);
  }

  _createProceduralModel() {
    // Create different procedural models based on enemy type
    switch (this._typeId) {
      case 'runner':
        this._createRunnerModel();
        break;
      case 'tank':
        this._createTankModel();
        break;
      case 'flyer':
        this._createFlyerModel();
        break;
      case 'boss':
        this._createBossModel();
        break;
      default:
        this._createGruntModel();
    }
  }

  _createGruntModel() {
    // Standard grunt - leaned cube (crystal) with top spike
    const body = new pc.Entity('EnemyBody');
    body.addComponent('render', { type: 'box' });
    body.setLocalPosition(0, 0.6, 0);
    body.setLocalScale(0.8, 1.0, 0.8);
    body.setLocalEulerAngles(0, 45, 0);

    const bodyMaterial = new pc.StandardMaterial();
    bodyMaterial.diffuse = new pc.Color(this._color.r, this._color.g, this._color.b);
    bodyMaterial.emissive = new pc.Color(this._color.r * 0.8, this._color.g * 0.3, this._color.b * 0.3);
    bodyMaterial.specular = new pc.Color(1, 0.8, 0.5);
    bodyMaterial.shininess = 80;
    bodyMaterial.update();
    body.render.material = bodyMaterial;

    this.entity.addChild(body);
    this.bodyEntity = body;

    // Top crystal
    const topCrystal = new pc.Entity('EnemyTop');
    topCrystal.addComponent('render', { type: 'cone' });
    topCrystal.setLocalPosition(0, 1.3, 0);
    topCrystal.setLocalScale(0.5, 0.6, 0.5);
    topCrystal.setLocalEulerAngles(180, 0, 0);

    const topMaterial = new pc.StandardMaterial();
    topMaterial.diffuse = new pc.Color(this._color.r, this._color.g * 0.5, this._color.b * 0.3);
    topMaterial.emissive = new pc.Color(this._color.r * 0.6, this._color.g * 0.15, this._color.b * 0.1);
    topMaterial.update();
    topCrystal.render.material = topMaterial;

    this.entity.addChild(topCrystal);
    this.topCrystal = topCrystal;

    // Glowing core (eye)
    this._createGlowingCore();
    this._createGroundShadow();
  }

  _createRunnerModel() {
    // Runner - tall narrow crystal with side fins
    const body = new pc.Entity('EnemyBody');
    body.addComponent('render', { type: 'box' });
    body.setLocalPosition(0, 0.8, 0);
    body.setLocalScale(0.6, 1.4, 0.6);
    body.setLocalEulerAngles(0, 45, 0);

    const bodyMaterial = new pc.StandardMaterial();
    bodyMaterial.diffuse = new pc.Color(this._color.r, this._color.g, this._color.b);
    bodyMaterial.emissive = new pc.Color(this._color.r * 0.5, this._color.g * 0.6, this._color.b * 0.3);
    bodyMaterial.specular = new pc.Color(0.8, 1, 0.8);
    bodyMaterial.shininess = 100;
    bodyMaterial.update();
    body.render.material = bodyMaterial;

    this.entity.addChild(body);
    this.bodyEntity = body;

    // Side fins
    for (let i = 0; i < 2; i++) {
      const fin = new pc.Entity(`Fin${i}`);
      fin.addComponent('render', { type: 'box' });
      fin.setLocalPosition(i === 0 ? 0.4 : -0.4, 0.8, 0);
      fin.setLocalScale(0.3, 0.4, 0.1);
      fin.setLocalEulerAngles(0, 0, i === 0 ? 30 : -30);

      const finMaterial = new pc.StandardMaterial();
      finMaterial.diffuse = new pc.Color(this._color.r * 0.8, this._color.g, this._color.b * 0.8);
      finMaterial.emissive = new pc.Color(this._color.r * 0.3, this._color.g * 0.4, this._color.b * 0.3);
      finMaterial.update();
      fin.render.material = finMaterial;

      this.entity.addChild(fin);
      this[`fin${i}`] = fin;
    }

    this._createGlowingCore();
    this._createGroundShadow();
  }

  _createTankModel() {
    // Tank - wide low block with armor plates
    const body = new pc.Entity('EnemyBody');
    body.addComponent('render', { type: 'box' });
    body.setLocalPosition(0, 0.45, 0);
    body.setLocalScale(1.2, 0.7, 1.2);
    body.setLocalEulerAngles(0, 45, 0);

    const bodyMaterial = new pc.StandardMaterial();
    bodyMaterial.diffuse = new pc.Color(this._color.r, this._color.g, this._color.b);
    bodyMaterial.emissive = new pc.Color(this._color.r * 0.3, this._color.g * 0.3, this._color.b * 0.4);
    bodyMaterial.specular = new pc.Color(0.6, 0.6, 0.7);
    bodyMaterial.shininess = 60;
    bodyMaterial.update();
    body.render.material = bodyMaterial;

    this.entity.addChild(body);
    this.bodyEntity = body;

    // Corner armor plates
    for (let i = 0; i < 4; i++) {
      const armor = new pc.Entity(`Armor${i}`);
      armor.addComponent('render', { type: 'box' });
      const angle = (i * 90 + 45) * Math.PI / 180;
      armor.setLocalPosition(Math.sin(angle) * 0.7, 0.65, Math.cos(angle) * 0.7);
      armor.setLocalScale(0.3, 0.3, 0.3);
      armor.setLocalEulerAngles(0, i * 90, 45);

      const armorMaterial = new pc.StandardMaterial();
      armorMaterial.diffuse = new pc.Color(0.7, 0.7, 0.75);
      armorMaterial.specular = new pc.Color(1, 1, 1);
      armorMaterial.shininess = 100;
      armorMaterial.update();
      armor.render.material = armorMaterial;

      this.entity.addChild(armor);
    }

    // Turret on top
    const turret = new pc.Entity('Turret');
    turret.addComponent('render', { type: 'cylinder' });
    turret.setLocalPosition(0, 0.85, 0);
    turret.setLocalScale(0.3, 0.2, 0.3);

    const turretMaterial = new pc.StandardMaterial();
    turretMaterial.diffuse = new pc.Color(0.4, 0.4, 0.45);
    turretMaterial.emissive = new pc.Color(0.2, 0.2, 0.25);
    turretMaterial.update();
    turret.render.material = turretMaterial;

    this.entity.addChild(turret);
    this.turret = turret;

    this._createGlowingCore(0.5, 0.2);
    this._createGroundShadow(1.5);
  }

  _createFlyerModel() {
    // Flyer - cone with animated wings
    const body = new pc.Entity('EnemyBody');
    body.addComponent('render', { type: 'cone' });
    body.setLocalPosition(0, 0, 0);
    body.setLocalScale(0.6, 1.0, 0.6);
    body.setLocalEulerAngles(180, 0, 0);

    const bodyMaterial = new pc.StandardMaterial();
    bodyMaterial.diffuse = new pc.Color(this._color.r, this._color.g, this._color.b);
    bodyMaterial.emissive = new pc.Color(this._color.r * 0.5, this._color.g * 0.3, this._color.b * 0.7);
    bodyMaterial.specular = new pc.Color(0.8, 0.6, 1);
    bodyMaterial.shininess = 100;
    bodyMaterial.update();
    body.render.material = bodyMaterial;

    this.entity.addChild(body);
    this.bodyEntity = body;

    // Wings
    for (let i = 0; i < 2; i++) {
      const wing = new pc.Entity(`Wing${i}`);
      wing.addComponent('render', { type: 'box' });
      wing.setLocalPosition(i === 0 ? 0.6 : -0.6, 0.1, 0);
      wing.setLocalScale(0.8, 0.05, 0.4);
      wing.setLocalEulerAngles(0, 0, i === 0 ? -15 : 15);

      const wingMaterial = new pc.StandardMaterial();
      wingMaterial.diffuse = new pc.Color(this._color.r * 0.9, this._color.g * 0.7, this._color.b);
      wingMaterial.emissive = new pc.Color(this._color.r * 0.4, this._color.g * 0.2, this._color.b * 0.5);
      wingMaterial.opacity = 0.8;
      wingMaterial.update();
      wing.render.material = wingMaterial;

      this.entity.addChild(wing);
      this[`wing${i}`] = wing;
    }

    // Eye for flyer
    const eye = new pc.Entity('Eye');
    eye.addComponent('render', { type: 'sphere' });
    eye.setLocalPosition(0, 0.6, 0.2);
    eye.setLocalScale(0.2, 0.2, 0.2);

    const eyeMaterial = new pc.StandardMaterial();
    eyeMaterial.diffuse = new pc.Color(1, 1, 0.5);
    eyeMaterial.emissive = new pc.Color(2, 1.5, 0.5);
    eyeMaterial.update();
    eye.render.material = eyeMaterial;

    this.entity.addChild(eye);
    this.coreEntity = eye;
  }

  _createBossModel() {
    // Boss - large crystal with horns, spikes, and aura
    const body = new pc.Entity('EnemyBody');
    body.addComponent('render', { type: 'box' });
    body.setLocalPosition(0, 0.8, 0);
    body.setLocalScale(1.2, 1.4, 1.2);
    body.setLocalEulerAngles(0, 45, 0);

    const bodyMaterial = new pc.StandardMaterial();
    bodyMaterial.diffuse = new pc.Color(this._color.r, this._color.g, this._color.b);
    bodyMaterial.emissive = new pc.Color(this._color.r * 0.5, this._color.g * 0.1, this._color.b * 0.1);
    bodyMaterial.specular = new pc.Color(1, 0.5, 0.5);
    bodyMaterial.shininess = 80;
    bodyMaterial.update();
    body.render.material = bodyMaterial;

    this.entity.addChild(body);
    this.bodyEntity = body;

    // Horns
    for (let i = 0; i < 2; i++) {
      const horn = new pc.Entity(`Horn${i}`);
      horn.addComponent('render', { type: 'cone' });
      horn.setLocalPosition(i === 0 ? 0.4 : -0.4, 1.8, 0);
      horn.setLocalScale(0.2, 0.5, 0.2);
      horn.setLocalEulerAngles(i === 0 ? -20 : 20, 0, 0);

      const hornMaterial = new pc.StandardMaterial();
      hornMaterial.diffuse = new pc.Color(0.2, 0.1, 0.1);
      hornMaterial.emissive = new pc.Color(0.3, 0.1, 0.1);
      hornMaterial.update();
      horn.render.material = hornMaterial;

      this.entity.addChild(horn);
    }

    // Spikes around body
    for (let i = 0; i < 4; i++) {
      const spike = new pc.Entity(`Spike${i}`);
      spike.addComponent('render', { type: 'cone' });
      const angle = (i * 90 + 45) * Math.PI / 180;
      spike.setLocalPosition(Math.sin(angle) * 0.8, 0.8, Math.cos(angle) * 0.8);
      spike.setLocalScale(0.15, 0.4, 0.15);
      spike.setLocalEulerAngles(0, -i * 90, 90);

      const spikeMaterial = new pc.StandardMaterial();
      spikeMaterial.diffuse = new pc.Color(0.6, 0.2, 0.2);
      spikeMaterial.emissive = new pc.Color(0.3, 0.1, 0.1);
      spikeMaterial.update();
      spike.render.material = spikeMaterial;

      this.entity.addChild(spike);
    }

    // Aura rings
    for (let i = 0; i < 4; i++) {
      const ring = new pc.Entity(`AuraRing${i}`);
      ring.addComponent('render', { type: 'torus' });
      ring.setLocalPosition(0, 0.1 + i * 0.3, 0);
      ring.setLocalScale(1.5 - i * 0.2, 1.5 - i * 0.2, 1.5 - i * 0.2);
      ring.setLocalEulerAngles(90, 0, 0);

      const ringMaterial = new pc.StandardMaterial();
      ringMaterial.diffuse = new pc.Color(this._color.r, this._color.g * 0.3, this._color.b * 0.3);
      ringMaterial.emissive = new pc.Color(this._color.r * 0.3, this._color.g * 0.1, this._color.b * 0.1);
      ringMaterial.opacity = 0.5 - i * 0.1;
      ringMaterial.update();
      ring.render.material = ringMaterial;

      this.entity.addChild(ring);
      this[`auraRing${i}`] = ring;
    }

    // Large eye
    const eye = new pc.Entity('BossEye');
    eye.addComponent('render', { type: 'sphere' });
    eye.setLocalPosition(0, 1.0, 0.6);
    eye.setLocalScale(0.4, 0.4, 0.4);

    const eyeMaterial = new pc.StandardMaterial();
    eyeMaterial.diffuse = new pc.Color(1, 0.8, 0.2);
    eyeMaterial.emissive = new pc.Color(2, 1.5, 0.3);
    eyeMaterial.update();
    eye.render.material = eyeMaterial;

    this.entity.addChild(eye);
    this.coreEntity = eye;

    this._createGroundShadow(2.0);
  }

  _createGlowingCore(yOffset = 0.9, zOffset = 0.35) {
    const core = new pc.Entity('EnemyCore');
    core.addComponent('render', { type: 'sphere' });
    core.setLocalPosition(0, yOffset, zOffset);
    core.setLocalScale(0.25, 0.25, 0.25);

    const coreMaterial = new pc.StandardMaterial();
    coreMaterial.diffuse = new pc.Color(1, 0.9, 0.5);
    coreMaterial.emissive = new pc.Color(2, 1.5, 0.5);
    coreMaterial.specular = new pc.Color(1, 1, 0.8);
    coreMaterial.shininess = 100;
    coreMaterial.update();
    core.render.material = coreMaterial;

    this.entity.addChild(core);
    this.coreEntity = core;
  }

  _createGroundShadow(scale = 1.2) {
    const shadow = new pc.Entity('EnemyShadow');
    shadow.addComponent('render', { type: 'plane' });
    shadow.setLocalPosition(0, 0.02, 0);
    shadow.setLocalScale(scale, 1, scale);

    const shadowMaterial = new pc.StandardMaterial();
    shadowMaterial.diffuse = new pc.Color(0.05, 0.02, 0.02);
    shadowMaterial.opacity = 0.5;
    shadowMaterial.update();
    shadow.render.material = shadowMaterial;

    this.entity.addChild(shadow);
  }

  /**
   * Apply slow effect to the enemy.
   * @param {number} factor - Slow factor (0.0-1.0, where 0.5 means 50% slow)
   * @param {number} duration - Duration in seconds
   */
  applySlow(factor, duration) {
    this._slowFactor = Math.min(this._slowFactor, 1 - factor);
    this._slowDuration = Math.max(this._slowDuration, duration);
    console.log(`[EnemyAgent] Applied slow: factor=${this._slowFactor}, duration=${this._slowDuration}s`);
  }

  /**
   * Get current HP.
   */
  get hp() {
    return this._hp;
  }

  /**
   * Get max HP.
   */
  get maxHP() {
    return this._maxHP;
  }

  /**
   * Get current position.
   */
  get position() {
    if (!this.entity) return null;
    const pos = this.entity.getLocalPosition();
    return { x: pos.x, y: pos.y + 0.5, z: pos.z }; // Offset for body center
  }

  /**
   * Get position as vector (for ultimate system).
   * @returns {Object} Position object with x, y, z
   */
  getPosition() {
    return this.position;
  }

  /**
   * Get entity ID (for tracking in chain lightning).
   * @returns {number} Entity GUID or hash
   */
  getEntityId() {
    return this.entity?.getGuid?.() || this.entity?._guid || Math.random();
  }

  /**
   * Get collision radius.
   */
  get collisionRadius() {
    return this._collisionRadius;
  }

  /**
   * Check if enemy is still active.
   */
  get isActive() {
    return this._isActive;
  }

  /**
   * Get enemy type ID.
   */
  get typeId() {
    return this._typeId;
  }

  /**
   * Check if enemy can fly.
   */
  get canFly() {
    return this._canFly;
  }

  /**
   * Get enemy armor value.
   */
  get armor() {
    return this._armor;
  }

  /**
   * Get enemy scale.
   */
  get scale() {
    return this._scale;
  }

  /**
   * Get enemy special ability type.
   */
  get special() {
    return this._special;
  }

  /**
   * Get leak damage (damage to base when enemy reaches endpoint).
   */
  get leakDamage() {
    return this._leakDamage;
  }

  /**
   * Check if shield is active.
   */
  get hasShield() {
    return this._shieldActive;
  }

  /**
   * Set callback for when enemy reaches endpoint.
   * @param {Function} callback
   */
  setOnReachEndpoint(callback) {
    this._onReachEndpointCallback = callback;
  }

  /**
   * Set callback for when enemy dies (killed by tower).
   * @param {Function} callback
   */
  setOnDeath(callback) {
    this._onDeathCallback = callback;
  }

  /**
   * Set callback for minion summoning (boss ability).
   * @param {Function} callback
   */
  setOnSummonMinions(callback) {
    this._onSummonMinionsCallback = callback;
  }

  /**
   * Get gold reward for killing this enemy.
   */
  get goldReward() {
    return this._goldReward;
  }

  /**
   * Update enemy movement.
   * Call this from the game loop.
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    if (!this._isActive || !this.entity) return;

    // Update slow effect
    if (this._slowDuration > 0) {
      this._slowDuration -= dt;
      if (this._slowDuration <= 0) {
        this._slowFactor = 1.0;
        console.log('[EnemyAgent] Slow effect expired');
      }
    }

    // Update special abilities
    this._updateSpecialAbilities(dt);

    // Calculate actual speed with slow and dash effects
    let actualSpeed = this._speed * this._slowFactor;
    if (this._isDashing) {
      actualSpeed *= 2.5; // Dash speed multiplier
    }

    // Animation: wobble and pulse
    this._animTime += dt * 5;

    // Type-specific animations
    this._updateAnimations(dt);

    // Check if we've reached the end of the path
    if (this._currentWaypointIndex >= this._waypoints.length) {
      this._reachEndpoint();
      return;
    }

    // Get current position
    const currentPos = this.entity.getLocalPosition();
    const targetWaypoint = this._waypoints[this._currentWaypointIndex];

    // Calculate direction to target
    const dx = targetWaypoint.x - currentPos.x;
    const dz = targetWaypoint.z - currentPos.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    // Check if we've reached the current waypoint
    if (distance < 0.1) {
      this._currentWaypointIndex++;
      console.log(`[EnemyAgent] Reached waypoint ${this._currentWaypointIndex}`);
      return;
    }

    // Move towards target with actual speed
    const moveDistance = Math.min(actualSpeed * dt, distance);
    const ratio = moveDistance / distance;

    const newX = currentPos.x + dx * ratio;
    const newZ = currentPos.z + dz * ratio;

    // Set position (flyers hover above ground)
    const y = this._canFly ? 1.5 + Math.sin(this._animTime) * 0.1 : 0;
    
    // Apply visibility for stealth enemies
    if (this._special === 'stealth' && !this._isVisible) {
      // Stealth enemy - make semi-transparent
      if (this.bodyEntity && this.bodyEntity.render) {
        this.bodyEntity.render.material.opacity = 0.3;
        this.bodyEntity.render.material.update();
      }
    }
    
    this.entity.setLocalPosition(newX, y, newZ);

    // Rotate body to face movement direction
    if (this.bodyEntity) {
      const angle = Math.atan2(dx, dz) * (180 / Math.PI);
      this.bodyEntity.setLocalEulerAngles(0, angle + 45, 0);
    }
  }

  /**
   * Update special enemy abilities (healer, spawner, speedster).
   */
  _updateSpecialAbilities(dt) {
    const currentTime = Date.now() / 1000;
    const pos = this.position;

    // Healer: heal nearby allies
    if (this._special === 'heal') {
      const healInterval = 2.0; // seconds
      if (currentTime - this._lastHealTime >= healInterval) {
        this._lastHealTime = currentTime;
        this._healNearbyAllies();
      }
    }

    // Spawner: spawn minions periodically
    if (this._special === 'spawn') {
      const spawnInterval = 4.0; // seconds
      if (currentTime - this._lastSpawnTime >= spawnInterval) {
        this._lastSpawnTime = currentTime;
        this._spawnMinion();
      }
    }

    // Speedster: random dash
    if (this._special === 'dash') {
      if (this._isDashing) {
        this._dashCooldown -= dt;
        if (this._dashCooldown <= 0) {
          this._isDashing = false;
        }
      } else {
        // Chance to dash
        if (Math.random() < 0.01) { // 1% chance per frame
          this._isDashing = true;
          this._dashCooldown = 1.5; // dash for 1.5 seconds
          console.log('[EnemyAgent] Speedster dashing!');
        }
      }
    }
  }

  /**
   * Heal nearby allies (Healer ability).
   */
  _healNearbyAllies() {
    // This will be called by EnemySpawner which has access to all enemies
    if (this._onSummonMinionsCallback) {
      const pos = this.position;
      // Pass heal event to spawner
      this._onSummonMinionsCallback({
        type: 'heal',
        healerId: this.entity.getId(),
        position: pos,
        radius: 4.0,
        amount: 3
      });
    }
    console.log('[EnemyAgent] Healer healing nearby allies');
  }

  /**
   * Spawn a minion (Spawner ability).
   */
  _spawnMinion() {
    if (this._onSummonMinionsCallback) {
      const pos = this.position;
      console.log('[EnemyAgent] Spawner spawning minion');
      
      this._onSummonMinionsCallback({
        typeId: 'grunt',
        waveNumber: Math.max(1, Math.floor(this._maxHP / 35)),
        count: 1,
        spawnPosition: { x: pos.x, z: pos.z + 0.5 } // Spawn slightly ahead
      });
    }
  }

  /**
   * Update type-specific animations.
   */
  _updateAnimations(dt) {
    // Base wobble for body
    if (this.bodyEntity) {
      const wobble = Math.sin(this._animTime) * 0.1;
      const yBase = this._canFly ? 0 : 0.6;
      this.bodyEntity.setLocalPosition(0, yBase + wobble * 0.3, 0);
      this.bodyEntity.setLocalScale(0.8 + wobble * 0.05, 1.0 - wobble * 0.05, 0.8 + wobble * 0.05);
    }

    // Core pulse
    if (this.coreEntity) {
      const pulse = 0.25 + Math.sin(this._animTime * 2) * 0.05;
      this.coreEntity.setLocalScale(pulse, pulse, pulse);
    }

    // Type-specific animations
    if (this._typeId === 'flyer') {
      // Wing flapping
      const flapAngle = Math.sin(this._animTime * 8) * 8;
      if (this.wing0) this.wing0.setLocalEulerAngles(0, 0, -15 + flapAngle);
      if (this.wing1) this.wing1.setLocalEulerAngles(0, 0, 15 - flapAngle);
    }

    if (this._typeId === 'boss') {
      // Aura ring rotation
      for (let i = 0; i < 4; i++) {
        const ring = this[`auraRing${i}`];
        if (ring) {
          const currentRot = ring.getLocalEulerAngles();
          ring.setLocalEulerAngles(90, currentRot.y + dt * 30 * (i % 2 === 0 ? 1 : -1), 0);
        }
      }
    }
  }

  /**
   * Called when enemy reaches the end of the path.
   */
  _reachEndpoint() {
    console.log(`[EnemyAgent] ${this._typeId} reached endpoint, leak damage: ${this._leakDamage}`);

    if (this._onReachEndpointCallback) {
      this._onReachEndpointCallback(this);
    }

    this._isActive = false;
    this.destroy();
  }

  /**
   * Take damage.
   * @param {number} amount
   */
  takeDamage(amount) {
    if (!this._isActive) return;

    // Apply shield reduction
    let actualDamage = amount;
    if (this._shieldActive) {
      actualDamage = amount * (1 - this._shieldReduction);
      console.log(`[EnemyAgent] Shield absorbed ${(this._shieldReduction * 100).toFixed(0)}% damage`);
    }

    // Apply armor
    actualDamage = Math.max(1, actualDamage - this._armor);

    // Apply damage reduction for Juggernaut
    if (this._special === 'heavy_armor') {
      const dmgReduction = 0.5; // 50% damage reduction
      actualDamage = actualDamage * (1 - dmgReduction);
      console.log(`[EnemyAgent] Juggernaut armor reduced damage to ${actualDamage.toFixed(1)}`);
    }

    this._hp -= actualDamage;
    console.log(`[EnemyAgent] ${this._typeId} took ${actualDamage.toFixed(1)} damage (${amount} - ${this._armor} armor), HP: ${this._hp.toFixed(1)}/${this._maxHP}`);

    // Check boss abilities
    if (this._special === 'boss' && this._abilities.length > 0) {
      this._checkBossAbilities();
    }

    // Check stealth visibility
    if (this._special === 'stealth') {
      this._updateStealthVisibility();
    }

    // Check splitter death
    if (this._special === 'split' && this._hp <= 0) {
      this._splitEnemy();
      return; // Don't die yet, split first
    }

    if (this._hp <= 0) {
      this._hp = 0;
      this._die();
    }
  }

  /**
   * Update stealth enemy visibility based on HP threshold.
   */
  _updateStealthVisibility() {
    const hpPercent = this._hp / this._maxHP;
    const threshold = 0.3; // 30% HP
    
    if (hpPercent <= threshold && !this._isVisible) {
      this._isVisible = true;
      console.log('[EnemyAgent] Stealth enemy revealed!');
      // Visual feedback - make visible
      if (this.bodyEntity && this.bodyEntity.render) {
        this.bodyEntity.render.material.opacity = 1.0;
        this.bodyEntity.render.material.update();
      }
    }
  }

  /**
   * Split enemy into smaller enemies when killed.
   */
  _splitEnemy() {
    if (this._onSummonMinionsCallback) {
      const splitCount = 2;
      const childHP = Math.floor(this._maxHP * 0.4);
      const pos = this.position;
      
      console.log(`[EnemyAgent] Splitter splitting into ${splitCount} children with ${childHP} HP each`);
      
      // Spawn child splitters or grunts
      for (let i = 0; i < splitCount; i++) {
        const offsetX = (Math.random() - 0.5) * 2;
        const offsetZ = (Math.random() - 0.5) * 2;
        
        this._onSummonMinionsCallback({
          typeId: 'grunt', // Could spawn smaller splitters
          waveNumber: Math.max(1, Math.floor(this._maxHP / 30)),
          count: 1,
          spawnPosition: { x: pos.x + offsetX, z: pos.z + offsetZ },
          customHP: childHP
        });
      }
    }
    
    // Now die after splitting
    this._die();
  }

  /**
   * Check and trigger boss abilities based on HP thresholds.
   */
  _checkBossAbilities() {
    const hpPercent = this._hp / this._maxHP;

    // Heal at 70% HP
    if (hpPercent <= this._abilityTriggers.heal && !this._triggeredAbilities.has('heal')) {
      this._triggeredAbilities.add('heal');
      this._healSelf(this._maxHP * 0.1);
      console.log('[EnemyAgent] Boss triggered HEAL ability');
    }

    // Summon at 50% HP
    if (hpPercent <= this._abilityTriggers.summon && !this._triggeredAbilities.has('summon')) {
      this._triggeredAbilities.add('summon');
      this._summonMinions();
      console.log('[EnemyAgent] Boss triggered SUMMON ability');
    }

    // Shield at 30% HP
    if (hpPercent <= this._abilityTriggers.shield && !this._triggeredAbilities.has('shield')) {
      this._triggeredAbilities.add('shield');
      this._activateShield(0.5); // 50% damage reduction
      console.log('[EnemyAgent] Boss triggered SHIELD ability');
    }
  }

  /**
   * Heal self by amount.
   * @param {number} amount
   */
  _healSelf(amount) {
    const oldHP = this._hp;
    this._hp = Math.min(this._maxHP, this._hp + amount);
    console.log(`[EnemyAgent] Boss healed for ${(this._hp - oldHP).toFixed(1)} HP`);
  }

  /**
   * Summon minions (boss ability).
   */
  _summonMinions() {
    if (this._onSummonMinionsCallback) {
      // Summon 2-3 grunts near the boss
      const count = 2 + Math.floor(Math.random() * 2);
      const pos = this.position;
      this._onSummonMinionsCallback({
        typeId: 'grunt',
        waveNumber: Math.max(1, Math.floor(this._maxHP / 50)), // Scale with boss power
        count,
        spawnPosition: { x: pos.x, z: pos.z }
      });
    }
  }

  /**
   * Activate damage reduction shield.
   * @param {number} reduction - Damage reduction factor (0.0-1.0)
   */
  _activateShield(reduction) {
    this._shieldActive = true;
    this._shieldReduction = reduction;

    // Visual feedback - could add shield effect here
    if (this.entity) {
      const shield = new pc.Entity('BossShield');
      shield.addComponent('render', { type: 'sphere' });
      shield.setLocalPosition(0, 0.8, 0);
      shield.setLocalScale(2.5, 2.5, 2.5);

      const shieldMaterial = new pc.StandardMaterial();
      shieldMaterial.diffuse = new pc.Color(0.5, 0.7, 1);
      shieldMaterial.emissive = new pc.Color(0.3, 0.5, 0.8);
      shieldMaterial.opacity = 0.3;
      shieldMaterial.update();
      shield.render.material = shieldMaterial;

      this.entity.addChild(shield);
      this.shieldEntity = shield;
    }
  }

  /**
   * Check if enemy is dead.
   */
  isDead() {
    return this._hp <= 0;
  }

  /**
   * Handle enemy death (killed by tower).
   */
  _die() {
    if (!this._isActive) return;

    console.log(`[EnemyAgent] ${this._typeId} died, gold reward: ${this._goldReward}`);

    // Call death callback (for gold reward)
    if (this._onDeathCallback) {
      this._onDeathCallback(this);
    }

    this._isActive = false;
    this.destroy();
  }

  /**
   * Destroy the enemy entity.
   */
  destroy() {
    if (this.entity) {
      this.entity.destroy();
      this.entity = null;
    }
    this._isActive = false;
  }
}
