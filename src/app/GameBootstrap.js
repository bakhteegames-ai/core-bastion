import * as pc from 'playcanvas';
import { SceneFactory } from '../scene/SceneFactory.js';
import { EnemyAgent } from '../gameplay/EnemyAgent.js';
import { BaseHealth } from '../gameplay/BaseHealth.js';
import { GameStateMachine, GameState } from './GameStateMachine.js';
import { ENEMY_LEAK_DAMAGE } from '../data/balance.js';

/**
 * GameBootstrap
 * Responsible for initializing the PlayCanvas application and canvas.
 * Task 1.1: Blank canvas with empty update loop.
 * Task 1.3: Battlefield and camera initialization.
 * Task 1.5: Test enemy movement along waypoints.
 * Task 1.6: Leak damage integration with base health.
 */
export class GameBootstrap {
  constructor() {
    this.app = null;
    this.canvas = null;
    this.sceneFactory = null;
    this.testEnemy = null;
    this.baseHealth = null;
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

    // Initialize base health
    this.baseHealth = new BaseHealth();
    this.baseHealth.setOnDefeatCallback(() => {
      this._onDefeat();
    });

    // Create battlefield scene
    this.sceneFactory = new SceneFactory(this.app);
    this.sceneFactory.createBattlefield();

    // Start the update loop
    this.app.on('update', this.onUpdate, this);

    // Start the application
    this.app.start();

    // Spawn a test enemy for verification
    this._spawnTestEnemy();

    console.log('GameBootstrap initialized - battlefield visible');
  }

  /**
   * Spawn a test enemy to verify path movement and leak damage.
   */
  _spawnTestEnemy() {
    this.testEnemy = new EnemyAgent(this.app);
    this.testEnemy.setOnReachEndpoint((enemy) => {
      this._onEnemyLeak(enemy);
    });
  }

  /**
   * Handle enemy reaching the base (leak).
   * Task 1.6: Apply damage to base.
   */
  _onEnemyLeak(enemy) {
    console.log('[GameBootstrap] Enemy leaked, applying damage to base');

    // Apply leak damage to base
    this.baseHealth.takeDamage(ENEMY_LEAK_DAMAGE);

    // Remove enemy
    this.testEnemy = null;
  }

  /**
   * Handle defeat condition.
   */
  _onDefeat() {
    console.log('[GameBootstrap] DEFEAT - Base HP reached 0');

    // Transition to DEFEAT state
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
  }
}
