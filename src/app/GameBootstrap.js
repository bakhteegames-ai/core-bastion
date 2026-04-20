import * as pc from 'playcanvas';
import { SceneFactory } from '../scene/SceneFactory.js';
import { AssetLoader } from '../assets/AssetLoader.js';
import { EnemyAgent } from '../gameplay/EnemyAgent.js';
import { BaseHealth } from '../gameplay/BaseHealth.js';
import { EconomyService } from '../gameplay/EconomyService.js';
import { BuildManager } from '../gameplay/BuildManager.js';
import { TowerController } from '../gameplay/TowerController.js';
import { ProjectileController } from '../gameplay/ProjectileController.js';
import { WaveManager } from '../gameplay/WaveManager.js';
import { HudController } from '../ui/HudController.js';
import { TowerPanelController } from '../ui/TowerPanelController.js';
import { AbilityBarController } from '../ui/AbilityBarController.js';
import { SaveService } from '../save/SaveService.js';
import { AudioService } from '../audio/AudioService.js';
import { VFXController } from '../vfx/VFXController.js';
import { createPlatformBridge } from '../platform/PlatformBridge.js';
import { GameStateMachine, GameState } from './GameStateMachine.js';
import { STARTING_GOLD, BUILD_PHASE_DURATION, BASE_MAX_HP } from './constants.js';
import { ENEMY_LEAK_DAMAGE } from '../data/balance.js';

// New data systems
import { getAllTowerTypes, getTowerType, getTowerStats } from '../data/towerTypes.js';
import { getAllEnemyTypes, getEnemyType, getEnemyStats } from '../data/enemyTypes.js';
import { PurchaseService } from '../gameplay/PurchaseService.js';
import { getLevel, getAllLevels } from '../data/levels.js';
import { generateModifierSchedule } from '../data/waveModifiers.js';

// Meta progression system
import { MetaProgressionService } from '../meta/MetaProgressionService.js';
import { RunModifier } from '../meta/RunModifier.js';
import { MetaHubController } from '../ui/MetaHubController.js';
import { calculateRunShards } from '../data/talents.js';

// Daily systems
import { DailyChallengeService } from '../daily/DailyChallengeService.js';
import { LeaderboardService } from '../daily/LeaderboardService.js';
import { DailyRewards } from '../daily/DailyRewards.js';

/**
 * GameBootstrap
 * Task 5.2: Audio Placeholders
 */
export class GameBootstrap {
  constructor() {
    this.app = null;
    this.canvas = null;
    this.sceneFactory = null;
    this.assetLoader = null;
    this.enemies = [];
    this.baseHealth = null;
    this.economyService = null;
    this.buildManager = null;
    this.towerController = null;
    this.projectileController = null;
    this.waveManager = null;
    this.stateMachine = null;
    this.hudController = null;
    this.towerPanelController = null;
    this.abilityBarController = null;
    this.saveService = null;
    this.audioService = null;
    this.vfxController = null;

    // Build phase timing
    this.buildPhaseTimer = 0;
    
    // Game started flag
    this._gameStarted = false;
    
    // Continue used flag
    this._continueUsed = false;

    // Session defeat counter (for interstitial scheduling)
    // Reset on page reload, persisted only in memory
    this._sessionDefeatCount = 0;

    // Purchase service for IAP
    this.purchaseService = null;

    // Selected tower type for building
    this.selectedTowerType = 'archer';
    
    // Gold rush multiplier
    this._goldRushMultiplier = 1;
    this._goldRushTimer = 0;
    
    // Level selection
    this._currentLevelId = 'meadow';
    this._levelsUnlocked = ['meadow']; // Persist in save later
    
    // Modifier schedule
    this._modifierSchedule = [];
  }

  async init() {
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

    // Initialize asset loader and load models
    this.assetLoader = new AssetLoader(this.app);
    console.log('[GameBootstrap] Loading 3D models...');
    await this.assetLoader.loadAll();
    console.log('[GameBootstrap] 3D models loaded');

    // Initialize build manager (with asset loader for towers)
    this.buildManager = new BuildManager(this.app, this.economyService, this.sceneFactory, this.assetLoader);

    // Initialize projectile controller
    this.projectileController = new ProjectileController(this.app);
    
    // Set up hit callback for audio/VFX
    this.projectileController.setOnHitCallback((position, target) => {
      this.audioService.playEnemyHit();
      if (this.vfxController) {
        this.vfxController.createHitEffect(position);
      }
    });

    // Initialize tower controller
    this.towerController = new TowerController(this.app, this.projectileController);
    
    // Set up fire callback for audio
    this.towerController.setOnFireCallback((position) => {
      this.audioService.playTowerFire();
    });

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

    // Initialize Tower Panel Controller
    this.towerPanelController = new TowerPanelController({
      economyService: this.economyService,
      onTowerSelect: (typeId) => this._onTowerSelect(typeId),
      onUpgrade: (slotId) => this._onUpgradeTower(slotId),
      onSell: (slotId) => this._onSellTower(slotId)
    });

    // Initialize Ability Bar Controller
    this.abilityBarController = new AbilityBarController({
      economyService: this.economyService,
      onUseAbility: (abilityId, ability) => this._onUseAbility(abilityId, ability)
    });

    // Initialize save service (will be connected to platform bridge)
    this.saveService = new SaveService();

    // Initialize meta progression system
    this.metaProgression = new MetaProgressionService(this.saveService);
    await this.metaProgression.initialize();
    this.runModifier = new RunModifier(this.metaProgression);

    // Initialize daily systems
    this.dailyChallenge = new DailyChallengeService(this.saveService);
    await this.dailyChallenge.initialize();
    this.leaderboard = new LeaderboardService(this.platformBridge);
    await this.leaderboard.initialize();
    this.dailyRewards = new DailyRewards(this.saveService);
    await this.dailyRewards.initialize();
    this._checkDailyRewards();

    // Initialize audio service
    this.audioService = new AudioService();

    // Initialize VFX controller
    this.vfxController = new VFXController(this.app);

    // Initialize platform bridge (auto-detects Yandex vs local)
    this.platformBridge = null;
    createPlatformBridge().then(async (bridge) => {
      this.platformBridge = bridge;
      await bridge.init();
      
      // Set UI language from platform
      const lang = bridge.getLanguage();
      this.hudController.setLanguage(lang);
      this.towerPanelController.setLanguage(lang);
      this.abilityBarController.setLanguage(lang);
      
      // Connect save service to platform bridge for cloud storage
      this.saveService.setPlatformBridge(bridge);
      await this.saveService.initialize();
      
      // Initialize PurchaseService for IAP
      this.purchaseService = new PurchaseService(bridge, this.economyService);
      await this.purchaseService.initialize();
      
      // Update HUD with loaded bestWave
      this.hudController.setHighWave(this.saveService.bestWave);
      this.hudController.showMainMenu(this.saveService.bestWave);
      
      // Signal platform that game is ready for interaction
      await bridge.ready();
      
      // Expose game API for UI integration
      window.__game = {
        selectTowerType: (type) => this.selectTowerType(type),
        upgradeTower: (slotId) => this.upgradeTower(slotId),
        sellTower: (slotId) => this.sellTower(slotId),
        purchaseService: this.purchaseService,
        economyService: this.economyService,
        getTowerTypes: () => getAllTowerTypes(),
        getEnemyTypes: () => getAllEnemyTypes(),
        getLevels: () => getAllLevels(),
        selectLevel: (id) => this.selectLevel(id),
        // Meta progression
        metaProgression: this.metaProgression,
        dailyChallenge: this.dailyChallenge,
        leaderboard: this.leaderboard,
        dailyRewards: this.dailyRewards
      };
      
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
    
    // Show tower panel and abilities bar during build phase
    this.towerPanelController.show();
    this.abilityBarController.show();
    
    console.log(`[GameBootstrap] BUILD_PHASE started (${BUILD_PHASE_DURATION}s)`);
  }

  /**
   * Start wave active phase.
   */
  _startWaveActive() {
    this.stateMachine.transition(GameState.WAVE_ACTIVE);
    this.hudController.setTimerVisible(false);
    
    // Hide tower panel during wave, keep abilities visible
    this.towerPanelController.hide();
    
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

    // Normalize coordinates: mouse events use x/y, touch events use clientX/clientY
    const x = event.x ?? event.clientX;
    const y = event.y ?? event.clientY;

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
    console.log(`[GameBootstrap] Build slot ${slotId} clicked, selected type: ${this.selectedTowerType}`);
    
    // Use selected tower type for building
    const towerData = this.buildManager.buildTower(slotId, entity, this.selectedTowerType);
    if (towerData) {
      // Register tower with type info
      this.towerController.registerTower({
        entity: towerData.entity,
        slotId: towerData.slotId,
        position: towerData.position,
        typeId: towerData.typeId || this.selectedTowerType,
        level: towerData.level || 1
      });
      this._updateHudGold();
      this.audioService.playBuildTower();
      
      // VFX: build effect at slot position
      if (this.vfxController && towerData.position) {
        this.vfxController.createBuildEffect(towerData.position);
      }
    }
  }

  /**
   * Spawn an enemy with wave data.
   */
  _spawnEnemy(enemyData) {
    // Get enemy type stats if typeId is provided
    const typeId = enemyData.typeId || 'grunt';
    const typeStats = getEnemyStats(typeId, this.waveManager.currentWave);
    
    const enemy = new EnemyAgent(this.app, {
      typeId: typeId,
      hp: enemyData.hp ?? typeStats.hp,
      speed: enemyData.speed ?? typeStats.speed,
      goldReward: enemyData.goldReward ?? typeStats.goldReward,
      assetLoader: this.assetLoader
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
    
    // VFX: red flash at base
    const basePos = this.sceneFactory.baseMarker?.getPosition();
    if (basePos && this.vfxController) {
      this.vfxController.createLeakEffect({ x: basePos.x, y: basePos.y + 0.5, z: basePos.z });
    }

    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    // Notify wave manager
    this.waveManager.onEnemyRemoved();
  }

  _onEnemyDeath(enemy) {
    let reward = enemy.goldReward;
    
    // Apply gold rush multiplier if active
    if (this._goldRushMultiplier > 1) {
      reward = Math.round(reward * this._goldRushMultiplier);
      console.log(`[GameBootstrap] Gold Rush active! Multiplied reward: ${reward}`);
    }
    
    console.log(`[GameBootstrap] Enemy killed, granting ${reward} gold`);
    this.economyService.addGold(reward);
    this._updateHudGold();
    this.audioService.playEnemyDeath();
    
    // VFX: death burst at enemy position
    if (this.vfxController && enemy.position) {
      this.vfxController.createDeathEffect(enemy.position);
    }

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
    
    // Apply HP regen from meta progression talents
    const regen = this.runModifier.getHpRegenPerWave();
    if (regen > 0) {
      const b = this.baseHealth;
      b.setHP(Math.min(b.currentHP + regen, b.maxHP));
      this._updateHudHP();
      console.log(`[GameBootstrap] HP regenerated: ${regen}`);
    }

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
    
    // Update ability bar cooldowns (always)
    if (this.abilityBarController) {
      this.abilityBarController.update(dt);
    }
    
    // Update gold rush timer
    if (this._goldRushTimer > 0) {
      this._goldRushTimer -= dt;
      if (this._goldRushTimer <= 0) {
        this._goldRushMultiplier = 1;
        console.log('[GameBootstrap] Gold Rush ended');
      }
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
      
      // Update VFX
      if (this.vfxController) {
        this.vfxController.update(dt);
      }
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
    
    // Update affordability in UI controllers
    if (this.towerPanelController) {
      this.towerPanelController.updateAffordability();
    }
    if (this.abilityBarController) {
      this.abilityBarController.updateAffordability();
    }
  }

  /**
   * Start the game from main menu.
   */
  _startGame() {
    console.log('[GameBootstrap] Starting game...');
    
    this._gameStarted = true;
    this._continueUsed = false;
    
    // Generate modifier schedule for this run
    this._modifierSchedule = generateModifierSchedule(3, 5); // 3 modifiers, every 5 waves
    this.waveManager.setModifierSchedule(this._modifierSchedule);
    console.log('[GameBootstrap] Modifier schedule:', this._modifierSchedule.map(m => `${m.modifier.name} (волна ${m.wave})`));
    
    // Load level
    const level = getLevel(this._currentLevelId);
    this._loadLevel(level);
    
    this.hudController.showContinueButton();
    this.hudController.hideMainMenu();
    this._startBuildPhase();
    
    console.log(`[GameBootstrap] Starting gold: ${this.economyService.gold}`);
  }

  /**
   * Select level for next run
   */
  selectLevel(levelId) {
    if (!this._levelsUnlocked.includes(levelId)) {
      console.warn(`[GameBootstrap] Level ${levelId} not unlocked`);
      return false;
    }
    this._currentLevelId = levelId;
    console.log(`[GameBootstrap] Selected level: ${levelId}`);
    return true;
  }

  /**
   * Load level data into scene
   */
  _loadLevel(level) {
    // Update waypoints for enemy spawning
    // Note: This requires SceneFactory to support dynamic waypoints
    // For now, we assume SceneFactory uses LEVELS data
    
    // Apply level difficulty modifiers
    if (level.waveModifiers) {
      // Store for use in wave manager
      this._levelModifiers = level.waveModifiers;
    }
    
    // Update camera
    if (level.camera && this.sceneFactory.getCamera()) {
      const cam = this.sceneFactory.getCamera();
      cam.setPosition(level.camera.x, level.camera.y, level.camera.z);
    }
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

    // Check if player has NoAds - skip ad and continue directly
    if (this.purchaseService && this.purchaseService.hasNoAds()) {
      console.log('[GameBootstrap] NoAds purchased, skipping ad for continue');
      this._doContinue();
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
    this._doContinue();
  }

  /**
   * Execute continue logic (shared between ad and NoAds paths).
   */
  _doContinue() {
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
    // Show meta hub instead of immediately restarting
    this._showMetaHub();
  }

  /**
   * Show Meta Hub screen for talent upgrades between runs
   */
  _showMetaHub() {
    if (!this.metaHubController) {
      this.metaHubController = new MetaHubController({
        metaService: this.metaProgression,
        onStartRun: () => {
          this.metaHubController.hide();
          this._doRestartGame();
        },
        onWatchAd: async () => {
          if (this.platformBridge) {
            const result = await this.platformBridge.showRewarded('shards_x2');
            if (result.rewarded) {
              this.metaProgression.awardShards(this._shardsEarnedThisRun);
              this.metaHubController._render();
            }
          }
        },
        onConvertCrystals: () => {
          const amount = prompt('Сколько кристаллов? (1 = 10 осколков)');
          if (amount && !isNaN(amount)) {
            this.metaProgression.convertCrystalsToShards(parseInt(amount));
            this.metaHubController._render();
          }
        }
      });
    }
    this.metaHubController.show();
  }

  /**
   * Internal restart logic called from MetaHub
   */
  async _doRestartGame() {
    console.log('[GameBootstrap] Restarting game...');

    // Check if interstitial should be shown (every 3rd defeat)
    // Skip if player has NoAds
    const hasNoAds = this.purchaseService && this.purchaseService.hasNoAds();
    const showInterstitial = !hasNoAds && this._sessionDefeatCount % 3 === 0 && this._sessionDefeatCount > 0;

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

  // ==========================================
  // TOWER TYPE SELECTION & MANAGEMENT
  // ==========================================

  /**
   * Select tower type for building.
   * @param {string} typeId - Tower type ID ('archer', 'cannon', 'ice', 'lightning', 'sniper')
   */
  selectTowerType(typeId) {
    const towerType = getTowerType(typeId);
    if (!towerType) {
      console.warn(`[GameBootstrap] Unknown tower type: ${typeId}`);
      return;
    }
    
    this.selectedTowerType = typeId;
    console.log(`[GameBootstrap] Selected tower type: ${typeId} (${towerType.name})`);
  }

  /**
   * Upgrade tower at slot.
   * @param {string} slotId - Slot ID of the tower
   * @returns {boolean} - true if upgrade succeeded
   */
  upgradeTower(slotId) {
    // Check if upgrade method exists in buildManager
    if (!this.buildManager.upgradeTower) {
      console.warn('[GameBootstrap] upgradeTower not implemented in BuildManager');
      return false;
    }
    
    const success = this.buildManager.upgradeTower(slotId);
    if (success) {
      // Update tower in controller if method exists
      if (this.towerController.updateTowerLevel) {
        this.towerController.updateTowerLevel(slotId);
      }
      this._updateHudGold();
      this.audioService.playBuildTower();
      console.log(`[GameBootstrap] Tower upgraded at slot ${slotId}`);
    }
    return success;
  }

  /**
   * Sell tower at slot.
   * @param {string} slotId - Slot ID of the tower
   * @returns {number} - Gold received from sale
   */
  sellTower(slotId) {
    // Check if sell method exists in buildManager
    if (!this.buildManager.sellTower) {
      console.warn('[GameBootstrap] sellTower not implemented in BuildManager');
      return 0;
    }
    
    const gold = this.buildManager.sellTower(slotId);
    if (gold > 0) {
      this.towerController.unregisterTower(slotId);
      this._updateHudGold();
      this.audioService.playBuildTower(); // Reuse sound
      console.log(`[GameBootstrap] Tower sold at slot ${slotId}, received ${gold} gold`);
    }
    return gold;
  }

  /**
   * Get all available tower types.
   * @returns {Array} - Array of tower type definitions
   */
  getTowerTypes() {
    return getAllTowerTypes();
  }

  /**
   * Get all enemy types.
   * @returns {Array} - Array of enemy type definitions
   */
  getEnemyTypes() {
    return getAllEnemyTypes();
  }

  // ==========================================
  // TOWER PANEL & ABILITY BAR CALLBACKS
  // ==========================================

  /**
   * Handle tower selection from UI panel.
   * @param {string} typeId - Selected tower type ID
   */
  _onTowerSelect(typeId) {
    this.selectTowerType(typeId);
    if (this.towerPanelController) {
      const towerType = getTowerType(typeId);
      this.towerPanelController.updateAffordability(this.economyService.gold, towerType?.cost);
    }
  }

  /**
   * Handle tower upgrade from UI panel.
   * @param {string} slotId - Slot ID of tower to upgrade
   */
  _onUpgradeTower(slotId) {
    const success = this.upgradeTower(slotId);
    if (success && this.towerPanelController) {
      this.towerPanelController.updateAffordability(this.economyService.gold);
    }
  }

  /**
   * Handle tower sell from UI panel.
   * @param {string} slotId - Slot ID of tower to sell
   */
  _onSellTower(slotId) {
    const gold = this.sellTower(slotId);
    if (gold > 0 && this.towerPanelController) {
      this.towerPanelController.hideUpgradeMenu();
      this.towerPanelController.updateAffordability(this.economyService.gold);
    }
  }

  /**
   * Handle ability usage from ability bar.
   * @param {string} abilityId - Ability ID
   * @param {Object} ability - Ability configuration
   */
  _onUseAbility(abilityId, ability) {
    console.log(`[GameBootstrap] Using ability: ${abilityId}`);
    
    // Check if we can afford the ability cost
    if (ability.cost > 0 && !this.economyService.canAfford(ability.cost)) {
      console.log(`[GameBootstrap] Cannot afford ability: ${abilityId}`);
      return false;
    }

    // Deduct cost
    if (ability.cost > 0) {
      this.economyService.spendGold(ability.cost);
      this._updateHudGold();
    }

    // Execute ability effect
    switch (abilityId) {
      case 'airstrike':
        this._executeAirstrike();
        break;
      case 'freeze':
        this._executeFreeze();
        break;
      case 'heal':
        this._executeHeal();
        break;
      case 'goldrush':
        this._executeGoldRush();
        break;
      default:
        console.warn(`[GameBootstrap] Unknown ability: ${abilityId}`);
    }

    return true;
  }

  /**
   * Execute airstrike ability - damage all enemies.
   */
  _executeAirstrike() {
    console.log('[GameBootstrap] Executing AIRSTRIKE');
    const damage = 50; // Fixed damage to all enemies
    
    for (const enemy of this.enemies) {
      if (enemy.isActive) {
        enemy.takeDamage(damage);
        if (this.vfxController && enemy.position) {
          this.vfxController.createHitEffect(enemy.position);
        }
      }
    }
    
    this.audioService.playExplosion();
  }

  /**
   * Execute freeze ability - slow all enemies.
   */
  _executeFreeze() {
    console.log('[GameBootstrap] Executing FREEZE');
    // Slow all enemies for 3 seconds
    for (const enemy of this.enemies) {
      if (enemy.isActive && enemy._speed) {
        enemy._originalSpeed = enemy._speed;
        enemy._speed *= 0.3; // 70% slow
        setTimeout(() => {
          if (enemy._originalSpeed) {
            enemy._speed = enemy._originalSpeed;
          }
        }, 3000);
      }
    }
    
    this.audioService.playFreeze?.();
  }

  /**
   * Execute heal ability - restore base HP.
   */
  _executeHeal() {
    console.log('[GameBootstrap] Executing HEAL');
    const healAmount = 3;
    const newHP = Math.min(this.baseHealth.currentHP + healAmount, BASE_MAX_HP);
    this.baseHealth.setHP(newHP);
    this._updateHudHP();
    this.audioService.playHeal?.();
  }

  /**
   * Execute gold rush ability - double gold for 10 seconds.
   */
  _executeGoldRush() {
    console.log('[GameBootstrap] Executing GOLD RUSH');
    this._goldRushMultiplier = 2;
    this._goldRushTimer = 10;
    console.log('[GameBootstrap] Gold Rush activated: 2x gold for 10s');
    this.audioService.playWaveComplete();
  }

  /**
   * Check daily rewards and notify if available
   */
  _checkDailyRewards() {
    const info = this.dailyRewards.getStreakInfo();
    if (info.canClaim) {
      console.log('[GameBootstrap] Daily reward available!', info.nextReward);
      // Could show notification in HUD here
    }
  }
}
