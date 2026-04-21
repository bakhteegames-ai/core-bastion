import * as pc from 'playcanvas';
import { getTowerType, getTowerStats, getUpgradeCost, getSellValue } from '../data/towerTypes.js';
import { TOWER_RANGE } from '../data/balance.js';

/**
 * BuildManager
 * Handles tower placement on build slots.
 * Task 2.3: Tower Build Placement
 * Task 5.1: Visual Polish Pass
 * Task 4-a: Tower Types Integration
 */
export class BuildManager {
  constructor(app, economyService, sceneFactory, assetLoader = null) {
    this.app = app;
    this.economyService = economyService;
    this.sceneFactory = sceneFactory;
    this.assetLoader = assetLoader;
    this.waveManager = null;
    this.towers = []; // Track placed towers
  }

  setWaveManager(waveManager) {
    this.waveManager = waveManager;
  }

  /**
   * Attempt to build a tower on a slot.
   * @param {string} slotId - The slot id ('A' or 'B')
   * @param {object} slotEntity - The slot entity with position data
   * @param {string} typeId - Tower type ('archer', 'cannon', 'ice', 'lightning', 'sniper')
   * @returns {object|boolean} - tower data if build succeeded, false otherwise
   */
  buildTower(slotId, slotEntity, typeId = 'archer') {
    // Check if slot is already occupied
    if (this.sceneFactory.isSlotOccupied(slotId)) {
      console.log(`[BuildManager] Slot ${slotId} is already occupied`);
      return false;
    }

    const towerType = getTowerType(typeId);
    const stats = getTowerStats(typeId, 1);

    // Apply cost modifier from wave system if available
    let finalCost = towerType.cost;
    if (this.waveManager?.modifierSystem) {
      const costMult = this.waveManager.modifierSystem.getTowerCostMultiplier();
      finalCost = Math.round(finalCost * costMult);
    }

    // Check if player can afford the tower
    if (!this.economyService.canAfford(finalCost)) {
      console.log(`[BuildManager] Not enough gold. Need ${finalCost}, have ${this.economyService.gold}`);
      return false;
    }

    // Deduct gold
    const spent = this.economyService.spendGold(finalCost);
    if (!spent) {
      console.log('[BuildManager] Failed to spend gold');
      return false;
    }

    // Get slot position
    const slotData = slotEntity.slotData;
    const slotY = slotData.y ?? 0;
    const position = {
      x: slotData.x,
      y: slotY,
      z: slotData.z
    };

    // Create tower entity
    const tower = this._createTowerEntity(slotId, position, typeId);

    // Mark slot as occupied
    this.sceneFactory.setSlotOccupied(slotId);

    // Track tower - use actual position with height offset
    const towerData = {
      slotId: slotId,
      entity: tower,
      position: { x: position.x, y: position.y + 1.2, z: position.z },
      typeId: typeId,
      level: 1
    };
    this.towers.push(towerData);

    console.log(`[BuildManager] ${towerType.name} built on slot ${slotId}, gold remaining: ${this.economyService.gold}`);
    return towerData;
  }

  /**
   * Upgrade a tower.
   * @param {string} slotId - The slot id
   * @returns {boolean} - true if upgrade succeeded
   */
  upgradeTower(slotId) {
    const tower = this.towers.find(t => t.slotId === slotId);
    if (!tower) {
      console.log(`[BuildManager] No tower found on slot ${slotId}`);
      return false;
    }

    if (tower.level >= 5) {
      console.log(`[BuildManager] Tower on slot ${slotId} is already max level`);
      return false;
    }

    const towerType = getTowerType(tower.typeId);
    const upgradeCost = getUpgradeCost(towerType.cost, tower.level);

    // Check if player can afford upgrade
    if (!this.economyService.canAfford(upgradeCost)) {
      console.log(`[BuildManager] Not enough gold for upgrade. Need ${upgradeCost}, have ${this.economyService.gold}`);
      return false;
    }

    // Deduct gold
    const spent = this.economyService.spendGold(upgradeCost);
    if (!spent) {
      console.log('[BuildManager] Failed to spend gold for upgrade');
      return false;
    }

    // Upgrade tower
    tower.level++;
    
    // Update visual scale
    if (tower.entity && tower.entity.turret) {
      const scaleMultiplier = 1 + (tower.level - 1) * 0.1;
      tower.entity.turret.setLocalScale(0.5 * scaleMultiplier, 0.5 * scaleMultiplier, 0.5 * scaleMultiplier);
    }

    // Update range indicator
    const newStats = getTowerStats(tower.typeId, tower.level);
    if (tower.entity && tower.entity.rangeIndicator) {
      tower.entity.rangeIndicator.setLocalScale(newStats.range * 2, newStats.range * 2, 0.3);
    }

    console.log(`[BuildManager] Tower on slot ${slotId} upgraded to level ${tower.level}`);
    return true;
  }

  /**
   * Sell a tower.
   * @param {string} slotId - The slot id
   * @returns {number} - Gold received from sale, 0 if failed
   */
  sellTower(slotId) {
    const towerIndex = this.towers.findIndex(t => t.slotId === slotId);
    if (towerIndex === -1) {
      console.log(`[BuildManager] No tower found on slot ${slotId}`);
      return 0;
    }

    const tower = this.towers[towerIndex];
    const towerType = getTowerType(tower.typeId);
    const sellValue = getSellValue(towerType.cost, tower.level);

    // Add gold
    this.economyService.addGold(sellValue);

    // Destroy tower entity
    if (tower.entity) {
      if (tower.entity.rangeIndicator) {
        tower.entity.rangeIndicator.destroy();
      }
      tower.entity.destroy();
    }

    // Mark slot as unoccupied
    this.sceneFactory.setSlotUnoccupied(slotId);

    // Remove from tracked towers
    this.towers.splice(towerIndex, 1);

    console.log(`[BuildManager] Tower on slot ${slotId} sold for ${sellValue} gold`);
    return sellValue;
  }

  /**
   * Create a tower entity at position.
   */
  _createTowerEntity(slotId, position, typeId = 'archer') {
    const tower = new pc.Entity(`Tower_${typeId}_${slotId}`);
    tower.setLocalPosition(position.x, position.y, position.z);
    tower.typeId = typeId;

    // Try to use GLB model first
    if (this.assetLoader) {
      const modelEntity = this.assetLoader.createEntityFromModel('turret');
      if (modelEntity) {
        modelEntity.setLocalScale(0.5, 0.5, 0.5);
        modelEntity.setLocalPosition(0, 0.8, 0);
        tower.addChild(modelEntity);
        tower.turret = modelEntity;
        
        this.app.root.addChild(tower);

        // Create range indicator
        const stats = getTowerStats(typeId, 1);
        this._createRangeIndicator(tower, position, stats.range);

        console.log(`[BuildManager] Tower created with GLB model (type: ${typeId})`);
        return tower;
      }
    }

    // Fallback to procedural model based on type
    return this._createProceduralTower(slotId, position, typeId);
  }

  /**
   * Create procedural tower based on type.
   */
  _createProceduralTower(slotId, position, typeId = 'archer') {
    const tower = new pc.Entity(`Tower_${typeId}_${slotId}`);
    tower.setLocalPosition(position.x, position.y, position.z);
    tower.typeId = typeId;

    const towerType = getTowerType(typeId);
    const color = towerType.color;
    const stats = getTowerStats(typeId, 1);

    switch (typeId) {
      case 'cannon':
        this._createCannonTower(tower, slotId, color);
        break;
      case 'ice':
        this._createIceTower(tower, slotId, color);
        break;
      case 'lightning':
        this._createLightningTower(tower, slotId, color);
        break;
      case 'sniper':
        this._createSniperTower(tower, slotId, color);
        break;
      case 'archer':
      default:
        this._createArcherTower(tower, slotId, color);
        break;
    }

    this.app.root.addChild(tower);

    // Create range indicator
    this._createRangeIndicator(tower, position, stats.range);

    console.log(`[BuildManager] Tower created with procedural model (type: ${typeId})`);
    return tower;
  }

  /**
   * Create Archer Tower - tall thin tower with conical roof.
   */
  _createArcherTower(tower, slotId, color) {
    const base = new pc.Entity(`TowerBase_${slotId}`);
    base.addComponent('render', { type: 'cylinder' });
    base.setLocalPosition(0, 0.15, 0);
    base.setLocalScale(0.8, 0.3, 0.8);
    this._applyMaterial(base, { r: 0.35, g: 0.25, b: 0.15 });
    tower.addChild(base);

    const body = new pc.Entity(`TowerBody_${slotId}`);
    body.addComponent('render', { type: 'cylinder' });
    body.setLocalPosition(0, 0.9, 0);
    body.setLocalScale(0.5, 1.2, 0.5);
    this._applyMaterial(body, color);
    tower.addChild(body);

    const roof = new pc.Entity(`TowerRoof_${slotId}`);
    roof.addComponent('render', { type: 'cone' });
    roof.setLocalPosition(0, 1.9, 0);
    roof.setLocalScale(0.7, 0.8, 0.7);
    roof.setLocalEulerAngles(180, 0, 0);
    this._applyMaterial(roof, { r: 0.3, g: 0.2, b: 0.1 });
    tower.addChild(roof);
    tower.turret = roof;

    for (let i = 0; i < 4; i++) {
      const slit = new pc.Entity(`Slit_${i}_${slotId}`);
      slit.addComponent('render', { type: 'box' });
      slit.setLocalPosition(0, 1.3, 0.25);
      slit.setLocalScale(0.1, 0.2, 0.05);
      slit.setLocalEulerAngles(0, i * 90, 0);
      this._applyMaterial(slit, { r: 0.1, g: 0.1, b: 0.1 });
      tower.addChild(slit);
    }
  }

  _createCannonTower(tower, slotId, color) {
    const base = new pc.Entity(`TowerBase_${slotId}`);
    base.addComponent('render', { type: 'cylinder' });
    base.setLocalPosition(0, 0.2, 0);
    base.setLocalScale(1.2, 0.4, 1.2);
    this._applyMaterial(base, { r: 0.3, g: 0.3, b: 0.35 });
    tower.addChild(base);

    const platform = new pc.Entity(`Platform_${slotId}`);
    platform.addComponent('render', { type: 'cylinder' });
    platform.setLocalPosition(0, 0.5, 0);
    platform.setLocalScale(1.0, 0.1, 1.0);
    this._applyMaterial(platform, color);
    tower.addChild(platform);

    const barrel = new pc.Entity(`Barrel_${slotId}`);
    barrel.addComponent('render', { type: 'cylinder' });
    barrel.setLocalPosition(0, 0.7, 0.4);
    barrel.setLocalScale(0.25, 0.8, 0.25);
    barrel.setLocalEulerAngles(-90, 0, 0);
    this._applyMaterial(barrel, { r: 0.25, g: 0.25, b: 0.3 });
    tower.addChild(barrel);
    tower.turret = barrel;

    for (let i = 0; i < 2; i++) {
      const ring = new pc.Entity(`Ring_${i}_${slotId}`);
      ring.addComponent('render', { type: 'torus' });
      ring.setLocalPosition(0, 0.7, 0.2 + i * 0.35);
      ring.setLocalScale(0.3, 0.3, 0.08);
      ring.setLocalEulerAngles(90, 0, 0);
      this._applyMaterial(ring, { r: 0.4, g: 0.35, b: 0.3 });
      tower.addChild(ring);
    }
  }

  _createIceTower(tower, slotId, color) {
    const base = new pc.Entity(`TowerBase_${slotId}`);
    base.addComponent('render', { type: 'cylinder' });
    base.setLocalPosition(0, 0.1, 0);
    base.setLocalScale(0.7, 0.2, 0.7);
    this._applyMaterial(base, { r: 0.5, g: 0.6, b: 0.7 });
    tower.addChild(base);

    const crystal = new pc.Entity(`Crystal_${slotId}`);
    crystal.addComponent('render', { type: 'cone' });
    crystal.setLocalPosition(0, 1.0, 0);
    crystal.setLocalScale(0.5, 1.6, 0.5);
    crystal.setLocalEulerAngles(180, 0, 0);
    this._applyMaterial(crystal, color, { emissive: true });
    tower.addChild(crystal);
    tower.turret = crystal;

    for (let i = 0; i < 3; i++) {
      const shard = new pc.Entity(`Shard_${i}_${slotId}`);
      shard.addComponent('render', { type: 'cone' });
      shard.setLocalPosition(
        Math.cos(i * Math.PI * 2 / 3) * 0.5,
        0.8 + i * 0.2,
        Math.sin(i * Math.PI * 2 / 3) * 0.5
      );
      shard.setLocalScale(0.15, 0.3, 0.15);
      shard.setLocalEulerAngles(180, i * 120, 20);
      this._applyMaterial(shard, color, { emissive: true, opacity: 0.7 });
      tower.addChild(shard);
    }

    const frostRing = new pc.Entity(`FrostRing_${slotId}`);
    frostRing.addComponent('render', { type: 'torus' });
    frostRing.setLocalPosition(0, 0.15, 0);
    frostRing.setLocalScale(1.0, 1.0, 0.15);
    frostRing.setLocalEulerAngles(90, 0, 0);
    this._applyMaterial(frostRing, { r: 0.3, g: 0.7, b: 0.9 }, { emissive: true, opacity: 0.5 });
    tower.addChild(frostRing);
  }

  _createLightningTower(tower, slotId, color) {
    const base = new pc.Entity(`TowerBase_${slotId}`);
    base.addComponent('render', { type: 'cylinder' });
    base.setLocalPosition(0, 0.2, 0);
    base.setLocalScale(0.8, 0.4, 0.8);
    this._applyMaterial(base, { r: 0.15, g: 0.15, b: 0.2 });
    tower.addChild(base);

    const body = new pc.Entity(`TowerBody_${slotId}`);
    body.addComponent('render', { type: 'cylinder' });
    body.setLocalPosition(0, 0.9, 0);
    body.setLocalScale(0.4, 1.0, 0.4);
    this._applyMaterial(body, { r: 0.2, g: 0.15, b: 0.25 });
    tower.addChild(body);

    const rod = new pc.Entity(`Rod_${slotId}`);
    rod.addComponent('render', { type: 'cylinder' });
    rod.setLocalPosition(0, 1.8, 0);
    rod.setLocalScale(0.08, 0.8, 0.08);
    this._applyMaterial(rod, { r: 0.4, g: 0.4, b: 0.45 });
    tower.addChild(rod);
    tower.turret = rod;

    const sphere = new pc.Entity(`Sphere_${slotId}`);
    sphere.addComponent('render', { type: 'sphere' });
    sphere.setLocalPosition(0, 2.3, 0);
    sphere.setLocalScale(0.25, 0.25, 0.25);
    this._applyMaterial(sphere, color, { emissive: true });
    tower.addChild(sphere);

    for (let i = 0; i < 2; i++) {
      const ring = new pc.Entity(`EnergyRing_${i}_${slotId}`);
      ring.addComponent('render', { type: 'torus' });
      ring.setLocalPosition(0, 1.2 + i * 0.5, 0);
      ring.setLocalScale(0.6 - i * 0.1, 0.6 - i * 0.1, 0.1);
      ring.setLocalEulerAngles(90, 0, 0);
      this._applyMaterial(ring, color, { emissive: true, opacity: 0.6 });
      tower.addChild(ring);
    }
  }

  _createSniperTower(tower, slotId, color) {
    const base = new pc.Entity(`TowerBase_${slotId}`);
    base.addComponent('render', { type: 'cylinder' });
    base.setLocalPosition(0, 0.15, 0);
    base.setLocalScale(0.6, 0.3, 0.6);
    this._applyMaterial(base, { r: 0.25, g: 0.2, b: 0.2 });
    tower.addChild(base);

    const body = new pc.Entity(`TowerBody_${slotId}`);
    body.addComponent('render', { type: 'cylinder' });
    body.setLocalPosition(0, 1.5, 0);
    body.setLocalScale(0.3, 2.4, 0.3);
    this._applyMaterial(body, color);
    tower.addChild(body);

    const deck = new pc.Entity(`Deck_${slotId}`);
    deck.addComponent('render', { type: 'cylinder' });
    deck.setLocalPosition(0, 2.9, 0);
    deck.setLocalScale(0.6, 0.15, 0.6);
    this._applyMaterial(deck, { r: 0.35, g: 0.25, b: 0.25 });
    tower.addChild(deck);

    const scope = new pc.Entity(`Scope_${slotId}`);
    scope.addComponent('render', { type: 'cylinder' });
    scope.setLocalPosition(0, 3.2, 0.25);
    scope.setLocalScale(0.1, 0.4, 0.1);
    scope.setLocalEulerAngles(-90, 0, 0);
    this._applyMaterial(scope, { r: 0.2, g: 0.2, b: 0.25 });
    tower.addChild(scope);
    tower.turret = scope;

    const antenna = new pc.Entity(`Antenna_${slotId}`);
    antenna.addComponent('render', { type: 'cylinder' });
    antenna.setLocalPosition(0, 3.5, 0);
    antenna.setLocalScale(0.05, 0.4, 0.05);
    this._applyMaterial(antenna, { r: 0.3, g: 0.3, b: 0.35 });
    tower.addChild(antenna);

    for (let i = 0; i < 3; i++) {
      const strut = new pc.Entity(`Strut_${i}_${slotId}`);
      strut.addComponent('render', { type: 'box' });
      strut.setLocalPosition(
        Math.cos(i * Math.PI * 2 / 3 + Math.PI / 6) * 0.25,
        2.2,
        Math.sin(i * Math.PI * 2 / 3 + Math.PI / 6) * 0.25
      );
      strut.setLocalScale(0.08, 1.0, 0.08);
      strut.setLocalEulerAngles(-15, i * 120, 0);
      this._applyMaterial(strut, color);
      tower.addChild(strut);
    }
  }

  _applyMaterial(entity, color, options = {}) {
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(color.r, color.g, color.b);
    
    if (options.emissive) {
      material.emissive = new pc.Color(color.r * 0.5, color.g * 0.5, color.b * 0.5);
    }
    
    if (options.opacity !== undefined) {
      material.opacity = options.opacity;
    }
    
    material.specular = new pc.Color(0.5, 0.5, 0.5);
    material.shininess = 60;
    material.update();
    entity.render.material = material;
  }

  _createRangeIndicator(tower, position, range) {
    const ring = new pc.Entity(`TowerRange_${tower.name}`);
    ring.addComponent('render', { type: 'torus' });
    ring.setLocalPosition(position.x, position.y + 0.05, position.z);
    ring.setLocalScale(range * 2, range * 2, 0.3);
    ring.setLocalEulerAngles(90, 0, 0);

    const towerType = getTowerType(tower.typeId || 'archer');
    const color = towerType.color;
    
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(color.r, color.g, color.b);
    material.emissive = new pc.Color(color.r * 0.3, color.g * 0.3, color.b * 0.3);
    material.opacity = 0.4;
    material.update();
    ring.render.material = material;

    this.app.root.addChild(ring);
    tower.rangeIndicator = ring;
  }

  getTower(slotId) {
    return this.towers.find(t => t.slotId === slotId) || null;
  }

  getTowers() {
    return this.towers;
  }

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
}
