import { BASE_MAX_HP, BASE_START_HP } from '../app/constants.js';

/**
 * BaseHealth
 * Manages base HP and defeat detection.
 * Task 1.4: Base Health Core
 */
export class BaseHealth {
  constructor() {
    this._currentHP = BASE_START_HP;
    this._maxHP = BASE_MAX_HP;
    this._onDefeatCallback = null;
  }

  /**
   * Get current base HP.
   * @returns {number}
   */
  get currentHP() {
    return this._currentHP;
  }

  /**
   * Get max base HP.
   * @returns {number}
   */
  get maxHP() {
    return this._maxHP;
  }

  /**
   * Set the defeat callback.
   * Called when HP reaches 0 or below.
   * @param {Function} callback
   */
  setOnDefeatCallback(callback) {
    this._onDefeatCallback = callback;
  }

  /**
   * Reset HP to starting value.
   */
  reset() {
    this._maxHP = BASE_MAX_HP;
    this._currentHP = BASE_START_HP;
    console.log(`[BaseHealth] Reset to ${this._currentHP}/${this._maxHP}`);
  }

  /**
   * Apply damage to the base.
   * Triggers defeat callback if HP reaches 0 or below.
   * @param {number} amount - Damage amount (default: ENEMY_LEAK_DAMAGE)
   */
  takeDamage(amount = 1) {
    this._currentHP = Math.max(0, this._currentHP - amount);
    console.log(`[BaseHealth] Took ${amount} damage, HP: ${this._currentHP}/${this._maxHP}`);

    if (this._currentHP <= 0) {
      console.log('[BaseHealth] HP reached 0, triggering defeat');
      if (this._onDefeatCallback) {
        this._onDefeatCallback();
      }
    }
  }

  /**
   * Restore HP (for continue functionality).
   * @param {number} amount - HP to restore
   */
  restore(amount) {
    this._currentHP = Math.min(this._maxHP, this._currentHP + amount);
    console.log(`[BaseHealth] Restored ${amount} HP, now: ${this._currentHP}/${this._maxHP}`);
  }

  /**
   * Set HP to a specific value.
   * @param {number} value
   */
  setHP(value) {
    this._currentHP = Math.max(0, Math.min(this._maxHP, value));
  }

  setMaxHP(value) {
    this._maxHP = Math.max(1, value);
    this._currentHP = Math.min(this._currentHP, this._maxHP);
  }

  /**
   * Check if base is defeated.
   * @returns {boolean}
   */
  isDefeated() {
    return this._currentHP <= 0;
  }
}
