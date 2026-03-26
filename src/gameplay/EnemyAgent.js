import * as pc from 'playcanvas';
import { WAYPOINTS } from '../data/level.js';
import {
  ENEMY_BASE_HP,
  ENEMY_BASE_SPEED,
  ENEMY_COLLISION_RADIUS,
  ENEMY_GOLD_REWARD
} from '../data/balance.js';

/**
 * EnemyAgent
 * Moves along the fixed waypoint path.
 * Task 1.5: Enemy Path Movement
 * Task 2.6: Enemy death and kill reward
 * Task 5.1: Visual Polish Pass
 */
export class EnemyAgent {
  constructor(app, options = {}) {
    this.app = app;
    this.entity = null;

    // Stats (can be overridden via options)
    this._hp = options.hp ?? ENEMY_BASE_HP;
    this._maxHP = options.hp ?? ENEMY_BASE_HP;
    this._speed = options.speed ?? ENEMY_BASE_SPEED;
    this._collisionRadius = ENEMY_COLLISION_RADIUS;
    this._goldReward = options.goldReward ?? ENEMY_GOLD_REWARD;

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
    this.entity.setLocalPosition(this._waypoints[0].x, 0, this._waypoints[0].z);

    // Enemy body - angular, aggressive looking
    const body = new pc.Entity('EnemyBody');
    body.addComponent('render', { type: 'box' });
    body.setLocalPosition(0, 0.5, 0);
    body.setLocalScale(0.7, 0.8, 0.7);
    body.setLocalEulerAngles(0, 45, 0); // Diamond shape

    // Warm hostile color (per §7.4) with HP-based intensity
    const intensity = Math.min(1, this._maxHP / 50); // Brighter for stronger enemies
    const bodyMaterial = new pc.StandardMaterial();
    bodyMaterial.diffuse = new pc.Color(
      0.9 + intensity * 0.1,
      0.3 + (1 - intensity) * 0.2,
      0.2
    );
    bodyMaterial.emissive = new pc.Color(0.5, 0.15, 0.05);
    bodyMaterial.specular = new pc.Color(0.3, 0.2, 0.2);
    bodyMaterial.shininess = 10;
    bodyMaterial.update();
    body.render.material = bodyMaterial;

    this.entity.addChild(body);
    this.bodyEntity = body;

    // Enemy head/eye
    const head = new pc.Entity('EnemyHead');
    head.addComponent('render', { type: 'sphere' });
    head.setLocalPosition(0, 1.0, 0);
    head.setLocalScale(0.3, 0.3, 0.3);

    const headMaterial = new pc.StandardMaterial();
    headMaterial.diffuse = new pc.Color(1.0, 0.8, 0.2);
    headMaterial.emissive = new pc.Color(0.6, 0.4, 0.0);
    headMaterial.update();
    head.render.material = headMaterial;

    this.entity.addChild(head);
    this.headEntity = head;

    // Ground shadow
    const shadow = new pc.Entity('EnemyShadow');
    shadow.addComponent('render', { type: 'plane' });
    shadow.setLocalPosition(0, 0.02, 0);
    shadow.setLocalScale(1.0, 1, 1.0);

    const shadowMaterial = new pc.StandardMaterial();
    shadowMaterial.diffuse = new pc.Color(0.1, 0.08, 0.08);
    shadowMaterial.opacity = 0.4;
    shadowMaterial.update();
    shadow.render.material = shadowMaterial;

    this.entity.addChild(shadow);

    this.app.root.addChild(this.entity);

    console.log(`[EnemyAgent] Spawned at (${this._waypoints[0].x}, ${this._waypoints[0].z})`);
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

    // Move towards target
    const moveDistance = Math.min(this._speed * dt, distance);
    const ratio = moveDistance / distance;

    const newX = currentPos.x + dx * ratio;
    const newZ = currentPos.z + dz * ratio;

    this.entity.setLocalPosition(newX, 0, newZ);

    // Rotate body to face movement direction
    if (this.bodyEntity) {
      const angle = Math.atan2(dx, dz) * (180 / Math.PI);
      this.bodyEntity.setLocalEulerAngles(0, angle + 45, 0);
    }
  }

  /**
   * Called when enemy reaches the end of the path.
   */
  _reachEndpoint() {
    console.log('[EnemyAgent] Reached endpoint');

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

    this._hp -= amount;
    console.log(`[EnemyAgent] Took ${amount} damage, HP: ${this._hp}/${this._maxHP}`);

    if (this._hp <= 0) {
      this._hp = 0;
      this._die();
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

    console.log('[EnemyAgent] Died');

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
