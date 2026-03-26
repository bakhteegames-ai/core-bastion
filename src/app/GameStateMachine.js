/**
 * GameStateMachine
 * Implements canonical gameplay states and transitions per State Machine Spec §16.
 * Task 1.2: State Machine Skeleton
 */

// Canonical states - exactly these states are allowed in MVP (§16.1)
export const GameState = {
  BOOT: 'BOOT',
  READY: 'READY',
  BUILD_PHASE: 'BUILD_PHASE',
  WAVE_ACTIVE: 'WAVE_ACTIVE',
  DEFEAT: 'DEFEAT',
  AD_PAUSED: 'AD_PAUSED'
};

// Allowed transitions - only these transitions are permitted (§16.3)
const ALLOWED_TRANSITIONS = {
  [GameState.BOOT]: [GameState.READY],
  [GameState.READY]: [GameState.BUILD_PHASE],
  [GameState.BUILD_PHASE]: [GameState.WAVE_ACTIVE],
  [GameState.WAVE_ACTIVE]: [GameState.BUILD_PHASE, GameState.DEFEAT],
  [GameState.DEFEAT]: [GameState.AD_PAUSED, GameState.BOOT],
  [GameState.AD_PAUSED]: [GameState.DEFEAT, GameState.WAVE_ACTIVE, GameState.BOOT]
};

export class GameStateMachine {
  constructor() {
    this._currentState = null;
    this._previousState = null;
  }

  /**
   * Get the current game state.
   * @returns {string|null}
   */
  get currentState() {
    return this._currentState;
  }

  /**
   * Get the previous game state.
   * @returns {string|null}
   */
  get previousState() {
    return this._previousState;
  }

  /**
   * Initialize the state machine to BOOT state.
   * This is the only way to enter BOOT state.
   */
  initialize() {
    if (this._currentState !== null) {
      console.warn('[GameStateMachine] Already initialized');
      return false;
    }
    this._currentState = GameState.BOOT;
    console.log(`[GameStateMachine] Initialized to ${this._currentState}`);
    return true;
  }

  /**
   * Attempt to transition to a new state.
   * Validates against allowed transitions (§16.3).
   * @param {string} targetState - The state to transition to
   * @returns {boolean} - true if transition succeeded, false if rejected
   */
  transition(targetState) {
    // Validate target state is a valid state
    if (!Object.values(GameState).includes(targetState)) {
      console.warn(`[GameStateMachine] Invalid state: ${targetState}`);
      return false;
    }

    // Must be initialized first
    if (this._currentState === null) {
      console.warn('[GameStateMachine] Not initialized, call initialize() first');
      return false;
    }

    // No state may transition directly to itself (§16.5)
    if (targetState === this._currentState) {
      console.warn(`[GameStateMachine] Cannot transition to same state: ${targetState}`);
      return false;
    }

    // Check if transition is allowed
    const allowedTargets = ALLOWED_TRANSITIONS[this._currentState];
    if (!allowedTargets || !allowedTargets.includes(targetState)) {
      console.warn(`[GameStateMachine] Transition ${this._currentState} -> ${targetState} is not allowed`);
      return false;
    }

    // Perform transition
    this._previousState = this._currentState;
    this._currentState = targetState;
    console.log(`[GameStateMachine] Transition: ${this._previousState} -> ${this._currentState}`);

    return true;
  }

  /**
   * Check if a transition to target state would be valid.
   * @param {string} targetState
   * @returns {boolean}
   */
  canTransitionTo(targetState) {
    if (!Object.values(GameState).includes(targetState)) {
      return false;
    }
    if (this._currentState === null) {
      return false;
    }
    if (targetState === this._currentState) {
      return false;
    }
    const allowedTargets = ALLOWED_TRANSITIONS[this._currentState];
    return allowedTargets && allowedTargets.includes(targetState);
  }

  /**
   * Check if the machine is in a specific state.
   * @param {string} state
   * @returns {boolean}
   */
  isInState(state) {
    return this._currentState === state;
  }
}
