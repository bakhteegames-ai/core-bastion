import * as pc from 'playcanvas';
import { GameBootstrap } from './app/GameBootstrap.js';

// Expose PlayCanvas globally for testing
window.pc = pc;

// Entry point - initialize the game
const bootstrap = new GameBootstrap();
bootstrap.init();

// Expose for testing (removed in production build)
if (typeof window !== 'undefined') {
  window.__gameBootstrap = bootstrap;
  setTimeout(() => {
    window.__playcanvas_app = bootstrap.app;
  }, 100);
}
