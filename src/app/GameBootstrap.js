import * as pc from 'playcanvas';
import { SceneFactory } from '../scene/SceneFactory.js';

/**
 * GameBootstrap
 * Responsible for initializing the PlayCanvas application and canvas.
 * Task 1.1: Blank canvas with empty update loop.
 * Task 1.3: Battlefield and camera initialization.
 */
export class GameBootstrap {
  constructor() {
    this.app = null;
    this.canvas = null;
    this.sceneFactory = null;
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

    // Create battlefield scene
    this.sceneFactory = new SceneFactory(this.app);
    this.sceneFactory.createBattlefield();

    // Start the update loop
    this.app.on('update', this.onUpdate, this);

    // Start the application
    this.app.start();

    console.log('GameBootstrap initialized - battlefield visible');
  }

  onUpdate(dt) {
    // Empty update loop - Task 1.1 scope
    // No gameplay logic yet
  }
}
