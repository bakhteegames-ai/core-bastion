import * as pc from 'playcanvas';
import { WAYPOINTS } from '../data/level.js';
import {
  ENEMY_BASE_HP,
  ENEMY_BASE_SPEED,
  ENEMY_COLLISION_RADIUS
} from '../data/balance.js';

/**
 * EnemyAgent
 * Moves along the fixed waypoint path.
 * Task 1.5: Enemy Path Movement
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

    // Path state
    this._waypoints = WAYPOINTS;
    this._currentWaypointIndex = 0;
    this._isActive = true;

    // Callbacks
    this._onReachEndpointCallback = null;

    // Create visual entity
    this._createEntity();
  }

  _createEntity() {
    this.entity = new pc.Entity('Enemy');

    this.entity.addComponent('render', {
      type: 'capsule'
    });

    // Position at first waypoint (spawn point)
    const spawn = this._waypoints[0];
    this.entity.setLocalPosition(spawn.x, 0.5, spawn.z);
    this.entity.setLocalScale(0.6, 0.5, 0.6);

    // Warm hostile color (per §7.4)
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(1.0, 0.4, 0.3); // Ember-orange
    material.update();
    this.entity.render.material = material;

    this.app.root.addChild(this.entity);

    console.log(`[EnemyAgent] Spawned at (${spawn.x}, ${spawn.z})`);
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
    return { x: pos.x, y: pos.y, z: pos.z };
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

    this.entity.setLocalPosition(newX, 0.5, newZ);
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
    this._hp -= amount;
    if (this._hp <= 0) {
      this._hp = 0;
    }
  }

  /**
   * Check if enemy is dead.
   */
  isDead() {
    return this._hp <= 0;
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
