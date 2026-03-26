import * as pc from 'playcanvas';
import { TOWER_COST, TOWER_RANGE } from '../data/balance.js';

/**
 * BuildManager
 * Handles tower placement on build slots.
 * Task 2.3: Tower Build Placement
 * Task 5.1: Visual Polish Pass
 */
export class BuildManager {
  constructor(app, economyService, sceneFactory) {
    this.app = app;
    this.economyService = economyService;
    this.sceneFactory = sceneFactory;
    this.towers = []; // Track placed towers
  }

  /**
   * Attempt to build a tower on a slot.
   * @param {string} slotId - The slot id ('A' or 'B')
   * @param {object} slotEntity - The slot entity with position data
   * @returns {boolean} - true if build succeeded
   */
  buildTower(slotId, slotEntity) {
    // Check if slot is already occupied
    if (this.sceneFactory.isSlotOccupied(slotId)) {
      console.log(`[BuildManager] Slot ${slotId} is already occupied`);
      return false;
    }

    // Check if player can afford the tower
    if (!this.economyService.canAfford(TOWER_COST)) {
      console.log(`[BuildManager] Not enough gold. Need ${TOWER_COST}, have ${this.economyService.gold}`);
      return false;
    }

    // Deduct gold
    const spent = this.economyService.spendGold(TOWER_COST);
    if (!spent) {
      console.log('[BuildManager] Failed to spend gold');
      return false;
    }

    // Get slot position
    const slotData = slotEntity.slotData;
    const position = {
      x: slotData.x,
      y: 0, // Base at ground level
      z: slotData.z
    };

    // Create tower entity
    const tower = this._createTowerEntity(slotId, position);

    // Mark slot as occupied
    this.sceneFactory.setSlotOccupied(slotId);

    // Track tower - use actual position with height offset
    const towerData = {
      slotId: slotId,
      entity: tower,
      position: { x: position.x, y: 1.2, z: position.z } // Firing position at top
    };
    this.towers.push(towerData);

    console.log(`[BuildManager] Tower built on slot ${slotId}, gold remaining: ${this.economyService.gold}`);
    return towerData;
  }

  /**
   * Create a tower entity at position.
   */
  _createTowerEntity(slotId, position) {
    const tower = new pc.Entity(`Tower_${slotId}`);
    tower.setLocalPosition(position.x, 0, position.z);

    // Tower base - wider at bottom
    const base = new pc.Entity(`TowerBase_${slotId}`);
    base.addComponent('render', { type: 'cylinder' });
    base.setLocalPosition(0, 0.25, 0);
    base.setLocalScale(1.0, 0.5, 1.0);

    const baseMaterial = new pc.StandardMaterial();
    baseMaterial.diffuse = new pc.Color(0.5, 0.55, 0.6);
    baseMaterial.specular = new pc.Color(0.3, 0.3, 0.35);
    baseMaterial.shininess = 20;
    baseMaterial.update();
    base.render.material = baseMaterial;

    tower.addChild(base);

    // Tower middle section
    const middle = new pc.Entity(`TowerMiddle_${slotId}`);
    middle.addComponent('render', { type: 'cylinder' });
    middle.setLocalPosition(0, 0.9, 0);
    middle.setLocalScale(0.7, 0.9, 0.7);

    const middleMaterial = new pc.StandardMaterial();
    middleMaterial.diffuse = new pc.Color(0.75, 0.8, 0.85);
    middleMaterial.emissive = new pc.Color(0.15, 0.25, 0.35);
    middleMaterial.specular = new pc.Color(0.4, 0.4, 0.45);
    middleMaterial.shininess = 40;
    middleMaterial.update();
    middle.render.material = middleMaterial;

    tower.addChild(middle);

    // Tower top / turret
    const top = new pc.Entity(`TowerTop_${slotId}`);
    top.addComponent('render', { type: 'cone' });
    top.setLocalPosition(0, 1.6, 0);
    top.setLocalScale(0.5, 0.6, 0.5);
    top.setLocalEulerAngles(180, 0, 0); // Point up

    const topMaterial = new pc.StandardMaterial();
    topMaterial.diffuse = new pc.Color(0.4, 0.85, 0.95);
    topMaterial.emissive = new pc.Color(0.2, 0.5, 0.6);
    topMaterial.specular = new pc.Color(0.5, 0.5, 0.5);
    topMaterial.shininess = 60;
    topMaterial.update();
    top.render.material = topMaterial;

    tower.addChild(top);
    tower.turret = top;

    this.app.root.addChild(tower);

    // Create range indicator
    this._createRangeIndicator(tower, position);

    return tower;
  }

  /**
   * Create a visual range indicator for the tower.
   */
  _createRangeIndicator(tower, position) {
    // Ring to show range
    const ring = new pc.Entity(`TowerRange_${tower.name}`);
    ring.addComponent('render', { type: 'torus' });
    ring.setLocalPosition(position.x, 0.05, position.z);
    ring.setLocalScale(TOWER_RANGE * 2, TOWER_RANGE * 2, 0.3);
    ring.setLocalEulerAngles(90, 0, 0);

    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.3, 0.7, 0.8);
    material.emissive = new pc.Color(0.1, 0.35, 0.4);
    material.opacity = 0.5;
    material.update();
    ring.render.material = material;

    this.app.root.addChild(ring);
    tower.rangeIndicator = ring;
  }

  /**
   * Remove all towers (for restart).
   */
  removeAllTowers() {
    this.towers.forEach((towerData) => {
      if (towerData.entity) {
        if (towerData.entity.rangeIndicator) {
          towerData.entity.rangeIndicator.destroy();
        }
        towerData.entity.destroy();
      }
      this.sceneFactory.setSlotUnoccupied(towerData.slotId);
    });
    this.towers = [];
    console.log('[BuildManager] All towers removed');
  }

  /**
   * Get all placed towers.
   */
  getTowers() {
    return this.towers;
  }
}
