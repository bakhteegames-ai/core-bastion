/**
 * HudController
 * Manages HUD display elements.
 * Task 4.3: Continue with Ad
 */
export class HudController {
  constructor() {
    // Cache DOM elements
    this._waveValue = document.getElementById('hud-wave-value');
    this._hpValue = document.getElementById('hud-hp-value');
    this._goldValue = document.getElementById('hud-gold-value');
    this._timerContainer = document.getElementById('hud-timer');
    this._timerValue = document.getElementById('hud-timer-value');
    this._highWaveValue = document.getElementById('hud-highwave-value');

    // Defeat screen elements
    this._defeatScreen = document.getElementById('defeat-screen');
    this._defeatWaveValue = document.getElementById('defeat-wave-value');
    this._defeatBestValue = document.getElementById('defeat-best-value');
    this._restartBtn = document.getElementById('defeat-restart-btn');
    this._continueBtn = document.getElementById('defeat-continue-btn');

    // Main menu elements
    this._mainMenu = document.getElementById('main-menu');
    this._menuBestValue = document.getElementById('menu-best-value');
    this._playBtn = document.getElementById('menu-play-btn');

    // Initial state
    this._currentWave = 0;
    this._currentHP = 10;
    this._maxHP = 10;
    this._currentGold = 100;
    this._timerVisible = false;
    this._highWave = 0;
    this._onRestartCallback = null;
    this._onPlayCallback = null;
    this._onContinueCallback = null;

    // Setup restart button
    if (this._restartBtn) {
      this._restartBtn.addEventListener('click', () => {
        if (this._onRestartCallback) {
          this._onRestartCallback();
        }
      });
    }

    // Setup continue button
    if (this._continueBtn) {
      this._continueBtn.addEventListener('click', () => {
        if (this._onContinueCallback) {
          this._onContinueCallback();
        }
      });
    }

    // Setup play button
    if (this._playBtn) {
      this._playBtn.addEventListener('click', () => {
        if (this._onPlayCallback) {
          this._onPlayCallback();
        }
      });
    }

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

  /**
   * Update the displayed high wave.
   * @param {number} wave - Highest wave reached
   */
  setHighWave(wave) {
    this._highWave = wave;
    if (this._highWaveValue) {
      this._highWaveValue.textContent = wave;
    }
  }

  /**
   * Get high wave.
   */
  get highWave() {
    return this._highWave;
  }

  /**
   * Show the defeat screen.
   * @param {number} wave - Current wave when defeated
   * @param {number} bestWave - Best wave achieved
   */
  showDefeat(wave, bestWave) {
    if (this._defeatWaveValue) {
      this._defeatWaveValue.textContent = wave;
    }
    if (this._defeatBestValue) {
      this._defeatBestValue.textContent = bestWave;
    }
    if (this._defeatScreen) {
      this._defeatScreen.classList.remove('hidden');
    }
  }

  /**
   * Hide the defeat screen.
   */
  hideDefeat() {
    if (this._defeatScreen) {
      this._defeatScreen.classList.add('hidden');
    }
  }

  /**
   * Set callback for restart button.
   * @param {Function} callback
   */
  setOnRestart(callback) {
    this._onRestartCallback = callback;
  }

  /**
   * Set callback for play button.
   * @param {Function} callback
   */
  setOnPlay(callback) {
    this._onPlayCallback = callback;
  }

  /**
   * Set callback for continue button.
   * @param {Function} callback
   */
  setOnContinue(callback) {
    this._onContinueCallback = callback;
  }

  /**
   * Show the main menu.
   * @param {number} bestWave - Best wave achieved
   */
  showMainMenu(bestWave) {
    if (this._menuBestValue) {
      this._menuBestValue.textContent = bestWave;
    }
    if (this._mainMenu) {
      this._mainMenu.classList.remove('hidden');
    }
  }

  /**
   * Hide the main menu.
   */
  hideMainMenu() {
    if (this._mainMenu) {
      this._mainMenu.classList.add('hidden');
    }
  }
}
