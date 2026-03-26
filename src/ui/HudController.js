/**
 * HudController
 * Manages HUD display elements.
 * Task 3.3: HUD Core
 */
export class HudController {
  constructor() {
    // Cache DOM elements
    this._waveValue = document.getElementById('hud-wave-value');
    this._hpValue = document.getElementById('hud-hp-value');
    this._goldValue = document.getElementById('hud-gold-value');
    this._timerContainer = document.getElementById('hud-timer');
    this._timerValue = document.getElementById('hud-timer-value');

    // Initial state
    this._currentWave = 0;
    this._currentHP = 10;
    this._maxHP = 10;
    this._currentGold = 100;
    this._timerVisible = false;

    console.log('[HudController] Initialized');
  }

  /**
   * Update the displayed wave number.
   * @param {number} wave - Current wave number
   */
  setWave(wave) {
    this._currentWave = wave;
    if (this._waveValue) {
      this._waveValue.textContent = wave;
    }
  }

  /**
   * Update the displayed base HP.
   * @param {number} current - Current HP
   * @param {number} max - Maximum HP
   */
  setBaseHP(current, max) {
    this._currentHP = current;
    this._maxHP = max;
    if (this._hpValue) {
      this._hpValue.textContent = `${current}/${max}`;
    }
  }

  /**
   * Update the displayed gold.
   * @param {number} gold - Current gold amount
   */
  setGold(gold) {
    this._currentGold = gold;
    if (this._goldValue) {
      this._goldValue.textContent = gold;
    }
  }

  /**
   * Show or hide the build phase timer.
   * @param {boolean} visible
   */
  setTimerVisible(visible) {
    this._timerVisible = visible;
    if (this._timerContainer) {
      if (visible) {
        this._timerContainer.classList.remove('hud-hidden');
      } else {
        this._timerContainer.classList.add('hud-hidden');
      }
    }
  }

  /**
   * Update the build phase timer display.
   * @param {number} seconds - Seconds remaining
   */
  setTimerValue(seconds) {
    if (this._timerValue) {
      // Show 1 decimal place
      this._timerValue.textContent = Math.max(0, seconds).toFixed(1);
    }
  }

  /**
   * Get current wave number.
   */
  get wave() {
    return this._currentWave;
  }

  /**
   * Get current gold.
   */
  get gold() {
    return this._currentGold;
  }
}
