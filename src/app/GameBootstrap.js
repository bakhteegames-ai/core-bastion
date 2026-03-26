import * as pc from 'playcanvas';
import { SceneFactory } from '../scene/SceneFactory.js';
import { EnemyAgent } from '../gameplay/EnemyAgent.js';
import { BaseHealth } from '../gameplay/BaseHealth.js';
import { EconomyService } from '../gameplay/EconomyService.js';
import { BuildManager } from '../gameplay/BuildManager.js';
import { TowerController } from '../gameplay/TowerController.js';
import { ProjectileController } from '../gameplay/ProjectileController.js';
import { GameStateMachine, GameState } from './GameStateMachine.js';
import { ENEMY_LEAK_DAMAGE } from '../data/balance.js';
import { STARTING_GOLD } from './constants.js';

/**
 * GameBootstrap
 * Task 2.5: Projectile and hit logic.
 */
export class GameBootstrap {
  constructor() {
    this.app = null;
    this.canvas = null;
    this.sceneFactory = null;
    this.testEnemy = null;
    this.enemies = [];
    this.baseHealth = null;
    this.economyService = null;
    this.buildManager = null;
    this.towerController = null;
    this.projectileController = null;
    this.stateMachine = null;
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

    this.stateMachine = new GameStateMachine();
    this.stateMachine.initialize();

    this.economyService = new EconomyService(STARTING_GOLD);

    this.baseHealth = new BaseHealth();
    this.baseHealth.setOnDefeatCallback(() => {
      this._onDefeat();
    });

    this.sceneFactory = new SceneFactory(this.app);
    this.sceneFactory.createBattlefield();

    this.buildManager = new BuildManager(this.app, this.economyService, this.sceneFactory);

    this.projectileController = new ProjectileController(this.app);

    this.towerController = new TowerController(this.app, this.projectileController);

    this._setupBuildSlotClickDetection();

    this.app.on('update', this.onUpdate, this);
    this.app.start();

    this._spawnTestEnemy();

    console.log('GameBootstrap initialized - battlefield visible');
    console.log(`[GameBootstrap] Starting gold: ${this.economyService.gold}`);
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
    const camera = this.sceneFactory.getCamera();
    if (!camera) return;

    const x = event.x / this.canvas.clientWidth;
    const y = event.y / this.canvas.clientHeight;

    const from = camera.camera.screenToWorld(x, y, camera.camera.nearClip);
    const to = camera.camera.screenToWorld(x, y, camera.camera.farClip);

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

  _spawnTestEnemy() {
    this.testEnemy = new EnemyAgent(this.app);
    this.testEnemy.setOnReachEndpoint((enemy) => {
      this._onEnemyLeak(enemy);
    });
    this.enemies.push(this.testEnemy);
  }

  _onEnemyLeak(enemy) {
    console.log('[GameBootstrap] Enemy leaked, applying damage to base');
    this.baseHealth.takeDamage(ENEMY_LEAK_DAMAGE);
    const index = this.enemies.indexOf(enemy);
    if (index !== -1) {
      this.enemies.splice(index, 1);
    }
    this.testEnemy = null;
  }

  _onDefeat() {
    console.log('[GameBootstrap] DEFEAT - Base HP reached 0');
    this.stateMachine.transition(GameState.DEFEAT);
  }

  onUpdate(dt) {
    if (this.stateMachine.isInState(GameState.DEFEAT)) {
      return;
    }

    if (this.testEnemy && this.testEnemy.isActive) {
      this.testEnemy.update(dt);
    }

    this.towerController.update(this.enemies, dt);
    this.projectileController.update(dt);
  }
}
