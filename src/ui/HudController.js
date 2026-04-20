/**
 * HudController
 * Manages HUD display elements with localization support.
 */

import { getString } from './strings.js';
import { EventBus } from '../core/EventBus.js';

export class HudController {
  constructor() {
    // Localization - default to 'en'
    this._lang = 'en';

    // Cache DOM elements
    this._waveValue = document.getElementById('hud-wave-value');
    this._hpValue = document.getElementById('hud-hp-value');
    this._goldValue = document.getElementById('hud-gold-value');
    this._timerContainer = document.getElementById('hud-timer');
    this._timerValue = document.getElementById('hud-timer-value');
    this._timerLabel = document.querySelector('#hud-timer .hud-label');
    this._highWaveValue = document.getElementById('hud-highwave-value');

    // HUD labels
    this._waveLabel = document.querySelector('.hud-wave .hud-label');
    this._hpLabel = document.querySelector('.hud-hp .hud-label');
    this._goldLabel = document.querySelector('.hud-gold .hud-label');

    // Defeat screen elements
    this._defeatScreen = document.getElementById('defeat-screen');
    this._defeatTitle = document.querySelector('.defeat-title');
    this._defeatWaveLabel = document.querySelector('.defeat-wave');
    this._defeatBestLabel = document.querySelector('.defeat-best');
    this._defeatWaveValue = document.getElementById('defeat-wave-value');
    this._defeatBestValue = document.getElementById('defeat-best-value');
    this._restartBtn = document.getElementById('defeat-restart-btn');
    this._continueBtn = document.getElementById('defeat-continue-btn');

    // Main menu elements
    this._mainMenu = document.getElementById('main-menu');
    this._menuTitle = document.querySelector('.menu-title');
    this._menuSubtitle = document.querySelector('.menu-subtitle');
    this._menuBestLabel = document.querySelector('.menu-best');
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

    // Setup button handlers
    this._setupButtons();

    // Subscribe to wave completion events for UI updates
    EventBus.on('wave:completed', () => this._onWaveCompleted());

    console.log('[HudController] Initialized');
  }

  /**
   * Handle wave completion event - update UI.
   */
  _onWaveCompleted() {
    // Gold will be updated by economy service, but we can trigger a refresh here if needed
    this.updateGold();
  }

  /**
   * Update the displayed gold from economy service.
   */
  updateGold() {
    // This method can be called externally or via event to refresh gold display
    if (window.__game?.economyService) {
      this.setGold(window.__game.economyService.gold);
    }
  }

  /**
   * Setup button click handlers.
   */
  _setupButtons() {
    if (this._restartBtn) {
      this._restartBtn.addEventListener('click', () => {
        if (this._onRestartCallback) {
          this._onRestartCallback();
        }
      });
    }

    if (this._continueBtn) {
      this._continueBtn.addEventListener('click', () => {
        if (this._onContinueCallback) {
          this._onContinueCallback();
        }
      });
    }

    if (this._playBtn) {
      this._playBtn.addEventListener('click', () => {
        if (this._onPlayCallback) {
          this._onPlayCallback();
        }
      });
    }
  }

  /**
   * Set the language for UI strings.
   * @param {string} lang - Language code ('en' or 'ru')
   */
  setLanguage(lang) {
    this._lang = lang;
    this._updateAllLabels();
  }

  /**
   * Update all UI labels with localized strings.
   */
  _updateAllLabels() {
    // HUD labels
    if (this._waveLabel) {
      this._waveLabel.textContent = getString('hud.wave', this._lang);
    }
    if (this._hpLabel) {
      this._hpLabel.textContent = getString('hud.hp', this._lang);
    }
    if (this._goldLabel) {
      this._goldLabel.textContent = getString('hud.gold', this._lang);
    }
    if (this._timerLabel) {
      this._timerLabel.textContent = getString('hud.build_phase', this._lang);
    }

    // Main menu
    if (this._menuSubtitle) {
      this._menuSubtitle.textContent = getString('menu.subtitle', this._lang);
    }
    if (this._menuBestLabel) {
      this._menuBestLabel.innerHTML = `${getString('menu.best_wave', this._lang)}: <span id="menu-best-value">${this._highWave}</span>`;
      // Re-cache the value element since we replaced it
      this._menuBestValue = document.getElementById('menu-best-value');
    }
    if (this._playBtn) {
      this._playBtn.textContent = getString('menu.play', this._lang);
    }

    // Defeat screen
    if (this._defeatTitle) {
      this._defeatTitle.textContent = getString('defeat.title', this._lang);
    }
    if (this._defeatWaveLabel) {
      this._defeatWaveLabel.innerHTML = `${getString('defeat.wave', this._lang)}: <span id="defeat-wave-value">${this._currentWave}</span>`;
      this._defeatWaveValue = document.getElementById('defeat-wave-value');
    }
    if (this._defeatBestLabel) {
      this._defeatBestLabel.innerHTML = `${getString('defeat.best', this._lang)}: <span id="defeat-best-value">${this._highWave}</span>`;
      this._defeatBestValue = document.getElementById('defeat-best-value');
    }
    if (this._continueBtn) {
      this._continueBtn.textContent = getString('defeat.continue_ad', this._lang);
    }
    if (this._restartBtn) {
      this._restartBtn.textContent = getString('defeat.restart', this._lang);
    }

    // Update "Best" label in HUD wave panel
    const hudSub = document.querySelector('.hud-wave-panel .hud-sub');
    if (hudSub) {
      hudSub.innerHTML = `${getString('hud.best', this._lang)}: <span id="hud-highwave-value">${this._highWave}</span>`;
      this._highWaveValue = document.getElementById('hud-highwave-value');
    }

    console.log(`[HudController] UI labels updated for language: ${this._lang}`);
  }

  /**
   * Update the displayed wave number.
   */
  setWave(wave) {
    this._currentWave = wave;
    if (this._waveValue) {
      this._waveValue.textContent = wave;
    }
  }

  /**
   * Update the displayed base HP.
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
   */
  setGold(gold) {
    this._currentGold = gold;
    if (this._goldValue) {
      this._goldValue.textContent = gold;
    }
  }

  /**
   * Show or hide the build phase timer.
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
   */
  setTimerValue(seconds) {
    if (this._timerValue) {
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
   */
  setOnRestart(callback) {
    this._onRestartCallback = callback;
  }

  /**
   * Set callback for play button.
   */
  setOnPlay(callback) {
    this._onPlayCallback = callback;
  }

  /**
   * Set callback for continue button.
   */
  setOnContinue(callback) {
    this._onContinueCallback = callback;
  }

  /**
   * Show the main menu.
   */
  showMainMenu(bestWave) {
    this._highWave = bestWave;
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

  /**
   * Hide the continue button (after one use per session).
   */
  hideContinueButton() {
    if (this._continueBtn) {
      this._continueBtn.style.display = 'none';
    }
  }

  /**
   * Show the continue button (for new game session).
   */
  showContinueButton() {
    if (this._continueBtn) {
      this._continueBtn.style.display = '';
    }
  }
}
