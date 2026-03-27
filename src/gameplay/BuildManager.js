import * as pc from 'playcanvas';
import { TOWER_COST, TOWER_RANGE } from '../data/balance.js';

/**
 * BuildManager
 * Handles tower placement on build slots.
 * Task 2.3: Tower Build Placement
 * Task 5.1: Visual Polish Pass
 */
export class BuildManager {
  constructor(app, economyService, sceneFactory, assetLoader = null) {
    this.app = app;
    this.economyService = economyService;
    this.sceneFactory = sceneFactory;
    this.assetLoader = assetLoader;
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

    // Try to use GLB model first
    if (this.assetLoader) {
      const modelEntity = this.assetLoader.createEntityFromModel('turret');
      if (modelEntity) {
        modelEntity.setLocalScale(0.5, 0.5, 0.5); // Scale the helmet model
        modelEntity.setLocalPosition(0, 0.8, 0);
        tower.addChild(modelEntity);
        tower.turret = modelEntity;
        
        this.app.root.addChild(tower);

        // Create range indicator
        this._createRangeIndicator(tower, position);

        console.log('[BuildManager] Tower created with GLB model');
        return tower;
      }
    }

    // Fallback to procedural model
    return this._createProceduralTower(slotId, position);
  }

  /**
   * Create procedural tower (fallback).
   */
  _createProceduralTower(slotId, position) {
    const tower = new pc.Entity(`Tower_${slotId}`);
    tower.setLocalPosition(position.x, 0, position.z);

    // Tower base - hexagonal platform
    const base = new pc.Entity(`TowerBase_${slotId}`);
    base.addComponent('render', { type: 'cylinder' });
    base.setLocalPosition(0, 0.2, 0);
    base.setLocalScale(1.2, 0.4, 1.2);

    const baseMaterial = new pc.StandardMaterial();
    baseMaterial.diffuse = new pc.Color(0.25, 0.28, 0.35);
    baseMaterial.specular = new pc.Color(0.6, 0.6, 0.7);
    baseMaterial.shininess = 60;
    baseMaterial.update();
    base.render.material = baseMaterial;

    tower.addChild(base);

    // Tower energy core (main body)
    const core = new pc.Entity(`TowerCore_${slotId}`);
    core.addComponent('render', { type: 'cylinder' });
    core.setLocalPosition(0, 0.8, 0);
    core.setLocalScale(0.6, 1.0, 0.6);

    const coreMaterial = new pc.StandardMaterial();
    coreMaterial.diffuse = new pc.Color(0.3, 0.7, 0.8);
    coreMaterial.emissive = new pc.Color(0.15, 0.4, 0.5);
    coreMaterial.specular = new pc.Color(0.8, 0.9, 1);
    coreMaterial.shininess = 100;
    coreMaterial.update();
    core.render.material = coreMaterial;

    tower.addChild(core);

    // Top crystal (turret)
    const top = new pc.Entity(`TowerTop_${slotId}`);
    top.addComponent('render', { type: 'cone' });
    top.setLocalPosition(0, 1.6, 0);
    top.setLocalScale(0.4, 0.8, 0.4);
    top.setLocalEulerAngles(180, 0, 0);

    const topMaterial = new pc.StandardMaterial();
    topMaterial.diffuse = new pc.Color(0.4, 0.95, 1.0);
    topMaterial.emissive = new pc.Color(0.3, 0.7, 0.8);
    topMaterial.specular = new pc.Color(1, 1, 1);
    topMaterial.shininess = 120;
    topMaterial.update();
    top.render.material = topMaterial;

    tower.addChild(top);
    tower.turret = top;

    // Floating rings around core
    for (let i = 0; i < 2; i++) {
      const ring = new pc.Entity(`TowerRing_${i}_${slotId}`);
      ring.addComponent('render', { type: 'torus' });
      ring.setLocalPosition(0, 0.5 + i * 0.6, 0);
      ring.setLocalScale(0.8, 0.8, 0.15);
      ring.setLocalEulerAngles(90, 0, 0);

      const ringMaterial = new pc.StandardMaterial();
      ringMaterial.diffuse = new pc.Color(0.5, 0.9, 1.0);
      ringMaterial.emissive = new pc.Color(0.2, 0.6, 0.7);
      ringMaterial.opacity = 0.7;
      ringMaterial.update();
      ring.render.material = ringMaterial;

      tower.addChild(ring);
    }

    this.app.root.addChild(tower);

    // Create range indicator
    this._createRangeIndicator(tower, position);

    console.log('[BuildManager] Tower created with procedural model');
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
