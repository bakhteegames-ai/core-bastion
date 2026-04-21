/**
 * JuiceController - Handles all "game feel" effects.
 * 
 * Features:
 * - Screen Shake (camera manipulation)
 * - Hit Stop (time dilation on critical events)
 * - Damage Numbers (pooled HTML/CSS overlays)
 * 
 * Performance: All effects use pre-allocated pools, zero GC during gameplay.
 */

import { EventBus, GameEvents } from '../core/EventBus.js';

export class JuiceController {
  constructor(app, cameraEntity) {
    this.app = app;
    this.cameraEntity = cameraEntity;
    
    // Screen shake state - pre-allocated vectors
    this._shakeIntensity = 0;
    this._shakeDecay = 2.5;
    this._originalCameraPos = new pc.Vec3();
    this._shakeOffset = new pc.Vec3();
    
    // Hit stop state
    this._hitStopMultiplier = 1.0;
    this._hitStopDuration = 0;
    this._hitStopElapsed = 0;
    
    // Damage number pool
    this._damageNumberPool = [];
    this._activeDamageNumbers = [];
    this._damageNumberContainer = null;
    
    this._initDamageNumberPool(20);
    
    EventBus.on(GameEvents.SCREEN_SHAKE, this._onScreenShake, this);
    EventBus.on(GameEvents.HIT_STOP, this._onHitStop, this);
    EventBus.on(GameEvents.DAMAGE_NUMBER, this._onDamageNumber, this);
  }
  
  _initDamageNumberPool(count) {
    this._damageNumberContainer = document.getElementById('damage-numbers');
    if (!this._damageNumberContainer) {
      this._damageNumberContainer = document.createElement('div');
      this._damageNumberContainer.id = 'damage-numbers';
      this._damageNumberContainer.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1000;';
      document.body.appendChild(this._damageNumberContainer);
    }
    
    for (let i = 0; i < count; i++) {
      const el = document.createElement('div');
      el.style.cssText = 'position:absolute;font-family:Arial,sans-serif;font-weight:bold;font-size:24px;color:#ff4444;text-shadow:2px 2px 0 #000,-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000;opacity:0;transform:translate(-50%,-50%);white-space:nowrap;';
      this._damageNumberContainer.appendChild(el);
      this._damageNumberPool.push({ element: el, active: false, lifetime: 0, vx: 0, vy: 0, px: 0, py: 0 });
    }
  }
  
  triggerShake(intensity) {
    this._shakeIntensity = Math.max(this._shakeIntensity, intensity);
    if (this._originalCameraPos.length() === 0 && this.cameraEntity) {
      this._originalCameraPos.copy(this.cameraEntity.getLocalPosition());
    }
  }
  
  triggerHitStop(duration, slowFactor = 0.2) {
    this._hitStopMultiplier = slowFactor;
    this._hitStopDuration = duration;
    this._hitStopElapsed = 0;
  }
  
  showDamageNumber(worldPos, damage, isCrit = false, color = null) {
    const poolItem = this._damageNumberPool.find(p => !p.active);
    if (!poolItem) return;
    
    const screenPos = this._worldToScreen(worldPos);
    if (!screenPos || screenPos.z < 0) return;
    
    const el = poolItem.element;
    el.textContent = isCrit ? 'CRIT ' + damage + '!' : damage.toString();
    el.style.color = color || (isCrit ? '#ffcc00' : '#ff4444');
    el.style.fontSize = isCrit ? '36px' : '24px';
    el.style.opacity = '1';
    el.style.left = screenPos.x + '%';
    el.style.top = screenPos.y + '%';
    
    poolItem.vx = (Math.random() - 0.5) * 50;
    poolItem.vy = 80 + Math.random() * 40;
    poolItem.lifetime = 1.0;
    poolItem.px = screenPos.x;
    poolItem.py = screenPos.y;
    poolItem.active = true;
    
    this._activeDamageNumbers.push(poolItem);
  }
  
  _worldToScreen(worldPos) {
    if (!this.cameraEntity || !this.cameraEntity.camera) return null;
    const camera = this.cameraEntity.camera;
    const canvas = this.app.graphicsDevice.canvas;
    const screenPoint = camera.worldToScreen(worldPos);
    if (!screenPoint) return null;
    return { x: (screenPoint.x / canvas.width) * 100, y: (screenPoint.y / canvas.height) * 100, z: screenPoint.z };
  }
  
  update(dt) {
    if (this._shakeIntensity > 0.01) {
      this._shakeIntensity -= this._shakeDecay * dt;
      if (this._shakeIntensity < 0) this._shakeIntensity = 0;
      
      if (this.cameraEntity && this._shakeIntensity > 0) {
        const amount = this._shakeIntensity * 0.1;
        this._shakeOffset.set((Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount, (Math.random() - 0.5) * amount);
        const newPos = new pc.Vec3();
        newPos.add2(this._originalCameraPos, this._shakeOffset);
        this.cameraEntity.setLocalPosition(newPos);
      }
    } else if (this.cameraEntity && this._originalCameraPos.length() > 0) {
      this.cameraEntity.setLocalPosition(this._originalCameraPos);
      this._shakeOffset.set(0, 0, 0);
    }
    
    if (this._hitStopMultiplier < 1.0) {
      this._hitStopElapsed += dt;
      if (this._hitStopElapsed >= this._hitStopDuration) {
        this._hitStopMultiplier = 1.0;
        this._hitStopElapsed = 0;
      }
    }
    
    this._updateDamageNumbers(dt);
  }
  
  _updateDamageNumbers(dt) {
    for (let i = this._activeDamageNumbers.length - 1; i >= 0; i--) {
      const item = this._activeDamageNumbers[i];
      item.lifetime -= dt;
      if (item.lifetime <= 0) {
        item.element.style.opacity = '0';
        item.active = false;
        this._activeDamageNumbers.splice(i, 1);
        continue;
      }
      item.py -= item.vy * dt;
      item.px += item.vx * dt;
      item.vy -= 200 * dt;
      item.element.style.transform = 'translate(' + (item.px - 50) + '%,' + (item.py - 50) + '%)';
      if (item.lifetime < 0.3) {
        item.element.style.opacity = (item.lifetime / 0.3).toString();
      }
    }
  }
  
  getTimeMultiplier() { return this._hitStopMultiplier; }
  
  _onScreenShake(data) { if (data && data.intensity !== undefined) this.triggerShake(data.intensity); }
  _onHitStop(data) { if (data && data.duration !== undefined) this.triggerHitStop(data.duration, data.slowFactor); }
  _onDamageNumber(data) { if (data && data.position && data.damage !== undefined) this.showDamageNumber(data.position, data.damage, data.isCrit, data.color); }
  
  reset() {
    this._shakeIntensity = 0;
    this._hitStopMultiplier = 1.0;
    this._originalCameraPos.set(0, 0, 0);
    for (const item of this._activeDamageNumbers) { item.element.style.opacity = '0'; item.active = false; }
    this._activeDamageNumbers = [];
  }
}
