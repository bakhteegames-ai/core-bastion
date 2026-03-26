import * as pc from 'playcanvas';
import { SceneFactory } from '../scene/SceneFactory.js';
import { EnemyAgent } from '../gameplay/EnemyAgent.js';
import { BaseHealth } from '../gameplay/BaseHealth.js';
import { EconomyService } from '../gameplay/EconomyService.js';
import { BuildManager } from '../gameplay/BuildManager.js';
import { TowerController } from '../gameplay/TowerController.js';
import { ProjectileController } from '../gameplay/ProjectileController.js';
import { WaveManager } from '../gameplay/WaveManager.js';
import { GameStateMachine, GameState } from './GameStateMachine.js';
import { STARTING_GOLD, BUILD_PHASE_DURATION } from './constants.js';
import { ENEMY_LEAK_DAMAGE } from '../data/balance.js';

/**
 * GameBootstrap
 * Task 3.2: Build Phase Flow
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

    // Build phase timing
    this.buildPhaseTimer = 0;
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

    // Setup input
    this._setupBuildSlotClickDetection();

    // Start game loop
    this.app.on('update', this.onUpdate, this);
    this.app.start();

    // Start first build phase (READY -> BUILD_PHASE)
    this._startBuildPhase();

    console.log('GameBootstrap initialized');
    console.log(`[GameBootstrap] Starting gold: ${this.economyService.gold}`);
  }

  /**
   * Start build phase (before first wave or between waves).
   */
  _startBuildPhase() {
    this.stateMachine.transition(GameState.BUILD_PHASE);
    this.buildPhaseTimer = BUILD_PHASE_DURATION;
    console.log(`[GameBootstrap] BUILD_PHASE started (${BUILD_PHASE_DURATION}s)`);
  }

  /**
   * Start wave active phase.
   */
  _startWaveActive() {
    this.stateMachine.transition(GameState.WAVE_ACTIVE);
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

    const x = event.x / this.canvas.clientWidth;
    const y = event.y / this.canvas.clientHeight;

    const from = camera.camera.screenToWorld(x, y, camera.camera.nearClip);
    const to = camera.camera.screenToWorld(x, y, camera.camera.farClip);

    // Raycast to find build slots
    const results = this.app.systems.rigidbody.raycastFirst(from, to);

    if (results && results.entity && results.entity.slotId) {
      this._onBuildSlotClicked(results.entity.slotId, results.entity);
    }
  }

  _onBuildSlotClicked(slotId, entity) {
    console.log(`[GameBootstrap] Build slot ${slotId} clicked`);
    const towerData = this.buildManager.buildTower(slotId, entity);
    if (towerData) {
      this.towerController.registerTower(towerData);
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

    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    // Notify wave manager
    this.waveManager.onEnemyRemoved();
  }

  _onWaveComplete(waveNumber) {
    console.log(`[GameBootstrap] Wave ${waveNumber} complete!`);
    // Transition back to BUILD_PHASE for next wave
    this._startBuildPhase();
  }

  _onDefeat() {
    console.log('[GameBootstrap] DEFEAT - Base HP reached 0');
    this.stateMachine.transition(GameState.DEFEAT);
  }

  onUpdate(dt) {
    // No updates during DEFEAT
    if (this.stateMachine.isInState(GameState.DEFEAT)) {
      return;
    }

    // BUILD_PHASE: countdown timer
    if (this.stateMachine.isInState(GameState.BUILD_PHASE)) {
      this.buildPhaseTimer -= dt;
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
}
