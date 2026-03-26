import * as pc from 'playcanvas';
import { SceneFactory } from '../scene/SceneFactory.js';
import { EnemyAgent } from '../gameplay/EnemyAgent.js';
import { BaseHealth } from '../gameplay/BaseHealth.js';
import { EconomyService } from '../gameplay/EconomyService.js';
import { BuildManager } from '../gameplay/BuildManager.js';
import { TowerController } from '../gameplay/TowerController.js';
import { GameStateMachine, GameState } from './GameStateMachine.js';
import { ENEMY_LEAK_DAMAGE } from '../data/balance.js';
import { STARTING_GOLD } from './constants.js';

/**
 * GameBootstrap
 * Responsible for initializing the PlayCanvas application and canvas.
 * Task 1.1: Blank canvas with empty update loop.
 * Task 1.3: Battlefield and camera initialization.
 * Task 1.5: Test enemy movement along waypoints.
 * Task 1.6: Leak damage integration with base health.
 * Task 2.2: Build slot click detection.
 * Task 2.3: Tower build placement.
 * Task 2.4: Tower targeting.
 */
export class GameBootstrap {
  constructor() {
    this.app = null;
    this.canvas = null;
    this.sceneFactory = null;
    this.testEnemy = null;
    this.enemies = []; // Track all active enemies
    this.baseHealth = null;
    this.economyService = null;
    this.buildManager = null;
    this.towerController = null;
    this.stateMachine = null;
  }

  init() {
    // Get the canvas element
    this.canvas = document.getElementById('application-canvas');

    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    // Create PlayCanvas application
    this.app = new pc.Application(this.canvas, {
      mouse: new pc.Mouse(this.canvas),
      touch: new pc.TouchDevice(this.canvas)
    });

    // Set target design resolution (1280x720 per spec §17.1)
    this.app.setCanvasFillMode(pc.FILLMODE_KEEP_ASPECT);
    this.app.setCanvasResolution(pc.RESOLUTION_AUTO, 1280, 720);

    // Initialize state machine
    this.stateMachine = new GameStateMachine();
    this.stateMachine.initialize();

    // Initialize economy service
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

    // Initialize tower controller
    this.towerController = new TowerController(this.app);

    // Setup build slot click detection
    this._setupBuildSlotClickDetection();

    // Start the update loop
    this.app.on('update', this.onUpdate, this);

    // Start the application
    this.app.start();

    // Spawn a test enemy for verification
    this._spawnTestEnemy();

    console.log('GameBootstrap initialized - battlefield visible');
    console.log(`[GameBootstrap] Starting gold: ${this.economyService.gold}`);
  }

  /**
   * Setup click detection on build slots.
   */
  _setupBuildSlotClickDetection() {
    // Mouse click handler
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, (event) => {
      if (event.button !== pc.MOUSEBUTTON_LEFT) return;
      this._handleBuildSlotClick(event);
    });

    // Touch handler for mobile
    this.app.touch.on(pc.EVENT_TOUCHSTART, (event) => {
      if (event.touches.length > 0) {
        this._handleBuildSlotClick(event.touches[0]);
      }
    });
  }

  /**
   * Handle click on build slots.
   */
  _handleBuildSlotClick(event) {
    const camera = this.sceneFactory.getCamera();
    if (!camera) return;

    // Get mouse position in normalized device coordinates
    const x = event.x / this.canvas.clientWidth;
    const y = event.y / this.canvas.clientHeight;

    // Create ray from camera through mouse position
    const from = camera.camera.screenToWorld(x, y, camera.camera.nearClip);
    const to = camera.camera.screenToWorld(x, y, camera.camera.farClip);

    // Raycast to find build slots
    const results = this.app.systems.rigidbody.raycastFirst(from, to);

    // Check if we hit a build slot
    if (results && results.entity) {
      const entity = results.entity;
      if (entity.slotId) {
        this._onBuildSlotClicked(entity.slotId, entity);
      }
    }
  }

  /**
   * Called when a build slot is clicked.
   */
  _onBuildSlotClicked(slotId, entity) {
    console.log(`[GameBootstrap] Build slot ${slotId} clicked`);

    // Attempt to build a tower
    const towerData = this.buildManager.buildTower(slotId, entity);

    // Register tower with controller if build succeeded
    if (towerData) {
      this.towerController.registerTower(towerData);
    }
  }

  /**
   * Spawn a test enemy to verify path movement and leak damage.
   */
  _spawnTestEnemy() {
    this.testEnemy = new EnemyAgent(this.app);
    this.testEnemy.setOnReachEndpoint((enemy) => {
      this._onEnemyLeak(enemy);
    });

    // Add to enemies array for tower targeting
    this.enemies.push(this.testEnemy);
  }

  /**
   * Handle enemy reaching the base (leak).
   */
  _onEnemyLeak(enemy) {
    console.log('[GameBootstrap] Enemy leaked, applying damage to base');
    this.baseHealth.takeDamage(ENEMY_LEAK_DAMAGE);

    // Remove from enemies array
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }

    this.testEnemy = null;
  }

  /**
   * Handle defeat condition.
   */
  _onDefeat() {
    console.log('[GameBootstrap] DEFEAT - Base HP reached 0');
    this.stateMachine.transition(GameState.DEFEAT);
  }

  onUpdate(dt) {
    // Only update if not in DEFEAT state
    if (this.stateMachine.isInState(GameState.DEFEAT)) {
      return;
    }

    // Update test enemy movement
    if (this.testEnemy && this.testEnemy.isActive) {
      this.testEnemy.update(dt);
    }

    // Update tower targeting
    this.towerController.update(this.enemies);
  }
}
