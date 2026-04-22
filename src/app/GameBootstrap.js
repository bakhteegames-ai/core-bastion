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
import { getLevel, getAllLevels, getLevelIds, DEFAULT_LEVEL_ID } from '../data/levels.js';
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
    this._currentLevelId = DEFAULT_LEVEL_ID;
    this._currentLevel = getLevel(DEFAULT_LEVEL_ID);
    this._levelsUnlocked = getLevelIds();
    
    // Modifier schedule
    this._modifierSchedule = [];
    this._buildPhaseBonus = 0;
    this._shardsEarnedThisRun = 0;
    this._enemiesKilledThisRun = 0;
    this._coreAlertCooldown = 0;
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
    this.economyService = new EconomyService(this._getStartingGold());

    // Initialize base health
    this.baseHealth = new BaseHealth();
    this.baseHealth.setOnDefeatCallback(() => {
      this._onDefeat();
    });

    // Create battlefield scene
    this.sceneFactory = new SceneFactory(this.app, this._currentLevel);
    this.sceneFactory.createBattlefield(this._currentLevel);

    // Initialize asset loader and load models
    this.assetLoader = new AssetLoader(this.app);
    console.log('[GameBootstrap] Loading 3D models...');
    await this.assetLoader.loadAll();
    console.log('[GameBootstrap] 3D models loaded');
    this.sceneFactory.setAssetLoader(this.assetLoader);
    this.sceneFactory.createBattlefield(this._currentLevel);

    // Initialize build manager (with asset loader for towers)
    this.buildManager = new BuildManager(this.app, this.economyService, this.sceneFactory, this.assetLoader);

    // Initialize projectile controller
    this.projectileController = new ProjectileController(this.app);
    
    // Initialize tower controller
    this.towerController = new TowerController(this.app, this.projectileController);

    // Initialize wave manager
    this.waveManager = new WaveManager(this.app, {
      assetLoader: this.assetLoader,
      waypoints: this._currentLevel.waypoints,
      wavePlan: this._currentLevel.wavePlan
    });
    this.waveManager.setLevelContext(this._currentLevel);
    this.buildManager.setWaveManager(this.waveManager);
    this.waveManager.spawner.setOnEnemySpawned((enemy) => {
      this._registerEnemy(enemy, true);
    });
    this.waveManager.setOnSpawnEnemy((enemyData) => {
      this._spawnEnemy(enemyData);
    });
    this.waveManager.setOnEnemyDeath((enemy) => {
      this._onEnemyDeath(enemy);
    });
    this.waveManager.setOnEnemyLeak((enemy) => {
      this._onEnemyLeak(enemy);
    });
    this.waveManager.setOnWaveComplete((waveNumber) => {
      this._onWaveComplete(waveNumber);
    });
    this.waveManager.setOnWaveStart((waveNumber) => {
      this._onWaveStart(waveNumber);
      this.runModifier?.applyToWave(waveNumber);
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

    // Initialize audio / VFX early so callbacks are safe
    this.audioService = new AudioService();
    this.vfxController = new VFXController(this.app);

    // Set up runtime callbacks after services exist
    this.projectileController.setOnHitCallback((position, target, options = {}) => {
      this.audioService.playEnemyHit();
      this.vfxController?.createHitEffect(position, options);
    });
    this.towerController.setOnFireCallback(() => {
      this.audioService.playTowerFire();
    });

    // Initialize platform bridge first so save/meta/daily systems read a coherent source of truth
    this.platformBridge = await createPlatformBridge();
    await this.platformBridge.init();

    // Initialize save service with bridge attached before meta/daily systems
    this.saveService = new SaveService(this.platformBridge);
    await this.saveService.initialize();

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

    // Initialize PurchaseService for IAP
    this.purchaseService = new PurchaseService(this.platformBridge, this.economyService);
    await this.purchaseService.initialize();

    // Set UI language from platform
    const lang = this.platformBridge.getLanguage();
    this.hudController.setLanguage(lang);
    this.towerPanelController.setLanguage(lang);
    this.abilityBarController.setLanguage(lang);

    // Update HUD with loaded bestWave
    this.hudController.setHighWave(this.saveService.bestWave);
    this.hudController.showMainMenu(this.saveService.bestWave);

    // Expose game API for UI integration
    window.__game = {
      selectTowerType: (type) => this.selectTowerType(type),
      upgradeTower: (slotId) => this.upgradeTower(slotId),
      sellTower: (slotId) => this.sellTower(slotId),
      purchaseService: this.purchaseService,
      economyService: this.economyService,
      waveManager: this.waveManager,
      getTowerTypes: () => getAllTowerTypes(),
      getEnemyTypes: () => getAllEnemyTypes(),
      getLevels: () => getAllLevels(),
      selectLevel: (id) => this.selectLevel(id),
      metaProgression: this.metaProgression,
      dailyChallenge: this.dailyChallenge,
      leaderboard: this.leaderboard,
      dailyRewards: this.dailyRewards
    };

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

    // Signal platform that game is ready for interaction
    await this.platformBridge.ready();

    console.log(`[GameBootstrap] Platform bridge ready (lang: ${lang})`);
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
    const baseBuildPhaseDuration = this._currentLevel?.pacing?.buildPhaseDuration ?? BUILD_PHASE_DURATION;
    const buildPhaseDuration = Math.max(1, baseBuildPhaseDuration + (this._buildPhaseBonus || 0));
    this.buildPhaseTimer = buildPhaseDuration;
    this.hudController.setTimerVisible(true);
    this.hudController.setTimerValue(buildPhaseDuration);
    
    // Show tower panel and abilities bar during build phase
    this.towerPanelController.show();
    this.abilityBarController.show();
    this.buildManager?.setRangeIndicatorsVisible(true);
    
    console.log(`[GameBootstrap] BUILD_PHASE started (${buildPhaseDuration}s)`);
  }

  /**
   * Start wave active phase.
   */
  _startWaveActive() {
    this.stateMachine.transition(GameState.WAVE_ACTIVE);
    this.hudController.setTimerVisible(false);
    
    // Hide tower panel during wave, keep abilities visible
    this.towerPanelController.hide();
    this.buildManager?.setRangeIndicatorsVisible(false);
    
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
    if (Math.abs(dir.y) < 0.0001) return null;

    const t = (planeY - origin.y) / dir.y;
    if (t < 0) return null;

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
    
    const towerData = this.buildManager.buildTower(slotId, entity, this.selectedTowerType);
    if (towerData) {
      this.towerController.registerTower({
        entity: towerData.entity,
        slotId: towerData.slotId,
        position: towerData.position,
        typeId: towerData.typeId || this.selectedTowerType,
        level: towerData.level || 1
      });
      this._updateHudGold();
      this.audioService.playBuildTower();
      this.vfxController?.createBuildEffect(towerData.position);
    }
  }

  /**
   * Spawn an enemy with wave data.
   */
  _spawnEnemy(enemyData) {
    if (enemyData.enemy) {
      return enemyData.enemy;
    }

    const typeId = enemyData.typeId || 'grunt';
    const typeStats = getEnemyStats(typeId, this.waveManager.currentWave);
    
    const enemy = new EnemyAgent(this.app, {
      typeId,
      hp: enemyData.hp ?? typeStats.hp,
      speed: enemyData.speed ?? typeStats.speed,
      goldReward: enemyData.goldReward ?? typeStats.goldReward,
      assetLoader: this.assetLoader,
      waypoints: this._currentLevel?.waypoints
    });

    enemy.setOnReachEndpoint((e) => {
      this._onEnemyLeak(e);
    });

    enemy.setOnDeath((e) => {
      this._onEnemyDeath(e);
    });

    this._registerEnemy(enemy, false);
    return enemy;
  }

  _registerEnemy(enemy, managedBySpawner = false) {
    if (!enemy || this.enemies.includes(enemy)) {
      return;
    }

    enemy._managedBySpawner = managedBySpawner;
    this.enemies.push(enemy);

    const spawnMarkerPos = this.sceneFactory?.spawnMarker?.getPosition?.();
    const fallbackSpawn = this._currentLevel?.spawn;
    const spawnPosition = spawnMarkerPos || fallbackSpawn;
    if (spawnPosition && this.vfxController) {
      this.vfxController.createSpawnEffect(
        {
          x: spawnPosition.x,
          y: (spawnPosition.y ?? 0) + 0.2,
          z: spawnPosition.z
        },
        {
          color: this._currentLevel?.theme?.spawnColor
        }
      );
    }
  }

  _removeEnemyReference(enemy) {
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies[index] = this.enemies[this.enemies.length - 1];
      this.enemies.pop();
    }
  }

  _onEnemyLeak(enemy) {
    console.log('[GameBootstrap] Enemy leaked, applying damage to base');
    this.baseHealth.takeDamage(ENEMY_LEAK_DAMAGE);
    this._updateHudHP();
    this.audioService.playEnemyLeak();
    
    const basePos = this.sceneFactory.baseMarker?.getPosition();
    if (basePos && this.vfxController) {
      this.vfxController.createLeakEffect({ x: basePos.x, y: basePos.y + 0.5, z: basePos.z });
    }

    this._removeEnemyReference(enemy);
    if (!enemy?._managedBySpawner) {
      this.waveManager.onEnemyRemoved();
    }
  }

  _onEnemyDeath(enemy) {
    let reward = enemy.goldReward;
    const runGoldMultiplier = this.runModifier?.getGoldMultiplier?.() || 1;
    if (runGoldMultiplier > 1) {
      reward = Math.round(reward * runGoldMultiplier);
    }

    if (this._goldRushMultiplier > 1) {
      reward = Math.round(reward * this._goldRushMultiplier);
      console.log(`[GameBootstrap] Gold Rush active! Multiplied reward: ${reward}`);
    }

    this._enemiesKilledThisRun += 1;
    console.log(`[GameBootstrap] Enemy killed, granting ${reward} gold`);
    this.economyService.addGold(reward);
    this._updateHudGold();
    this.audioService.playEnemyDeath();
    
    if (this.vfxController && enemy.position) {
      this.vfxController.createDeathEffect(enemy.position);
    }

    this._removeEnemyReference(enemy);
    if (!enemy?._managedBySpawner) {
      this.waveManager.onEnemyRemoved();
    }
  }

  _onWaveStart(waveNumber) {
    this.hudController.setWave(waveNumber);
    this.audioService.playWaveStart();
    this._coreAlertCooldown = 0;
  }

  async _onWaveComplete(waveNumber) {
    console.log(`[GameBootstrap] Wave ${waveNumber} complete!`);
    
    const regen = this.runModifier.getHpRegenPerWave();
    if (regen > 0) {
      const base = this.baseHealth;
      base.setHP(Math.min(base.currentHP + regen, base.maxHP));
      this._updateHudHP();
      console.log(`[GameBootstrap] HP regenerated: ${regen}`);
    }

    this.audioService.playWaveComplete();
    const newRecord = await this.saveService.updateBestWave(waveNumber);
    if (newRecord) {
      this.hudController.setHighWave(this.saveService.bestWave);
    }

    this.runModifier?.applyToWaveCompletion(waveNumber, this);
    this._startBuildPhase();
  }

  _getCoreAlertOrigin() {
    const corePocket = this.sceneFactory?.zoneAnchors?.CorePocket?.getPosition?.();
    if (corePocket) {
      return corePocket;
    }

    return this.sceneFactory?.baseMarker?.getPosition?.() || this._currentLevel?.base || null;
  }

  _updateCombatAlerts(dt) {
    this._coreAlertCooldown = Math.max(0, this._coreAlertCooldown - dt);
    if (this._coreAlertCooldown > 0 || !this.vfxController) {
      return;
    }

    const alertOrigin = this._getCoreAlertOrigin();
    if (!alertOrigin) {
      return;
    }

    const hasCoreThreat = this.enemies.some((enemy) => {
      if (!enemy?.isActive) {
        return false;
      }

      const enemyPos = enemy.position;
      if (!enemyPos) {
        return false;
      }

      const dx = enemyPos.x - alertOrigin.x;
      const dz = enemyPos.z - alertOrigin.z;
      return dx * dx + dz * dz <= 20.25;
    });

    if (!hasCoreThreat) {
      return;
    }

    const basePos = this.sceneFactory?.baseMarker?.getPosition?.() || alertOrigin;
    this.vfxController.createCoreAlertEffect(
      {
        x: basePos.x,
        y: (basePos.y ?? 0) + 0.25,
        z: basePos.z
      },
      {
        color: this._currentLevel?.theme?.coreColor
      }
    );
    this._coreAlertCooldown = 0.7;
  }

  _awardDefeatShards() {
    const waveReached = this.waveManager?.currentWave || 0;
    const shards = calculateRunShards(waveReached, this._enemiesKilledThisRun, false);
    this._shardsEarnedThisRun = shards;
    this.metaProgression.awardShards(shards);
    this.metaProgression.recordRun(waveReached, this._enemiesKilledThisRun);
    this.leaderboard?.submitScore?.(waveReached, 'endless');
    console.log(`[GameBootstrap] Awarded ${shards} shards for run`);
  }

  _onDefeat() {
    console.log('[GameBootstrap] DEFEAT - Base HP reached 0');
    this._sessionDefeatCount++;
    console.log(`[GameBootstrap] Session defeat count: ${this._sessionDefeatCount}`);
    
    this.stateMachine.transition(GameState.DEFEAT);
    
    if (this.metaProgression && !this._continueUsed) {
      this._awardDefeatShards();
    }
    
    this.audioService.playDefeat();
    this.hudController.showDefeat(
      this.waveManager.currentWave,
      this.saveService.highWave
    );
  }

  onUpdate(dt) {
    this.sceneFactory?.update(dt);

    if (!this._gameStarted) {
      return;
    }
    
    if (this.stateMachine.isInState(GameState.DEFEAT)) {
      return;
    }
    
    this.abilityBarController?.update(dt);
    
    if (this._goldRushTimer > 0) {
      this._goldRushTimer -= dt;
      if (this._goldRushTimer <= 0) {
        this._goldRushMultiplier = 1;
        console.log('[GameBootstrap] Gold Rush ended');
      }
    }

    if (this.stateMachine.isInState(GameState.BUILD_PHASE)) {
      this.buildPhaseTimer -= dt;
      this.hudController.setTimerValue(this.buildPhaseTimer);
      if (this.buildPhaseTimer <= 0) {
        this._startWaveActive();
      }
      return;
    }

      if (this.stateMachine.isInState(GameState.WAVE_ACTIVE)) {
        this.waveManager.update(dt);
  
        for (const enemy of this.enemies) {
          if (enemy.isActive && !enemy._managedBySpawner) {
            enemy.update(dt);
          }
        }

      this._updateCombatAlerts(dt);
      this.towerController.update(this.enemies, dt);
      this.projectileController.update(dt);
      this.vfxController?.update(dt);
    }
  }

  _updateHud() {
    this._updateHudWave();
    this._updateHudHP();
    this._updateHudGold();
  }

  _updateHudWave() {
    this.hudController.setWave(this.waveManager.currentWave);
  }

  _updateHudHP() {
    this.hudController.setBaseHP(this.baseHealth.currentHP, this.baseHealth.maxHP);
  }

  _updateHudGold() {
    this.hudController.setGold(this.economyService.gold);
    this.towerPanelController?.updateAffordability();
    this.abilityBarController?.updateAffordability();
  }

  /**
   * Start the game from main menu.
   */
  _startGame() {
    console.log('[GameBootstrap] Starting game...');
    
    this._gameStarted = true;
    this._continueUsed = false;
    this._enemiesKilledThisRun = 0;
    this._shardsEarnedThisRun = 0;
    this._buildPhaseBonus = 0;
    this._coreAlertCooldown = 0;
    this.baseHealth.reset();
    this.economyService.reset(this._getStartingGold());
    this.runModifier.applyToRun(this);
    
    this._modifierSchedule = generateModifierSchedule(3, 5);
    this.waveManager.setModifierSchedule(this._modifierSchedule);
    console.log('[GameBootstrap] Modifier schedule:', this._modifierSchedule.map(m => `${m.modifier.name} (волна ${m.wave})`));
    
    this._loadLevel(getLevel(this._currentLevelId));
    
    this.hudController.showContinueButton();
    this.hudController.hideMainMenu();
    this._updateHud();
    this._startBuildPhase();
    
    console.log(`[GameBootstrap] Starting gold: ${this.economyService.gold}`);
  }

  selectLevel(levelId) {
    if (!this._levelsUnlocked.includes(levelId)) {
      console.warn(`[GameBootstrap] Level ${levelId} not unlocked`);
      return false;
    }
    this._currentLevelId = levelId;
    this._loadLevel(getLevel(levelId));
    console.log(`[GameBootstrap] Selected level: ${levelId}`);
    return true;
  }

  _loadLevel(level) {
    this._currentLevel = level;
    this._coreAlertCooldown = 0;

    if (level.waveModifiers) {
      this._levelModifiers = level.waveModifiers;
    }

    if (this.waveManager) {
      this.waveManager.setLevelContext(level);
    }

    if (this.sceneFactory) {
      const needsRebuild = !this.sceneFactory.sceneRoot || this.sceneFactory.currentLevel?.id !== level.id;
      this.sceneFactory.setLevel(level);
      if (needsRebuild) {
        this.sceneFactory.createBattlefield(level);
      }
    }

    if (level.camera && this.sceneFactory?.getCamera()) {
      const cam = this.sceneFactory.getCamera();
      cam.setPosition(level.camera.x, level.camera.y, level.camera.z);
      cam.lookAt(level.camera.target.x, level.camera.target.y, level.camera.target.z);
    }
  }

  async _continueGame() {
    if (this._continueUsed) {
      console.log('[GameBootstrap] Continue already used this session');
      return;
    }

    if (this.purchaseService && this.purchaseService.hasNoAds()) {
      console.log('[GameBootstrap] NoAds purchased, skipping ad for continue');
      this._doContinue();
      return;
    }

    if (!this.stateMachine.transition(GameState.AD_PAUSED)) {
      console.error('[GameBootstrap] Failed to enter AD_PAUSED state');
      return;
    }

    console.log('[GameBootstrap] Entered AD_PAUSED, showing ad...');
    this._pauseForAd();

    const result = await this.platformBridge.showRewarded('continue');
    this._resumeAfterAd();

    if (!result.rewarded) {
      console.log('[GameBootstrap] Ad not completed, returning to DEFEAT');
      this.stateMachine.transition(GameState.DEFEAT);
      return;
    }

    console.log('[GameBootstrap] Ad watched, continuing game...');
    this._doContinue();
  }

  _doContinue() {
    this._continueUsed = true;
    this.hudController.hideContinueButton();
    this.hudController.hideDefeat();
    this.baseHealth.setHP(5);
    this._updateHudHP();
    this.stateMachine.transition(GameState.WAVE_ACTIVE);
    console.log('[GameBootstrap] Continued! HP restored to 5, wave preserved');
  }

  async _restartGame() {
    this._showMetaHub();
  }

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
            this.metaProgression.convertCrystalsToShards(parseInt(amount, 10));
            this.metaHubController._render();
          }
        }
      });
    }
    this.metaHubController.show();
  }

  async _doRestartGame() {
    console.log('[GameBootstrap] Restarting game...');

    const hasNoAds = this.purchaseService && this.purchaseService.hasNoAds();
    const showInterstitial = !hasNoAds && this._sessionDefeatCount % 3 === 0 && this._sessionDefeatCount > 0;

    if (showInterstitial) {
      if (!this.stateMachine.transition(GameState.AD_PAUSED)) {
        console.warn('[GameBootstrap] Cannot transition to AD_PAUSED, proceeding without ad');
      } else {
        console.log('[GameBootstrap] Entered AD_PAUSED for interstitial...');
        this._pauseForAd();
        try {
          await this.platformBridge.showInterstitial('restart');
        } catch (e) {
          console.warn('[GameBootstrap] Interstitial ad failed, continuing restart:', e);
        }
        this._resumeAfterAd();
        this.stateMachine.transition(GameState.BOOT);
      }
    } else if (!this.stateMachine.transition(GameState.BOOT)) {
      console.error('[GameBootstrap] Failed to transition to BOOT state');
      return;
    }

    this.hudController.hideDefeat();

    for (const enemy of this.enemies) {
      if (!enemy._managedBySpawner) {
        enemy.destroy();
      }
    }
    this.enemies = [];

    this.buildManager.removeAllTowers();
    this.towerController.clearTowers();
    this.projectileController.clearProjectiles();
    this.waveManager.reset();
    this.baseHealth.reset();
    this.economyService.reset(this._getStartingGold());
    this._buildPhaseBonus = 0;
    this._coreAlertCooldown = 0;

    this.stateMachine.transition(GameState.READY);
    this._continueUsed = false;
    this.hudController.showContinueButton();
    this._updateHud();
    this._startBuildPhase();

    console.log('[GameBootstrap] Game restarted');
  }

  _pauseForAd() {
    console.log('[GameBootstrap] Pausing for ad...');
    if (this.audioService) {
      this.audioService.mute();
      this.audioService.pause();
    }
  }

  _resumeAfterAd() {
    console.log('[GameBootstrap] Resuming after ad...');
    if (this.audioService) {
      this.audioService.resume();
      this.audioService.unmute();
    }
  }

  selectTowerType(typeId) {
    const towerType = getTowerType(typeId);
    if (!towerType) {
      console.warn(`[GameBootstrap] Unknown tower type: ${typeId}`);
      return;
    }
    
    this.selectedTowerType = typeId;
    console.log(`[GameBootstrap] Selected tower type: ${typeId} (${towerType.name})`);
  }

  upgradeTower(slotId) {
    if (!this.buildManager.upgradeTower) {
      console.warn('[GameBootstrap] upgradeTower not implemented in BuildManager');
      return false;
    }
    
    const success = this.buildManager.upgradeTower(slotId);
    if (success) {
      if (this.towerController.upgradeTower) {
        this.towerController.upgradeTower(slotId);
      }
      this._updateHudGold();
      this.audioService.playBuildTower();
      console.log(`[GameBootstrap] Tower upgraded at slot ${slotId}`);
    }
    return success;
  }

  sellTower(slotId) {
    if (!this.buildManager.sellTower) {
      console.warn('[GameBootstrap] sellTower not implemented in BuildManager');
      return 0;
    }
    
    const gold = this.buildManager.sellTower(slotId);
    if (gold > 0) {
      this.towerController.unregisterTower(slotId);
      this._updateHudGold();
      this.audioService.playBuildTower();
      console.log(`[GameBootstrap] Tower sold at slot ${slotId}, received ${gold} gold`);
    }
    return gold;
  }

  getTowerTypes() {
    return getAllTowerTypes();
  }

  getEnemyTypes() {
    return getAllEnemyTypes();
  }

  _onTowerSelect(typeId) {
    this.selectTowerType(typeId);
    if (this.towerPanelController) {
      const towerType = getTowerType(typeId);
      this.towerPanelController.updateAffordability(this.economyService.gold, towerType?.cost);
    }
  }

  _onUpgradeTower(slotId) {
    const success = this.upgradeTower(slotId);
    if (success && this.towerPanelController) {
      this.towerPanelController.updateAffordability(this.economyService.gold);
    }
  }

  _onSellTower(slotId) {
    const gold = this.sellTower(slotId);
    if (gold > 0 && this.towerPanelController) {
      this.towerPanelController.hideUpgradeMenu();
      this.towerPanelController.updateAffordability(this.economyService.gold);
    }
  }

  _onUseAbility(abilityId, ability) {
    console.log(`[GameBootstrap] Using ability: ${abilityId}`);
    
    if (ability.cost > 0 && !this.economyService.canAfford(ability.cost)) {
      console.log(`[GameBootstrap] Cannot afford ability: ${abilityId}`);
      return false;
    }

    if (ability.cost > 0) {
      this.economyService.spendGold(ability.cost);
      this._updateHudGold();
    }

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

  _executeAirstrike() {
    console.log('[GameBootstrap] Executing AIRSTRIKE');
    const damage = 50;
    
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

  _executeFreeze() {
    console.log('[GameBootstrap] Executing FREEZE');
    for (const enemy of this.enemies) {
      if (enemy.isActive && enemy._speed) {
        enemy._originalSpeed = enemy._speed;
        enemy._speed *= 0.3;
        setTimeout(() => {
          if (enemy._originalSpeed) {
            enemy._speed = enemy._originalSpeed;
          }
        }, 3000);
      }
    }
    
    this.audioService.playFreeze?.();
  }

  _executeHeal() {
    console.log('[GameBootstrap] Executing HEAL');
    const healAmount = 3;
    const newHP = Math.min(this.baseHealth.currentHP + healAmount, this.baseHealth.maxHP);
    this.baseHealth.setHP(newHP);
    this._updateHudHP();
    this.audioService.playHeal?.();
  }

  _executeGoldRush() {
    console.log('[GameBootstrap] Executing GOLD RUSH');
    this._goldRushMultiplier = 2;
    this._goldRushTimer = 10;
    console.log('[GameBootstrap] Gold Rush activated: 2x gold for 10s');
    this.audioService.playWaveComplete();
  }

  _checkDailyRewards() {
    const info = this.dailyRewards.getStreakInfo();
    if (info.canClaim) {
      console.log('[GameBootstrap] Daily reward available!', info.nextReward);
    }
  }

  _getStartingGold() {
    return this._currentLevel?.pacing?.startingGold ?? STARTING_GOLD;
  }
}
