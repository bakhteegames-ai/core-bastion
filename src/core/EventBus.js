/**
 * EventBus - High-performance event bus for decoupled communication.
 * 
 * Architecture:
 * - Zero-allocation event emission (uses pre-allocated data objects)
 * - Supports wildcard listeners for event categories (e.g., 'enemy:*')
 * - Optimized for game loop performance (no GC during gameplay)
 * 
 * Usage:
 *   EventBus.on('enemy:killed', this._onEnemyKilled, this);
 *   EventBus.emit('enemy:killed', { enemyId, goldReward, position });
 *   EventBus.off('enemy:killed', this._onEnemyKilled, this);
 */

export class EventBus {
  // Pre-allocated listener storage per event
  static _listeners = new Map();
  
  // Wildcard listeners for event categories (e.g., 'enemy:*')
  static _wildcardListeners = new Map();
  
  // Pre-allocated array for iteration (avoids allocation during emit)
  static _tempListeners = [];

  /**
   * Subscribe to an event.
   * @param {string} event - Event name (e.g., 'wave:completed', 'enemy:killed')
   * @param {Function} callback - Callback function
   * @param {Object} [context] - Optional context to bind to callback
   */
  static on(event, callback, context) {
    // Check for wildcard pattern
    if (event.includes('*')) {
      const prefix = event.slice(0, event.indexOf('*'));
      if (!this._wildcardListeners.has(prefix)) {
        this._wildcardListeners.set(prefix, []);
      }
      this._wildcardListeners.get(prefix).push({ callback, context, fullPattern: event });
      return;
    }
    
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push({ callback, context });
  }

  /**
   * Emit an event with optional data.
   * CRITICAL: Data object should be reused/pooled to avoid GC!
   * @param {string} event - Event name
   * @param {Object} [data] - Data to pass to callbacks (reuse this object!)
   */
  static emit(event, data) {
    // Emit to exact match listeners
    const listeners = this._listeners.get(event);
    if (listeners) {
      // Copy to temp array to allow safe unsubscription during callback
      this._tempListeners.length = 0;
      for (let i = 0; i < listeners.length; i++) {
        this._tempListeners.push(listeners[i]);
      }
      
      for (let i = 0; i < this._tempListeners.length; i++) {
        const { callback, context } = this._tempListeners[i];
        if (context) {
          callback.call(context, data);
        } else {
          callback(data);
        }
      }
    }
    
    // Emit to wildcard listeners
    const colonIndex = event.indexOf(':');
    if (colonIndex !== -1) {
      const category = event.slice(0, colonIndex + 1);
      const wildcardListeners = this._wildcardListeners.get(category);
      if (wildcardListeners) {
        this._tempListeners.length = 0;
        for (let i = 0; i < wildcardListeners.length; i++) {
          this._tempListeners.push(wildcardListeners[i]);
        }
        
        for (let i = 0; i < this._tempListeners.length; i++) {
          const { callback, context } = this._tempListeners[i];
          if (context) {
            callback.call(context, data);
          } else {
            callback(data);
          }
        }
      }
    }
  }

  /**
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function to remove
   * @param {Object} [context] - Context used when subscribing
   */
  static off(event, callback, context) {
    // Handle wildcard patterns
    if (event.includes('*')) {
      const prefix = event.slice(0, event.indexOf('*'));
      const listeners = this._wildcardListeners.get(prefix);
      if (!listeners) return;
      
      const index = listeners.findIndex(
        item => item.callback === callback && item.context === context
      );
      if (index !== -1) {
        listeners.splice(index, 1);
      }
      return;
    }
    
    const listeners = this._listeners.get(event);
    if (!listeners) return;

    const index = listeners.findIndex(
      item => item.callback === callback && item.context === context
    );
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  }

  /**
   * Clear all listeners for an event (or all events if no event specified).
   * @param {string} [event] - Event name to clear, or undefined for all
   */
  static clear(event) {
    if (event) {
      this._listeners.delete(event);
      // Also clear wildcard listeners for this category
      const colonIndex = event.indexOf(':');
      if (colonIndex !== -1) {
        const category = event.slice(0, colonIndex + 1);
        this._wildcardListeners.delete(category);
      }
    } else {
      this._listeners.clear();
      this._wildcardListeners.clear();
    }
  }
  
  /**
   * Get listener count for debugging/profiling.
   * @param {string} event - Event name
   * @returns {number} - Number of listeners
   */
  static getListenerCount(event) {
    let count = this._listeners.get(event)?.length || 0;
    
    // Add wildcard listeners
    const colonIndex = event.indexOf(':');
    if (colonIndex !== -1) {
      const category = event.slice(0, colonIndex + 1);
      count += this._wildcardListeners.get(category)?.length || 0;
    }
    
    return count;
  }
}

// Pre-defined event constants to prevent typos and enable auto-complete
export const GameEvents = {
  // Enemy lifecycle
  ENEMY_SPAWNED: 'enemy:spawned',
  ENEMY_DAMAGED: 'enemy:damaged',
  ENEMY_KILLED: 'enemy:killed',
  ENEMY_REACHED_BASE: 'enemy:reached_base',
  
  // Wave management
  WAVE_STARTED: 'wave:started',
  WAVE_COMPLETED: 'wave:completed',
  WAVE_FAILED: 'wave:failed',
  
  // Tower actions
  TOWER_BUILT: 'tower:built',
  TOWER_UPGRADED: 'tower:upgraded',
  TOWER_SOLD: 'tower:sold',
  TOWER_FIRED: 'tower:fired',
  
  // Economy
  GOLD_EARNED: 'economy:gold_earned',
  GOLD_SPENT: 'economy:gold_spent',
  
  // Abilities
  ABILITY_ACTIVATED: 'ability:activated',
  ABILITY_READY: 'ability:ready',
  ULTIMATE_CHARGED: 'ultimate:charged',
  
  // Meta progression
  SHARDS_EARNED: 'meta:shards_earned',
  TALENT_UNLOCKED: 'meta:talent_unlocked',
  
  // Juice & VFX
  SCREEN_SHAKE: 'juice:screen_shake',
  HIT_STOP: 'juice:hit_stop',
  DAMAGE_NUMBER: 'juice:damage_number',
  
  // Game state
  GAME_STARTED: 'game:started',
  GAME_PAUSED: 'game:paused',
  GAME_RESUMED: 'game:resumed',
  GAME_OVER: 'game:over'
};
