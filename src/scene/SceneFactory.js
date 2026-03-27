import * as pc from 'playcanvas';
import {
  GROUND_WIDTH,
  GROUND_DEPTH,
  SPAWN_POINT,
  BASE_POINT,
  BUILD_SLOTS,
  WAYPOINTS
} from '../data/level.js';

/**
 * SceneFactory
 * Creates battlefield, camera, and visual markers via code.
 * Task 1.3: Battlefield and Camera
 * Task 2.2: Build slot click detection
 * Task 5.1: Visual Polish Pass
 */
export class SceneFactory {
  constructor(app) {
    this.app = app;
    this.ground = null;
    this.camera = null;
    this.baseMarker = null;
    this.baseGlow = null;
    this.spawnMarker = null;
    this.pathMarkers = [];
    this.buildSlotMarkers = [];
    this.buildSlotStates = {}; // Track occupied state by slot id
  }

  /**
   * Create the complete battlefield scene.
   */
  createBattlefield() {
    this.createLighting();
    this.createGround();
    this.createCamera();
    this.createSkybox();
    this.createBaseMarker();
    this.createSpawnMarker();
    this.createPathVisualization();
    this.createBuildSlotMarkers();

    console.log('[SceneFactory] Battlefield created');
  }

  /**
   * Create lighting for the scene.
   */
  createLighting() {
    // Main directional light (sun)
    const sun = new pc.Entity('Sun');
    sun.addComponent('light', {
      type: 'directional',
      color: new pc.Color(1, 0.95, 0.9),
      intensity: 1.5,
      castShadows: true,
      shadowDistance: 50,
      shadowResolution: 2048,
      shadowBias: 0.2,
      normalOffsetBias: 0.05
    });
    sun.setLocalPosition(10, 20, 10);
    sun.setLocalEulerAngles(45, 45, 0);
    this.app.root.addChild(sun);
    this.sun = sun;

    // Ambient light for fill
    const ambient = new pc.Entity('Ambient');
    ambient.addComponent('light', {
      type: 'point',
      color: new pc.Color(0.4, 0.5, 0.7),
      intensity: 0.6,
      range: 100
    });
    ambient.setLocalPosition(0, 15, 0);
    this.app.root.addChild(ambient);

    // Warm fill light from spawn side
    const warmFill = new pc.Entity('WarmFill');
    warmFill.addComponent('light', {
      type: 'point',
      color: new pc.Color(1, 0.6, 0.3),
      intensity: 0.4,
      range: 40
    });
    warmFill.setLocalPosition(-12, 8, 0);
    this.app.root.addChild(warmFill);

    // Cool fill light from base side
    const coolFill = new pc.Entity('CoolFill');
    coolFill.addComponent('light', {
      type: 'point',
      color: new pc.Color(0.3, 0.7, 1),
      intensity: 0.4,
      range: 40
    });
    coolFill.setLocalPosition(12, 8, 0);
    this.app.root.addChild(coolFill);
  }

  /**
   * Create skybox/background.
   */
  createSkybox() {
    // Set clear color to dark blue gradient
    if (this.camera && this.camera.camera) {
      this.camera.camera.clearColor = new pc.Color(0.02, 0.03, 0.08);
    }
  }

  /**
   * Create ground plane.
   */
  createGround() {
    const ground = new pc.Entity('Ground');

    // Create plane geometry
    ground.addComponent('render', {
      type: 'plane'
    });

    // Position at origin, y=0 (floor level)
    ground.setLocalPosition(0, 0, 0);
    ground.setLocalScale(GROUND_WIDTH, 1, GROUND_DEPTH);

    // Darker base with subtle blue tint for atmosphere
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.15, 0.18, 0.22);
    material.specular = new pc.Color(0.1, 0.1, 0.15);
    material.shininess = 10;
    material.update();
    ground.render.material = material;

    this.app.root.addChild(ground);
    this.ground = ground;

    // Create grid overlay for visual depth
    this._createGridOverlay();
  }

  /**
   * Create subtle grid overlay on ground.
   */
  _createGridOverlay() {
    const gridSize = 2;
    const gridCountX = Math.floor(GROUND_WIDTH / gridSize);
    const gridCountZ = Math.floor(GROUND_DEPTH / gridSize);

    for (let x = 0; x < gridCountX; x++) {
      for (let z = 0; z < gridCountZ; z++) {
        // Skip center area (path)
        const worldX = (x - gridCountX / 2 + 0.5) * gridSize;
        const worldZ = (z - gridCountZ / 2 + 0.5) * gridSize;

        // Skip if near path (simple check)
        if (this._isNearPath(worldX, worldZ, 1.5)) continue;

        const cell = new pc.Entity(`GridCell_${x}_${z}`);
        cell.addComponent('render', { type: 'plane' });
        cell.setLocalPosition(worldX, 0.01, worldZ);
        cell.setLocalScale(gridSize * 0.95, 1, gridSize * 0.95);

        const material = new pc.StandardMaterial();
        material.diffuse = new pc.Color(0.18, 0.22, 0.28);
        material.opacity = 0.5;
        material.update();
        cell.render.material = material;

        this.app.root.addChild(cell);
      }
    }
  }

  /**
   * Check if position is near the path.
   */
  _isNearPath(x, z, threshold) {
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const start = WAYPOINTS[i];
      const end = WAYPOINTS[i + 1];

      // Simple distance check to path segment
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      const t = Math.max(0, Math.min(1,
        ((x - start.x) * dx + (z - start.z) * dz) / (length * length)
      ));

      const closestX = start.x + t * dx;
      const closestZ = start.z + t * dz;

      const distToPath = Math.sqrt((x - closestX) ** 2 + (z - closestZ) ** 2);
      if (distToPath < threshold) return true;
    }
    return false;
  }

  /**
   * Create fixed perspective camera.
   * High-angle top-down view per §17.1
   */
  createCamera() {
    const camera = new pc.Entity('MainCamera');

    camera.addComponent('camera', {
      clearColor: new pc.Color(0.05, 0.06, 0.1), // Darker blue-grey background
      fov: 55,
      near: 0.1,
      far: 100
    });

    // Position camera high and angled to see whole battlefield
    // Looking down at center of battlefield from above and slightly in front
    camera.setLocalPosition(0, 28, 18);

    // Look at center of battlefield (world origin)
    camera.lookAt(0, 0, 0);

    this.app.root.addChild(camera);
    this.camera = camera;
  }

  /**
   * Create base placeholder marker at the end of the path.
   */
  createBaseMarker() {
    // Main base structure - crystalline core
    const base = new pc.Entity('BaseMarker');

    base.addComponent('render', {
      type: 'cylinder'
    });

    base.setLocalPosition(BASE_POINT.x, 1.0, BASE_POINT.z);
    base.setLocalScale(2.5, 2.0, 2.5);

    // Bright cyan-white color for core (per §7.4)
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.4, 0.95, 1.0);
    material.emissive = new pc.Color(0.3, 0.8, 0.9);
    material.specular = new pc.Color(1, 1, 1);
    material.shininess = 150;
    material.update();
    base.render.material = material;

    this.app.root.addChild(base);
    this.baseMarker = base;

    // Inner glowing orb
    const orb = new pc.Entity('BaseOrb');
    orb.addComponent('render', { type: 'sphere' });
    orb.setLocalPosition(BASE_POINT.x, 1.5, BASE_POINT.z);
    orb.setLocalScale(1.2, 1.2, 1.2);

    const orbMaterial = new pc.StandardMaterial();
    orbMaterial.diffuse = new pc.Color(0.6, 1.0, 1.0);
    orbMaterial.emissive = new pc.Color(0.5, 1.0, 1.0);
    orbMaterial.specular = new pc.Color(1, 1, 1);
    orbMaterial.shininess = 200;
    orbMaterial.update();
    orb.render.material = orbMaterial;

    this.app.root.addChild(orb);
    this.baseOrb = orb;

    // Add glow ring around base
    const glow = new pc.Entity('BaseGlow');
    glow.addComponent('render', { type: 'torus' });
    glow.setLocalPosition(BASE_POINT.x, 0.1, BASE_POINT.z);
    glow.setLocalScale(4.5, 4.5, 0.4);
    glow.setLocalEulerAngles(90, 0, 0);

    const glowMaterial = new pc.StandardMaterial();
    glowMaterial.diffuse = new pc.Color(0.3, 0.9, 1.0);
    glowMaterial.emissive = new pc.Color(0.2, 0.6, 0.8);
    glowMaterial.opacity = 0.6;
    glowMaterial.update();
    glow.render.material = glowMaterial;

    this.app.root.addChild(glow);
    this.baseGlow = glow;

    // Secondary outer ring
    const outerRing = new pc.Entity('BaseOuterRing');
    outerRing.addComponent('render', { type: 'torus' });
    outerRing.setLocalPosition(BASE_POINT.x, 0.05, BASE_POINT.z);
    outerRing.setLocalScale(5.5, 5.5, 0.25);
    outerRing.setLocalEulerAngles(90, 0, 0);

    const outerMaterial = new pc.StandardMaterial();
    outerMaterial.diffuse = new pc.Color(0.2, 0.5, 0.7);
    outerMaterial.emissive = new pc.Color(0.1, 0.3, 0.5);
    outerMaterial.opacity = 0.4;
    outerMaterial.update();
    outerRing.render.material = outerMaterial;

    this.app.root.addChild(outerRing);

    // Floating crystals around base
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const crystal = new pc.Entity(`BaseCrystal_${i}`);
      crystal.addComponent('render', { type: 'cone' });
      crystal.setLocalPosition(
        BASE_POINT.x + Math.cos(angle) * 2.5,
        0.8,
        BASE_POINT.z + Math.sin(angle) * 2.5
      );
      crystal.setLocalScale(0.4, 1.2, 0.4);
      crystal.setLocalEulerAngles(180, angle * (180 / Math.PI), 0);

      const crystalMaterial = new pc.StandardMaterial();
      crystalMaterial.diffuse = new pc.Color(0.5, 0.95, 1.0);
      crystalMaterial.emissive = new pc.Color(0.3, 0.7, 0.8);
      crystalMaterial.specular = new pc.Color(1, 1, 1);
      crystalMaterial.shininess = 150;
      crystalMaterial.update();
      crystal.render.material = crystalMaterial;

      this.app.root.addChild(crystal);
    }
  }

  /**
   * Create spawn point marker at the start of the path.
   */
  createSpawnMarker() {
    // Main spawn structure - dark portal
    const spawn = new pc.Entity('SpawnMarker');

    spawn.addComponent('render', {
      type: 'cylinder'
    });

    spawn.setLocalPosition(SPAWN_POINT.x, 0.8, SPAWN_POINT.z);
    spawn.setLocalScale(2.0, 1.6, 2.0);

    // Dark portal color
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.2, 0.1, 0.15);
    material.emissive = new pc.Color(0.4, 0.1, 0.2);
    material.specular = new pc.Color(0.3, 0.2, 0.25);
    material.shininess = 80;
    material.update();
    spawn.render.material = material;

    this.app.root.addChild(spawn);
    this.spawnMarker = spawn;

    // Inner dark core
    const core = new pc.Entity('SpawnCore');
    core.addComponent('render', { type: 'sphere' });
    core.setLocalPosition(SPAWN_POINT.x, 1.0, SPAWN_POINT.z);
    core.setLocalScale(0.8, 0.8, 0.8);

    const coreMaterial = new pc.StandardMaterial();
    coreMaterial.diffuse = new pc.Color(0.8, 0.2, 0.3);
    coreMaterial.emissive = new pc.Color(0.6, 0.1, 0.2);
    coreMaterial.specular = new pc.Color(1, 0.5, 0.5);
    coreMaterial.shininess = 100;
    coreMaterial.update();
    core.render.material = coreMaterial;

    this.app.root.addChild(core);

    // Add warning ring
    const ring = new pc.Entity('SpawnRing');
    ring.addComponent('render', { type: 'torus' });
    ring.setLocalPosition(SPAWN_POINT.x, 0.1, SPAWN_POINT.z);
    ring.setLocalScale(3.5, 3.5, 0.3);
    ring.setLocalEulerAngles(90, 0, 0);

    const ringMaterial = new pc.StandardMaterial();
    ringMaterial.diffuse = new pc.Color(1.0, 0.25, 0.15);
    ringMaterial.emissive = new pc.Color(0.7, 0.15, 0.1);
    ringMaterial.opacity = 0.7;
    ringMaterial.update();
    ring.render.material = ringMaterial;

    this.app.root.addChild(ring);

    // Outer pulsing ring
    const outerRing = new pc.Entity('SpawnOuterRing');
    outerRing.addComponent('render', { type: 'torus' });
    outerRing.setLocalPosition(SPAWN_POINT.x, 0.05, SPAWN_POINT.z);
    outerRing.setLocalScale(4.5, 4.5, 0.2);
    outerRing.setLocalEulerAngles(90, 0, 0);

    const outerMaterial = new pc.StandardMaterial();
    outerMaterial.diffuse = new pc.Color(0.6, 0.15, 0.1);
    outerMaterial.emissive = new pc.Color(0.4, 0.08, 0.05);
    outerMaterial.opacity = 0.4;
    outerMaterial.update();
    outerRing.render.material = outerMaterial;

    this.app.root.addChild(outerRing);

    // Dark crystals around spawn
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const crystal = new pc.Entity(`SpawnCrystal_${i}`);
      crystal.addComponent('render', { type: 'cone' });
      crystal.setLocalPosition(
        SPAWN_POINT.x + Math.cos(angle) * 1.8,
        0.6,
        SPAWN_POINT.z + Math.sin(angle) * 1.8
      );
      crystal.setLocalScale(0.35, 1.0, 0.35);
      crystal.setLocalEulerAngles(180, angle * (180 / Math.PI), 0);

      const crystalMaterial = new pc.StandardMaterial();
      crystalMaterial.diffuse = new pc.Color(0.8, 0.2, 0.25);
      crystalMaterial.emissive = new pc.Color(0.5, 0.1, 0.15);
      crystalMaterial.specular = new pc.Color(1, 0.5, 0.5);
      crystalMaterial.shininess = 100;
      crystalMaterial.update();
      crystal.render.material = crystalMaterial;

      this.app.root.addChild(crystal);
    }
  }

  /**
   * Create path visualization through waypoints.
   */
  createPathVisualization() {
    // Create glowing path segments connecting waypoints
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const start = WAYPOINTS[i];
      const end = WAYPOINTS[i + 1];

      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      // Main path segment
      const segment = new pc.Entity(`PathSegment_${i}`);
      segment.addComponent('render', {
        type: 'box'
      });

      // Position at midpoint
      segment.setLocalPosition(
        (start.x + end.x) / 2,
        0.08,
        (start.z + end.z) / 2
      );

      // Scale: visible path
      segment.setLocalScale(1.2, 0.15, length);
      segment.setLocalEulerAngles(0, -angle * (180 / Math.PI), 0);

      // Path color - warm but readable (per §7.4)
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.5, 0.55, 0.6);
      material.emissive = new pc.Color(0.15, 0.2, 0.25);
      material.update();
      segment.render.material = material;

      this.app.root.addChild(segment);
      this.pathMarkers.push(segment);

      // Path edge markers for visibility
      const edgeL = new pc.Entity(`PathEdge_L_${i}`);
      edgeL.addComponent('render', { type: 'box' });
      edgeL.setLocalPosition(
        (start.x + end.x) / 2 - Math.cos(angle) * 0.55,
        0.05,
        (start.z + end.z) / 2 + Math.sin(angle) * 0.55
      );
      edgeL.setLocalScale(0.1, 0.1, length);
      edgeL.setLocalEulerAngles(0, -angle * (180 / Math.PI), 0);

      const edgeMaterial = new pc.StandardMaterial();
      edgeMaterial.diffuse = new pc.Color(0.3, 0.8, 0.9);
      edgeMaterial.emissive = new pc.Color(0.1, 0.4, 0.5);
      edgeMaterial.update();
      edgeL.render.material = edgeMaterial;

      this.app.root.addChild(edgeL);
      this.pathMarkers.push(edgeL);

      const edgeR = new pc.Entity(`PathEdge_R_${i}`);
      edgeR.addComponent('render', { type: 'box' });
      edgeR.setLocalPosition(
        (start.x + end.x) / 2 + Math.cos(angle) * 0.55,
        0.05,
        (start.z + end.z) / 2 - Math.sin(angle) * 0.55
      );
      edgeR.setLocalScale(0.1, 0.1, length);
      edgeR.setLocalEulerAngles(0, -angle * (180 / Math.PI), 0);
      edgeR.render.material = edgeMaterial;

      this.app.root.addChild(edgeR);
      this.pathMarkers.push(edgeR);
    }

    // Waypoint markers
    WAYPOINTS.forEach((wp, index) => {
      // Skip first and last (spawn and base have their own markers)
      if (index === 0 || index === WAYPOINTS.length - 1) return;

      const marker = new pc.Entity(`PathMarker_${index}`);
      marker.addComponent('render', { type: 'cylinder' });
      marker.setLocalPosition(wp.x, 0.15, wp.z);
      marker.setLocalScale(0.6, 0.3, 0.6);

      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.4, 0.75, 0.85);
      material.emissive = new pc.Color(0.2, 0.4, 0.5);
      material.update();
      marker.render.material = material;

      this.app.root.addChild(marker);
      this.pathMarkers.push(marker);
    });
  }

  /**
   * Create exactly two build slot markers.
   * Click detection is handled via custom ray-plane intersection in GameBootstrap.
   */
  createBuildSlotMarkers() {
    BUILD_SLOTS.forEach((slot) => {
      // Base platform
      const marker = new pc.Entity(`BuildSlot_${slot.id}`);

      marker.addComponent('render', {
        type: 'cylinder'
      });

      marker.setLocalPosition(slot.x, 0.15, slot.z);
      marker.setLocalScale(2, 0.3, 2);

      // Glowing platform color (per §7.5)
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.6, 0.65, 0.7);
      material.emissive = new pc.Color(0.25, 0.28, 0.35);
      material.specular = new pc.Color(0.3, 0.3, 0.3);
      material.shininess = 20;
      material.update();
      marker.render.material = material;

      // Store slot id on entity for identification
      marker.slotId = slot.id;
      marker.slotData = slot;

      this.app.root.addChild(marker);
      this.buildSlotMarkers.push(marker);

      // Slot ring indicator
      const ring = new pc.Entity(`SlotRing_${slot.id}`);
      ring.addComponent('render', { type: 'torus' });
      ring.setLocalPosition(slot.x, 0.05, slot.z);
      ring.setLocalScale(1.8, 1.8, 0.2);
      ring.setLocalEulerAngles(90, 0, 0);

      const ringMaterial = new pc.StandardMaterial();
      ringMaterial.diffuse = new pc.Color(0.95, 0.9, 0.75);
      ringMaterial.emissive = new pc.Color(0.4, 0.35, 0.2);
      ringMaterial.update();
      ring.render.material = ringMaterial;

      this.app.root.addChild(ring);

      // Initialize slot state
      this.buildSlotStates[slot.id] = {
        occupied: false,
        entity: marker
      };
    });
  }

  /**
   * Get camera entity for raycast.
   * @returns {pc.Entity}
   */
  getCamera() {
    return this.camera;
  }

  /**
   * Get build slot by id.
   * @param {string} slotId
   * @returns {object|null}
   */
  getSlotState(slotId) {
    return this.buildSlotStates[slotId] || null;
  }

  /**
   * Mark a slot as occupied.
   * @param {string} slotId
   */
  setSlotOccupied(slotId) {
    if (this.buildSlotStates[slotId]) {
      this.buildSlotStates[slotId].occupied = true;
      console.log(`[SceneFactory] Slot ${slotId} marked as occupied`);
    }
  }

  /**
   * Mark a slot as unoccupied.
   * @param {string} slotId
   */
  setSlotUnoccupied(slotId) {
    if (this.buildSlotStates[slotId]) {
      this.buildSlotStates[slotId].occupied = false;
      console.log(`[SceneFactory] Slot ${slotId} marked as unoccupied`);
    }
  }

  /**
   * Check if a slot is occupied.
   * @param {string} slotId
   * @returns {boolean}
   */
  isSlotOccupied(slotId) {
    const state = this.buildSlotStates[slotId];
    return state ? state.occupied : false;
  }

  /**
   * Get all build slot markers.
   * @returns {pc.Entity[]}
   */
  getBuildSlotMarkers() {
    return this.buildSlotMarkers;
  }
}
