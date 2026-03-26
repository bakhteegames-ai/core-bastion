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
 */
export class SceneFactory {
  constructor(app) {
    this.app = app;
    this.ground = null;
    this.camera = null;
    this.baseMarker = null;
    this.spawnMarker = null;
    this.pathMarkers = [];
    this.buildSlotMarkers = [];
    this.buildSlotStates = {}; // Track occupied state by slot id
  }

  /**
   * Create the complete battlefield scene.
   */
  createBattlefield() {
    this.createGround();
    this.createCamera();
    this.createBaseMarker();
    this.createSpawnMarker();
    this.createPathVisualization();
    this.createBuildSlotMarkers();

    console.log('[SceneFactory] Battlefield created');
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

    // Simple grey material
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.3, 0.35, 0.4); // Cool slate grey
    material.update();
    ground.render.material = material;

    this.app.root.addChild(ground);
    this.ground = ground;
  }

  /**
   * Create fixed perspective camera.
   * High-angle top-down view per §17.1
   */
  createCamera() {
    const camera = new pc.Entity('MainCamera');

    camera.addComponent('camera', {
      clearColor: new pc.Color(0.1, 0.1, 0.15), // Dark blue-grey background
      fov: 60,
      near: 0.1,
      far: 100
    });

    // Position camera high and angled to see whole battlefield
    // Looking down at center of battlefield from above and slightly in front
    camera.setLocalPosition(0, 25, 15);

    // Look at center of battlefield (world origin)
    camera.lookAt(0, 0, 0);

    this.app.root.addChild(camera);
    this.camera = camera;
  }

  /**
   * Create base placeholder marker at the end of the path.
   */
  createBaseMarker() {
    const base = new pc.Entity('BaseMarker');

    base.addComponent('render', {
      type: 'cylinder'
    });

    base.setLocalPosition(BASE_POINT.x, 0.5, BASE_POINT.z);
    base.setLocalScale(2, 1, 2);

    // Bright cyan-white color for core (per §7.4)
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.2, 0.9, 1.0);
    material.emissive = new pc.Color(0.1, 0.4, 0.5);
    material.update();
    base.render.material = material;

    this.app.root.addChild(base);
    this.baseMarker = base;
  }

  /**
   * Create spawn point marker at the start of the path.
   */
  createSpawnMarker() {
    const spawn = new pc.Entity('SpawnMarker');

    spawn.addComponent('render', {
      type: 'box'
    });

    spawn.setLocalPosition(SPAWN_POINT.x, 0.25, SPAWN_POINT.z);
    spawn.setLocalScale(1.5, 0.5, 1.5);

    // Pale energy color to indicate spawn
    const material = new pc.StandardMaterial();
    material.diffuse = new pc.Color(0.5, 0.8, 0.9);
    material.update();
    spawn.render.material = material;

    this.app.root.addChild(spawn);
    this.spawnMarker = spawn;
  }

  /**
   * Create path visualization through waypoints.
   */
  createPathVisualization() {
    // Create a line or series of markers along the path
    // Using small markers at each waypoint for simplicity

    WAYPOINTS.forEach((wp, index) => {
      const marker = new pc.Entity(`PathMarker_${index}`);

      marker.addComponent('render', {
        type: 'sphere'
      });

      marker.setLocalPosition(wp.x, 0.2, wp.z);
      marker.setLocalScale(0.4, 0.4, 0.4);

      // Cyan/pale energy line color (per §7.4)
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.3, 0.8, 0.9);
      material.emissive = new pc.Color(0.1, 0.3, 0.4);
      material.update();
      marker.render.material = material;

      this.app.root.addChild(marker);
      this.pathMarkers.push(marker);
    });

    // Create path line connecting waypoints
    this.createPathLine();
  }

  /**
   * Create a visual line connecting the waypoints.
   */
  createPathLine() {
    // Create a simple visual connection between waypoints
    // Using thin boxes as path segments
    for (let i = 0; i < WAYPOINTS.length - 1; i++) {
      const start = WAYPOINTS[i];
      const end = WAYPOINTS[i + 1];

      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const segment = new pc.Entity(`PathSegment_${i}`);
      segment.addComponent('render', {
        type: 'box'
      });

      // Position at midpoint
      segment.setLocalPosition(
        (start.x + end.x) / 2,
        0.05,
        (start.z + end.z) / 2
      );

      // Scale: thin and flat path segment
      segment.setLocalScale(0.3, 0.1, length);
      segment.setLocalEulerAngles(0, -angle * (180 / Math.PI), 0);

      // Path color - bright readable lane tone (per §7.4)
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.4, 0.7, 0.8);
      material.update();
      segment.render.material = material;

      this.app.root.addChild(segment);
      this.pathMarkers.push(segment);
    }
  }

  /**
   * Create exactly two build slot markers with collision for click detection.
   */
  createBuildSlotMarkers() {
    BUILD_SLOTS.forEach((slot) => {
      const marker = new pc.Entity(`BuildSlot_${slot.id}`);

      // Render component
      marker.addComponent('render', {
        type: 'box'
      });

      // Collision component for raycast detection
      marker.addComponent('collision', {
        type: 'box',
        halfExtents: new pc.Vec3(0.75, 0.1, 0.75)
      });

      marker.setLocalPosition(slot.x, 0.1, slot.z);
      marker.setLocalScale(1.5, 0.2, 1.5);

      // Glowing, flat, unmistakable (per §7.5)
      const material = new pc.StandardMaterial();
      material.diffuse = new pc.Color(0.9, 0.85, 0.7); // Ivory-metal
      material.emissive = new pc.Color(0.3, 0.3, 0.2);
      material.update();
      marker.render.material = material;

      // Store slot id on entity for identification
      marker.slotId = slot.id;
      marker.slotData = slot;

      this.app.root.addChild(marker);
      this.buildSlotMarkers.push(marker);

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
