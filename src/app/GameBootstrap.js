import * as pc from 'playcanvas';
import { SceneFactory } from '../scene/SceneFactory.js';
import { EnemyAgent } from '../gameplay/EnemyAgent.js';
import { BaseHealth } from '../gameplay/BaseHealth.js';
import { EconomyService } from '../gameplay/EconomyService.js';
import { BuildManager } from '../gameplay/BuildManager.js';
import { TowerController } from '../gameplay/TowerController.js';
import { ProjectileController } from '../gameplay/ProjectileController.js';
import { WaveManager } from '../gameplay/WaveManager.js';
import { HudController } from '../ui/HudController.js';
import { SaveService } from '../save/SaveService.js';
import { AudioService } from '../audio/AudioService.js';
import { createPlatformBridge } from '../platform/PlatformBridge.js';
import { GameStateMachine, GameState } from './GameStateMachine.js';
import { STARTING_GOLD, BUILD_PHASE_DURATION, BASE_MAX_HP } from './constants.js';
import { ENEMY_LEAK_DAMAGE } from '../data/balance.js';

/**
 * GameBootstrap
 * Task 5.2: Audio Placeholders
 */
export class GameBootstrap {
  constructor() {
    this.app = null;
    this.canvas = null;
    this.sceneFactory = null;
    this.enemies = [];
    this.baseHealth = null;
    this.economyService = null;
    this.buildManager = null;
    this.towerController = null;
    this.projectileController = null;
    this.waveManager = null;
    this.stateMachine = null;
    this.hudController = null;
    this.saveService = null;
    this.audioService = null;

    // Build phase timing
    this.buildPhaseTimer = 0;
    
    // Game started flag
    this._gameStarted = false;
    
    // Continue used flag
    this._continueUsed = false;

    // Session defeat counter (for interstitial scheduling)
    // Reset on page reload, persisted only in memory
    this._sessionDefeatCount = 0;
  }

  init() {
    this.canvas = document.getElementById('application-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    this.app = new pc.Application(this.canvas, {
      mouse: new pc.Mouse(this.canvas),
      touch: new pc.TouchDevice(this.canvas)
    });

    this.app.setCanvasFillMode(pc.FILLMODE_KEEP_ASPECT);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO, 1280, 720);

    // Initialize state machine (starts in BOOT)
    this.stateMachine = new GameStateMachine();
    this.stateMachine.initialize(); // BOOT state

    // Transition BOOT -> READY
    this.stateMachine.transition(GameState.READY);

    // Initialize economy
    this.economyService = new EconomyService(STARTING_GOLD);

    // Initialize base health
    this.baseHealth = new BaseHealth();
    this.baseHealth.setOnDefeatCallback(() => {
      this._onDefeat();
    });

    // Create battlefield scene
    this.sceneFactory = new SceneFactory(this.app);
    this.sceneFactory.createBattlefield();

    // Initialize build manager
    this.buildManager = new BuildManager(this.app, this.economyService, this.sceneFactory);

    // Initialize projectile controller
    this.projectileController = new ProjectileController(this.app);

    // Initialize tower controller
    this.towerController = new TowerController(this.app, this.projectileController);

    // Initialize wave manager
    this.waveManager = new WaveManager(this.app);
    this.waveManager.setOnSpawnEnemy((enemyData) => {
      this._spawnEnemy(enemyData);
    });
    this.waveManager.setOnWaveComplete((waveNumber) => {
      this._onWaveComplete(waveNumber);
    });
    this.waveManager.setOnWaveStart((waveNumber) => {
      this._onWaveStart(waveNumber);
    });

    // Initialize HUD controller
    this.hudController = new HudController();

    // Initialize save service (will be connected to platform bridge)
    this.saveService = new SaveService();

    // Initialize audio service
    this.audioService = new AudioService();

    // Initialize platform bridge (auto-detects Yandex vs local)
    this.platformBridge = null;
    createPlatformBridge().then(async (bridge) => {
      this.platformBridge = bridge;
      await bridge.init();
      
      // Set UI language from platform
      const lang = bridge.getLanguage();
      this.hudController.setLanguage(lang);
      
      // Connect save service to platform bridge for cloud storage
      this.saveService.setPlatformBridge(bridge);
      await this.saveService.initialize();
      
      // Update HUD with loaded bestWave
      this.hudController.setHighWave(this.saveService.bestWave);
      this.hudController.showMainMenu(this.saveService.bestWave);
      
      // Signal platform that game is ready for interaction
      await bridge.ready();
      
      console.log(`[GameBootstrap] Platform bridge ready (lang: ${lang})`);
    });

    // Setup restart callback
    this.hudController.setOnRestart(() => {
      this.audioService.playButtonClick();
      this._restartGame();
    });

    // Setup play callback
    this.hudController.setOnPlay(() => {
      this.audioService.playButtonClick();
      this.audioService.initContext();
      this._startGame();
    });

    // Setup continue callback
    this.hudController.setOnContinue(() => {
      this.audioService.playButtonClick();
      this._continueGame();
    });

    this._updateHud();

    // Setup input
    this._setupBuildSlotClickDetection();

    // Start game loop
    this.app.on('update', this.onUpdate, this);
    this.app.start();

    // Main menu will be shown after platform bridge initializes
    // (see async initialization block above)

    console.log('GameBootstrap initialized');
  }

  /**
   * Start build phase (before first wave or between waves).
   */
  _startBuildPhase() {
    if (!this.stateMachine.canTransitionTo(GameState.BUILD_PHASE)) {
      console.warn('[GameBootstrap] Cannot start build phase from current state');
      return;
    }
    this.stateMachine.transition(GameState.BUILD_PHASE);
    this.buildPhaseTimer = BUILD_PHASE_DURATION;
    this.hudController.setTimerVisible(true);
    this.hudController.setTimerValue(BUILD_PHASE_DURATION);
    console.log(`[GameBootstrap] BUILD_PHASE started (${BUILD_PHASE_DURATION}s)`);
  }

  /**
   * Start wave active phase.
   */
  _startWaveActive() {
    this.stateMachine.transition(GameState.WAVE_ACTIVE);
    this.hudController.setTimerVisible(false);
    this.waveManager.startNextWave();
    console.log('[GameBootstrap] WAVE_ACTIVE started');
  }

  _setupBuildSlotClickDetection() {
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, (event) => {
      if (event.button !== pc.MOUSEBUTTON_LEFT) return;
      this._handleBuildSlotClick(event);
    });

    this.app.touch.on(pc.EVENT_TOUCHSTART, (event) => {
      if (event.touches.length > 0) {
        this._handleBuildSlotClick(event.touches[0]);
      }
    });
  }

  _handleBuildSlotClick(event) {
    // Only allow building during BUILD_PHASE (per §16.2)
    if (!this.stateMachine.isInState(GameState.BUILD_PHASE)) {
      console.log('[GameBootstrap] Can only build during BUILD_PHASE');
      return;
    }

    const camera = this.sceneFactory.getCamera();
    if (!camera) return;

    // Use raw PlayCanvas screen coordinates (pixels) for screenToWorld
    const x = event.x;
    const y = event.y;

    // Get ray from camera through click point
    const from = camera.camera.screenToWorld(x, y, camera.camera.nearClip);
    const to = camera.camera.screenToWorld(x, y, camera.camera.farClip);

    // Calculate ray direction
    const dir = new pc.Vec3();
    dir.sub2(to, from).normalize();

    // Intersect with ground plane (y = 0.15, slot height)
    const planeY = 0.15;
    const worldPos = this._rayPlaneIntersection(from, dir, planeY);

    if (!worldPos) return;

    // Find nearest build slot within click radius
    const hitSlot = this._findNearestSlot(worldPos, 2.0);

    if (hitSlot) {
      const slotEntity = this.sceneFactory.getBuildSlotMarkers().find(
        m => m.slotId === hitSlot.id
      );
      if (slotEntity) {
        this._onBuildSlotClicked(hitSlot.id, slotEntity);
      }
    }
  }

  /**
   * Calculate ray-plane intersection.
   * @param {pc.Vec3} origin - Ray origin
   * @param {pc.Vec3} dir - Ray direction (normalized)
   * @param {number} planeY - Y coordinate of the horizontal plane
   * @returns {pc.Vec3|null} - Intersection point or null
   */
  _rayPlaneIntersection(origin, dir, planeY) {
    // Ray: P = origin + t * dir
    // Plane: y = planeY
    // Solve: origin.y + t * dir.y = planeY
    if (Math.abs(dir.y) < 0.0001) return null; // Ray parallel to plane

    const t = (planeY - origin.y) / dir.y;
    if (t < 0) return null; // Intersection behind camera

    const result = new pc.Vec3();
    result.x = origin.x + t * dir.x;
    result.y = planeY;
    result.z = origin.z + t * dir.z;

    return result;
  }

  /**
   * Find the nearest build slot within radius.
   * @param {pc.Vec3} worldPos - World position to check
   * @param {number} radius - Click radius
   * @returns {object|null} - Slot data or null
   */
  _findNearestSlot(worldPos, radius) {
    const slots = this.sceneFactory.getBuildSlotMarkers();
    let nearest = null;
    let minDist = radius;

    for (const slotEntity of slots) {
      const slotId = slotEntity.slotId;
      if (!slotId) continue;

      // Skip occupied slots
      if (this.sceneFactory.isSlotOccupied(slotId)) continue;

      const slotPos = slotEntity.getPosition();
      const dx = worldPos.x - slotPos.x;
      const dz = worldPos.z - slotPos.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist) {
        minDist = dist;
        nearest = { id: slotId, entity: slotEntity };
      }
    }

    return nearest;
  }

  _onBuildSlotClicked(slotId, entity) {
    console.log(`[GameBootstrap] Build slot ${slotId} clicked`);
    const towerData = this.buildManager.buildTower(slotId, entity);
    if (towerData) {
      this.towerController.registerTower(towerData);
      this._updateHudGold();
      this.audioService.playBuildTower();
    }
  }

  /**
   * Spawn an enemy with wave data.
   */
  _spawnEnemy(enemyData) {
    const enemy = new EnemyAgent(this.app, {
      hp: enemyData.hp,
      speed: enemyData.speed,
      goldReward: enemyData.goldReward
    });

    enemy.setOnReachEndpoint((e) => {
      this._onEnemyLeak(e);
    });

    enemy.setOnDeath((e) => {
      this._onEnemyDeath(e);
    });

    this.enemies.push(enemy);
  }

  _onEnemyLeak(enemy) {
    console.log('[GameBootstrap] Enemy leaked, applying damage to base');
    this.baseHealth.takeDamage(ENEMY_LEAK_DAMAGE);
    this._updateHudHP();
    this.audioService.playEnemyLeak();

    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    // Notify wave manager
    this.waveManager.onEnemyRemoved();
  }

  _onEnemyDeath(enemy) {
    const reward = enemy.goldReward;
    console.log(`[GameBootstrap] Enemy killed, granting ${reward} gold`);
    this.economyService.addGold(reward);
    this._updateHudGold();
    this.audioService.playEnemyDeath();

    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    // Notify wave manager
    this.waveManager.onEnemyRemoved();
  }

  _onWaveStart(waveNumber) {
    this.hudController.setWave(waveNumber);
    this.audioService.playWaveStart();
  }

  async _onWaveComplete(waveNumber) {
    console.log(`[GameBootstrap] Wave ${waveNumber} complete!`);
    this.audioService.playWaveComplete();
    // Update best wave if new record
    const newRecord = await this.saveService.updateBestWave(waveNumber);
    if (newRecord) {
      this.hudController.setHighWave(this.saveService.bestWave);
    }
    // Transition back to BUILD_PHASE for next wave
    this._startBuildPhase();
  }

  _onDefeat() {
    console.log('[GameBootstrap] DEFEAT - Base HP reached 0');
    
    // Increment session defeat counter (for interstitial scheduling)
    this._sessionDefeatCount++;
    console.log(`[GameBootstrap] Session defeat count: ${this._sessionDefeatCount}`);
    
    this.stateMachine.transition(GameState.DEFEAT);
    this.audioService.playDefeat();
    this.hudController.showDefeat(
      this.waveManager.currentWave,
      this.saveService.highWave
    );
  }

  onUpdate(dt) {
    // No updates if game hasn't started
    if (!this._gameStarted) {
      return;
    }
    
    // No updates during DEFEAT
    if (this.stateMachine.isInState(GameState.DEFEAT)) {
      return;
    }

    // BUILD_PHASE: countdown timer
    if (this.stateMachine.isInState(GameState.BUILD_PHASE)) {
      this.buildPhaseTimer -= dt;
      this.hudController.setTimerValue(this.buildPhaseTimer);
      if (this.buildPhaseTimer <= 0) {
        this._startWaveActive();
      }
      return; // No other updates during build phase (per §16.2)
    }

    // WAVE_ACTIVE: update game systems
    if (this.stateMachine.isInState(GameState.WAVE_ACTIVE)) {
      // Update wave manager (spawning)
      this.waveManager.update(dt);

      // Update all enemies
      for (const enemy of this.enemies) {
        if (enemy.isActive) {
          enemy.update(dt);
        }
      }

      // Update towers
      this.towerController.update(this.enemies, dt);

      // Update projectiles
      this.projectileController.update(dt);
    }
  }

  /**
   * Update all HUD elements.
   */
  _updateHud() {
    this._updateHudWave();
    this._updateHudHP();
    this._updateHudGold();
  }

  _updateHudWave() {
    this.hudController.setWave(this.waveManager.currentWave);
  }

  _updateHudHP() {
    this.hudController.setBaseHP(this.baseHealth.currentHP, BASE_MAX_HP);
  }

  _updateHudGold() {
    this.hudController.setGold(this.economyService.gold);
  }

  /**
   * Start the game from main menu.
   */
  _startGame() {
    console.log('[GameBootstrap] Starting game...');
    
    this._gameStarted = true;
    this._continueUsed = false;
    this.hudController.showContinueButton();
    this.hudController.hideMainMenu();
    this._startBuildPhase();
    
    console.log(`[GameBootstrap] Starting gold: ${this.economyService.gold}`);
  }

  /**
   * Continue the game after watching ad.
   * Follows exact state machine spec: DEFEAT → AD_PAUSED → WAVE_ACTIVE
   */
  async _continueGame() {
    // Only allow one continue per game session
    if (this._continueUsed) {
      console.log('[GameBootstrap] Continue already used this session');
      return;
    }

    // Transition to AD_PAUSED state (DEFEAT → AD_PAUSED per §16.3)
    if (!this.stateMachine.transition(GameState.AD_PAUSED)) {
      console.error('[GameBootstrap] Failed to enter AD_PAUSED state');
      return;
    }

    console.log('[GameBootstrap] Entered AD_PAUSED, showing ad...');

    // Pause and mute game for ad compliance
    this._pauseForAd();

    // Show rewarded ad
    const result = await this.platformBridge.showRewarded('continue');

    // Resume game after ad
    this._resumeAfterAd();

    if (!result.rewarded) {
      // Ad not completed - return to DEFEAT state (AD_PAUSED → DEFEAT per §16.3)
      console.log('[GameBootstrap] Ad not completed, returning to DEFEAT');
      this.stateMachine.transition(GameState.DEFEAT);
      return;
    }

    console.log('[GameBootstrap] Ad watched, continuing game...');

    // Mark continue as used
    this._continueUsed = true;

    // Hide continue button (one use per session)
    this.hudController.hideContinueButton();

    // Hide defeat screen
    this.hudController.hideDefeat();

    // Restore HP to exactly 5 (per docs spec)
    this.baseHealth.setHP(5);
    this._updateHudHP();

    // Transition to WAVE_ACTIVE (AD_PAUSED → WAVE_ACTIVE per §16.3)
    // Do NOT reset wave number or remove towers
    this.stateMachine.transition(GameState.WAVE_ACTIVE);

    console.log('[GameBootstrap] Continued! HP restored to 5, wave preserved');
  }

  /**
   * Restart the game after defeat.
   * Shows interstitial ad only on every 3rd defeat per session.
   * Uses DEFEAT → AD_PAUSED → BOOT if interstitial scheduled.
   * Uses DEFEAT → BOOT if no interstitial scheduled.
   */
  async _restartGame() {
    console.log('[GameBootstrap] Restarting game...');

    // Check if interstitial should be shown (every 3rd defeat)
    const showInterstitial = this._sessionDefeatCount % 3 === 0 && this._sessionDefeatCount > 0;

    if (showInterstitial) {
      // Transition to AD_PAUSED first (DEFEAT → AD_PAUSED per §16.3)
      if (!this.stateMachine.transition(GameState.AD_PAUSED)) {
        console.warn('[GameBootstrap] Cannot transition to AD_PAUSED, proceeding without ad');
      } else {
        console.log('[GameBootstrap] Entered AD_PAUSED for interstitial...');

        // Pause and mute game for ad compliance
        this._pauseForAd();

        // Show interstitial ad
        console.log('[GameBootstrap] Showing interstitial ad...');
        try {
          await this.platformBridge.showInterstitial('restart');
        } catch (e) {
          console.warn('[GameBootstrap] Interstitial ad failed, continuing restart:', e);
        }

        // Resume game after ad
        this._resumeAfterAd();

        // Transition AD_PAUSED → BOOT
        this.stateMachine.transition(GameState.BOOT);
      }
    } else {
      // No interstitial scheduled: direct DEFEAT → BOOT
      if (!this.stateMachine.transition(GameState.BOOT)) {
        console.error('[GameBootstrap] Failed to transition to BOOT state');
        return;
      }
    }

    // Hide defeat screen
    this.hudController.hideDefeat();

    // Clear all enemies
    for (const enemy of this.enemies) {
      enemy.destroy();
    }
    this.enemies = [];

    // Remove all towers
    this.buildManager.removeAllTowers();
    this.towerController.clearTowers();

    // Clear projectiles
    this.projectileController.clearProjectiles();

    // Reset wave manager
    this.waveManager.reset();

    // Reset base health
    this.baseHealth.reset();

    // Reset economy
    this.economyService.reset(STARTING_GOLD);

    // Transition BOOT → READY → BUILD_PHASE
    this.stateMachine.transition(GameState.READY);

    // Reset continue flag and show button for new session
    this._continueUsed = false;
    this.hudController.showContinueButton();

    // Update HUD
    this._updateHud();

    // Start first build phase
    this._startBuildPhase();

    console.log('[GameBootstrap] Game restarted');
  }

  /**
   * Pause game for ad playback.
   * Mutes audio and pauses game systems.
   */
  _pauseForAd() {
    console.log('[GameBootstrap] Pausing for ad...');
    
    // Mute audio
    if (this.audioService) {
      this.audioService.mute();
      this.audioService.pause();
    }
  }

  /**
   * Resume game after ad playback.
   * Unmutes audio and resumes game systems.
   */
  _resumeAfterAd() {
    console.log('[GameBootstrap] Resuming after ad...');
    
    // Unmute audio
    if (this.audioService) {
      this.audioService.resume();
      this.audioService.unmute();
    }
  }
}
