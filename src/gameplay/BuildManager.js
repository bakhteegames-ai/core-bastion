import * as pc from 'playcanvas';
import { TOWER_COST, TOWER_RANGE } from '../data/balance.js';

/**
 * BuildManager
 * Handles tower placement on build slots.
 * Task 2.3: Tower Build Placement
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
      y: 0.75, // Tower height offset
      z: slotData.z
    };

    // Create tower entity
    const tower = this._createTowerEntity(slotId, position);

    // Mark slot as occupied
    this.sceneFactory.setSlotOccupied(slotId);

    // Track tower
    const towerData = {
      slotId: slotId,
      entity: tower,
      position: position
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

    // Base of tower
    tower.addComponent('render', {
      type: 'cylinder'
    });

    tower.setLocalPosition(position.x, position.y, position.z);
    tower.setLocalScale(0.8, 1.0, 0.8);

    // Ivory-metal / pale steel / cyan glow (per §7.4)
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.85, 0.85, 0.9);
    material.emissive = new pc.Color(0.2, 0.3, 0.4);
    material.update();
    tower.render.material = material;

    this.app.root.addChild(tower);

    // Create range indicator (visual only, for now)
    this._createRangeIndicator(tower, position);

    return tower;
  }

  /**
   * Create a visual range indicator for the tower.
   */
  _createRangeIndicator(tower, position) {
    // Simple ring to show range
    const ring = new pc.Entity(`TowerRange_${tower.name}`);
    ring.addComponent('render', {
      type: 'cylinder'
    });

    ring.setLocalPosition(position.x, 0.05, position.z);
    ring.setLocalScale(TOWER_RANGE * 2, 0.02, TOWER_RANGE * 2);

    // Semi-transparent range indicator
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.3, 0.6, 0.7);
    material.opacity = 0.2;
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
