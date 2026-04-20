/**
 * EventBus - Simple event bus for decoupled communication between systems.
 * 
 * Usage:
 *   EventBus.on('event:name', callback, context);
 *   EventBus.emit('event:name', data);
 *   EventBus.off('event:name', callback, context);
 */
export class EventBus {
  static _listeners = new Map();

  /**
   * Subscribe to an event.
   * @param {string} event - Event name (e.g., 'wave:completed')
   * @param {Function} callback - Callback function
   * @param {Object} [context] - Optional context to bind to callback
   */
  static on(event, callback, context) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, []);
    }
    this._listeners.get(event).push({ callback, context });
  }

  /**
   * Emit an event with optional data.
   * @param {string} event - Event name
   * @param {Object} [data] - Data to pass to callbacks
   */
  static emit(event, data) {
    const listeners = this._listeners.get(event);
    if (listeners) {
      for (const { callback, context } of listeners) {
        if (context) {
          callback.call(context, data);
        } else {
          callback(data);
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
    } else {
      this._listeners.clear();
    }
  }
}
