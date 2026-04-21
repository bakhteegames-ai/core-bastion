import * as pc from 'playcanvas';
import { getLevel, DEFAULT_LEVEL_ID } from '../data/levels.js';

/**
 * SceneFactory
 * Creates the active authored battlefield from level data.
 */
export class SceneFactory {
  constructor(app, level = getLevel(DEFAULT_LEVEL_ID), assetLoader = null) {
    this.app = app;
    this.currentLevel = level;
    this.assetLoader = assetLoader;
    this.sceneRoot = null;
    this.ground = null;
    this.camera = null;
    this.baseMarker = null;
    this.spawnMarker = null;
    this.pathMarkers = [];
    this.buildSlotMarkers = [];
    this.buildSlotStates = {};
    this._animatedRotators = [];
    this._animatedPulses = [];
    this._pulsingLights = [];
    this._time = 0;
  }

  setLevel(level) {
    this.currentLevel = level || getLevel(DEFAULT_LEVEL_ID);
  }

  setAssetLoader(assetLoader) {
    this.assetLoader = assetLoader;
  }

  createBattlefield(level = this.currentLevel) {
    this.setLevel(level);
    this.destroyBattlefield();

    this.sceneRoot = new pc.Entity(`Battlefield_${this.currentLevel.id}`);
    this.app.root.addChild(this.sceneRoot);
    this.pathMarkers = [];
    this.buildSlotMarkers = [];
    this.buildSlotStates = {};
    this._animatedRotators = [];
    this._animatedPulses = [];
    this._pulsingLights = [];
    this._time = 0;

    this.createLighting();
    this.createGroundShell();
    if (!this.createEnvironmentAsset()) {
      this.createFloorPlates();
      this.createEnergyTrenches();
      this.createFortressWalls();
      this.createBackdropColumns();
      this.createBridgeDetails();
    }
    this.createCamera();
    this.createSkybox();
    this.createBaseMarker();
    this.createSpawnMarker();
    this.createPathVisualization();
    this.createBeacons();
    this.createBuildSlotMarkers();
  }

  destroyBattlefield() {
    if (this.sceneRoot) {
      this.sceneRoot.destroy();
      this.sceneRoot = null;
    }

    this.ground = null;
    this.camera = null;
    this.baseMarker = null;
    this.spawnMarker = null;
    this.pathMarkers = [];
    this.buildSlotMarkers = [];
    this.buildSlotStates = {};
    this._animatedRotators = [];
    this._animatedPulses = [];
    this._pulsingLights = [];
  }

  update(dt) {
    if (!this.sceneRoot) return;

    this._time += dt;

    this._animatedRotators.forEach(({ entity, speed, axis = 'y' }) => {
      const angles = entity.getLocalEulerAngles();
      if (axis === 'x') {
        entity.setLocalEulerAngles(angles.x + speed * dt, angles.y, angles.z);
      } else if (axis === 'z') {
        entity.setLocalEulerAngles(angles.x, angles.y, angles.z + speed * dt);
      } else {
        entity.setLocalEulerAngles(angles.x, angles.y + speed * dt, angles.z);
      }
    });

    this._animatedPulses.forEach(({ entity, baseScale, amplitude, speed, phase = 0 }) => {
      const pulse = 1 + Math.sin(this._time * speed + phase) * amplitude;
      entity.setLocalScale(baseScale.x * pulse, baseScale.y * pulse, baseScale.z * pulse);
    });

    this._pulsingLights.forEach(({ entity, baseIntensity, amplitude, speed, phase = 0 }) => {
      if (entity?.light) {
        entity.light.intensity = baseIntensity + Math.sin(this._time * speed + phase) * amplitude;
      }
    });
  }

  createLighting() {
    const theme = this.currentLevel.theme;
    this.app.scene.ambientLight = this._toColor(theme.ambientColor);

    const sun = new pc.Entity('BastionSun');
    sun.addComponent('light', {
      type: 'directional',
      color: new pc.Color(0.95, 0.9, 0.86),
      intensity: 1.25,
      castShadows: true,
      shadowDistance: 70,
      shadowResolution: 2048,
      shadowBias: 0.2,
      normalOffsetBias: 0.05
    });
    sun.setLocalPosition(-8, 20, 10);
    sun.setLocalEulerAngles(52, 34, 0);
    this.sceneRoot.addChild(sun);

    const spawnFill = this._createPointLight(
      'SpawnFill',
      this.currentLevel.spawn.x - 2,
      4.5,
      this.currentLevel.spawn.z,
      theme.spawnColor,
      2.0,
      22
    );

    const coreFill = this._createPointLight(
      'CoreFill',
      this.currentLevel.base.x,
      5,
      this.currentLevel.base.z,
      theme.coreColor,
      2.4,
      22
    );

    const trenchFill = this._createPointLight(
      'TrenchFill',
      2.5,
      -0.2,
      1.8,
      theme.trenchGlow,
      1.5,
      26
    );

    this._pulsingLights.push(
      { entity: spawnFill, baseIntensity: 2.0, amplitude: 0.35, speed: 2.5, phase: 0.4 },
      { entity: coreFill, baseIntensity: 2.4, amplitude: 0.45, speed: 3.3, phase: 0.8 },
      { entity: trenchFill, baseIntensity: 1.5, amplitude: 0.25, speed: 2.1, phase: 1.2 }
    );
  }

  createSkybox() {
    if (this.camera?.camera) {
      this.camera.camera.clearColor = this._toColor(this.currentLevel.theme.skyColor);
    }
  }

  createGroundShell() {
    const { width, depth } = this.currentLevel.battlefield;
    const theme = this.currentLevel.theme;

    const hull = this._createBox(
      'CitadelHull',
      { x: 0, y: -0.7, z: 0 },
      { x: width, y: 1.2, z: depth },
      this._createMaterial(theme.groundColor, {
        specular: { r: 0.08, g: 0.1, b: 0.14 },
        shininess: 10
      })
    );
    this.ground = hull;

    const underglow = this._createPlane(
      'Underglow',
      { x: 0, y: -0.08, z: 0 },
      { x: width * 0.97, y: 1, z: depth * 0.97 },
      this._createMaterial(theme.trenchGlow, {
        emissive: theme.trenchGlow,
        opacity: 0.12
      })
    );
    underglow.setLocalEulerAngles(90, 0, 0);
  }

  createEnvironmentAsset() {
    const environment = this._instantiateAsset(
      'broken_halo_env',
      'BrokenHaloEnvironment',
      [0, 0, 0]
    );

    if (!environment) {
      return false;
    }

    const silhouette = this._createBox(
      'EnvironmentShadowPlate',
      { x: 0, y: -0.65, z: 0 },
      { x: 32, y: 0.08, z: 26 },
      this._createMaterial({ r: 0.02, g: 0.03, b: 0.05 }, { opacity: 0.38 })
    );
    silhouette.setLocalEulerAngles(0, 0, 0);

    return true;
  }

  createFloorPlates() {
    const theme = this.currentLevel.theme;
    const floorMaterial = this._createMaterial(theme.metalColor, {
      specular: theme.metalAccent,
      shininess: 35
    });

    const accentMaterial = this._createMaterial(theme.metalAccent, {
      emissive: { r: theme.metalAccent.r * 0.15, g: theme.metalAccent.g * 0.15, b: theme.metalAccent.b * 0.2 },
      specular: theme.metalAccent,
      shininess: 45
    });

    this.currentLevel.setPieces.floorPlates.forEach((plate, index) => {
      this._createBox(plate.name, plate.position, plate.scale, index === 1 ? accentMaterial : floorMaterial);
      this._createPlateTrim(plate, theme);
    });

    const innerHalo = this._createCylinder(
      'InnerHalo',
      { x: 9.5, y: 0.05, z: -4.5 },
      { x: 7.4, y: 0.12, z: 7.4 },
      this._createMaterial(theme.metalAccent, {
        emissive: { r: 0.05, g: 0.11, b: 0.14 },
        specular: theme.neutralGlow,
        shininess: 50
      })
    );
    innerHalo.setLocalEulerAngles(0, 0, 0);

    const innerHaloRing = this._createTorus(
      'InnerHaloRing',
      { x: 9.5, y: 0.14, z: -4.5 },
      { x: 6.2, y: 6.2, z: 0.24 },
      this._createMaterial(theme.coreColor, {
        emissive: { r: theme.coreColor.r * 0.45, g: theme.coreColor.g * 0.45, b: theme.coreColor.b * 0.45 },
        opacity: 0.55
      }),
      { x: 90, y: 0, z: 0 }
    );
    this._animatedRotators.push({ entity: innerHaloRing, speed: 14 });
  }

  createEnergyTrenches() {
    const theme = this.currentLevel.theme;
    const trenchMaterial = this._createMaterial(theme.trenchColor, {
      specular: { r: 0.05, g: 0.08, b: 0.12 },
      shininess: 5
    });
    const glowMaterial = this._createMaterial(theme.trenchGlow, {
      emissive: { r: theme.trenchGlow.r * 0.7, g: theme.trenchGlow.g * 0.7, b: theme.trenchGlow.b * 0.7 },
      opacity: 0.42
    });

    this.currentLevel.setPieces.trenchSegments.forEach((segment, index) => {
      this._createBox(segment.name, segment.position, segment.scale, trenchMaterial);

      const glow = this._createPlane(
        `${segment.name}_Glow`,
        { x: segment.position.x, y: -0.02, z: segment.position.z },
        { x: segment.scale.x * 0.92, y: 1, z: segment.scale.z * 0.92 },
        glowMaterial
      );
      glow.setLocalEulerAngles(90, index % 2 === 0 ? 0 : 90, 0);
      this._animatedPulses.push({
        entity: glow,
        baseScale: glow.getLocalScale().clone(),
        amplitude: 0.06,
        speed: 2.8,
        phase: index * 0.6
      });
    });
  }

  createFortressWalls() {
    const theme = this.currentLevel.theme;
    const wallMaterial = this._createMaterial(theme.metalAccent, {
      specular: theme.neutralGlow,
      shininess: 40
    });
    const capMaterial = this._createMaterial(theme.pathEdgeColor, {
      emissive: { r: theme.pathEdgeColor.r * 0.18, g: theme.pathEdgeColor.g * 0.18, b: theme.pathEdgeColor.b * 0.18 },
      opacity: 0.4
    });

    this.currentLevel.setPieces.wallSegments.forEach((wall) => {
      this._createBox(wall.name, wall.position, wall.scale, wallMaterial);
      this._createBox(
        `${wall.name}_Cap`,
        { x: wall.position.x, y: wall.position.y + wall.scale.y / 2 + 0.08, z: wall.position.z },
        { x: wall.scale.x * 0.92, y: 0.16, z: wall.scale.z * 0.92 },
        capMaterial
      );
    });

    this._createBrokenGate();
  }

  createBackdropColumns() {
    const theme = this.currentLevel.theme;
    const pylonMaterial = this._createMaterial(theme.metalAccent, {
      emissive: { r: 0.04, g: 0.06, b: 0.08 },
      specular: theme.neutralGlow,
      shininess: 45
    });

    const columnPositions = [
      { x: -11.8, y: 2.8, z: 12.1, h: 5.8 },
      { x: -5.8, y: 2.6, z: 12.0, h: 5.2 },
      { x: 7.8, y: 2.5, z: 6.3, h: 4.8 },
      { x: 12.4, y: 2.7, z: -7.4, h: 5.4 },
      { x: 6.8, y: 2.3, z: -10.6, h: 4.6 }
    ];

    columnPositions.forEach((column, index) => {
      this._createBox(
        `BackdropColumn_${index}`,
        { x: column.x, y: column.y, z: column.z },
        { x: 1.2, y: column.h, z: 1.2 },
        pylonMaterial
      );

      const cap = this._createSphere(
        `BackdropCap_${index}`,
        { x: column.x, y: column.y + column.h / 2 + 0.35, z: column.z },
        { x: 0.36, y: 0.36, z: 0.36 },
        this._createMaterial(index % 2 === 0 ? theme.pathEdgeColor : theme.coreColor, {
          emissive: index % 2 === 0 ? theme.pathEdgeColor : theme.coreColor
        })
      );

      this._animatedPulses.push({
        entity: cap,
        baseScale: cap.getLocalScale().clone(),
        amplitude: 0.12,
        speed: 2.1,
        phase: index * 0.7
      });
    });
  }

  createBridgeDetails() {
    const theme = this.currentLevel.theme;
    const railMaterial = this._createMaterial(theme.pathEdgeColor, {
      emissive: { r: theme.pathEdgeColor.r * 0.26, g: theme.pathEdgeColor.g * 0.26, b: theme.pathEdgeColor.b * 0.26 },
      opacity: 0.52
    });
    const braceMaterial = this._createMaterial(theme.metalAccent, {
      specular: theme.neutralGlow,
      shininess: 40
    });

    const rails = [
      { x: 1.0, y: 0.6, z: 3.6, scale: { x: 6.2, y: 0.18, z: 0.2 } },
      { x: 2.2, y: 0.6, z: -0.6, scale: { x: 6.8, y: 0.18, z: 0.2 } }
    ];

    rails.forEach((rail, index) => {
      const entity = this._createBox(`BridgeRail_${index}`, rail, rail.scale, railMaterial);
      this._animatedPulses.push({
        entity,
        baseScale: entity.getLocalScale().clone(),
        amplitude: 0.04,
        speed: 2.6,
        phase: index * 0.5
      });
    });

    [-0.8, 2.2, 5.2].forEach((x, index) => {
      this._createBox(
        `BridgeBrace_${index}`,
        { x, y: 0.8, z: 1.45 },
        { x: 0.22, y: 1.15, z: 4.9 },
        braceMaterial
      );
    });
  }

  createCamera() {
    const camera = new pc.Entity('MainCamera');
    camera.addComponent('camera', {
      clearColor: this._toColor(this.currentLevel.theme.skyColor),
      fov: 52,
      near: 0.1,
      far: 120
    });

    const { x, y, z, target } = this.currentLevel.camera;
    camera.setLocalPosition(x, y, z);
    camera.lookAt(target.x, target.y, target.z);

    this.sceneRoot.addChild(camera);
    this.camera = camera;
  }

  createBaseMarker() {
    const theme = this.currentLevel.theme;
    const base = this.currentLevel.base;

    const reactorAsset = this._instantiateAsset(
      'broken_halo_reactor',
      'CoreReactorAsset',
      [base.x, 0.18, base.z]
    );
    if (reactorAsset) {
      this.baseMarker = reactorAsset;

      const innerRing = this._createTorus(
        'CoreInnerRing',
        { x: base.x, y: 1.45, z: base.z },
        { x: 4.1, y: 4.1, z: 0.2 },
        this._createMaterial(theme.coreColor, {
          emissive: { r: theme.coreColor.r * 0.5, g: theme.coreColor.g * 0.5, b: theme.coreColor.b * 0.5 },
          opacity: 0.5
        }),
        { x: 90, y: 0, z: 0 }
      );

      const outerRing = this._createTorus(
        'CoreOuterRing',
        { x: base.x, y: 2.2, z: base.z },
        { x: 5.3, y: 5.3, z: 0.14 },
        this._createMaterial(theme.neutralGlow, {
          emissive: { r: 0.3, g: 0.26, b: 0.18 },
          opacity: 0.34
        }),
        { x: 90, y: 0, z: 0 }
      );

      this._animatedRotators.push(
        { entity: innerRing, speed: 24 },
        { entity: outerRing, speed: -16 }
      );

      return;
    }

    const platform = this._createCylinder(
      'CorePlatform',
      { x: base.x, y: 0.55, z: base.z },
      { x: 3.4, y: 1.1, z: 3.4 },
      this._createMaterial(theme.metalAccent, {
        specular: theme.neutralGlow,
        shininess: 60
      })
    );
    this.baseMarker = platform;

    const core = this._createSphere(
      'CoreReactor',
      { x: base.x, y: 2.2, z: base.z },
      { x: 1.25, y: 1.25, z: 1.25 },
      this._createMaterial(theme.coreColor, {
        emissive: theme.coreColor,
        specular: theme.neutralGlow,
        shininess: 120
      })
    );
    this._animatedPulses.push({
      entity: core,
      baseScale: core.getLocalScale().clone(),
      amplitude: 0.08,
      speed: 3.5,
      phase: 0.3
    });

    const innerRing = this._createTorus(
      'CoreInnerRing',
      { x: base.x, y: 1.4, z: base.z },
      { x: 3.8, y: 3.8, z: 0.22 },
      this._createMaterial(theme.coreColor, {
        emissive: { r: theme.coreColor.r * 0.55, g: theme.coreColor.g * 0.55, b: theme.coreColor.b * 0.55 },
        opacity: 0.55
      }),
      { x: 90, y: 0, z: 0 }
    );

    const outerRing = this._createTorus(
      'CoreOuterRing',
      { x: base.x, y: 2.15, z: base.z },
      { x: 5.2, y: 5.2, z: 0.16 },
      this._createMaterial(theme.neutralGlow, {
        emissive: { r: 0.34, g: 0.3, b: 0.18 },
        opacity: 0.4
      }),
      { x: 90, y: 0, z: 0 }
    );

    this._animatedRotators.push(
      { entity: innerRing, speed: 26 },
      { entity: outerRing, speed: -18 }
    );

    [0, 90, 180, 270].forEach((angle, index) => {
      const radians = angle * (Math.PI / 180);
      const pylon = this._createBox(
        `CorePylon_${index}`,
        {
          x: base.x + Math.cos(radians) * 2.4,
          y: 1.0,
          z: base.z + Math.sin(radians) * 2.4
        },
        { x: 0.42, y: 1.9, z: 0.42 },
        this._createMaterial(theme.metalAccent, {
          specular: theme.neutralGlow,
          shininess: 70
        })
      );

      const pylonTip = this._createSphere(
        `CorePylonTip_${index}`,
        {
          x: base.x + Math.cos(radians) * 2.4,
          y: 2.15,
          z: base.z + Math.sin(radians) * 2.4
        },
        { x: 0.24, y: 0.24, z: 0.24 },
        this._createMaterial(theme.coreColor, { emissive: theme.coreColor })
      );

      this._animatedPulses.push({
        entity: pylonTip,
        baseScale: pylonTip.getLocalScale().clone(),
        amplitude: 0.18,
        speed: 2.7,
        phase: index
      });

      pylon.setLocalEulerAngles(0, angle, 0);
    });
  }

  createSpawnMarker() {
    const theme = this.currentLevel.theme;
    const spawn = this.currentLevel.spawn;

    const portalAsset = this._instantiateAsset(
      'broken_halo_portal',
      'BreachPortalAsset',
      [spawn.x, 0, spawn.z]
    );
    if (portalAsset) {
      this.spawnMarker = portalAsset;

      const portalAura = this._createTorus(
        'BreachPortalAura',
        { x: spawn.x, y: 1.36, z: spawn.z },
        { x: 3.2, y: 3.2, z: 0.18 },
        this._createMaterial(theme.spawnColor, {
          emissive: { r: theme.spawnColor.r * 0.6, g: theme.spawnColor.g * 0.24, b: theme.spawnColor.b * 0.12 },
          opacity: 0.5
        }),
        { x: 0, y: 90, z: 0 }
      );
      this._animatedRotators.push({ entity: portalAura, speed: 28, axis: 'z' });
      return;
    }

    const pedestal = this._createCylinder(
      'BreachPortalBase',
      { x: spawn.x, y: 0.6, z: spawn.z },
      { x: 2.6, y: 1.1, z: 2.6 },
      this._createMaterial({ r: 0.16, g: 0.12, b: 0.14 }, {
        emissive: { r: 0.14, g: 0.05, b: 0.04 },
        shininess: 55
      })
    );
    this.spawnMarker = pedestal;

    const portal = this._createTorus(
      'BreachPortalRing',
      { x: spawn.x, y: 1.4, z: spawn.z },
      { x: 3.8, y: 3.8, z: 0.24 },
      this._createMaterial(theme.spawnColor, {
        emissive: { r: theme.spawnColor.r * 0.65, g: theme.spawnColor.g * 0.38, b: theme.spawnColor.b * 0.22 },
        opacity: 0.65
      }),
      { x: 0, y: 90, z: 0 }
    );

    const core = this._createSphere(
      'BreachPortalCore',
      { x: spawn.x, y: 1.3, z: spawn.z },
      { x: 0.9, y: 0.9, z: 0.9 },
      this._createMaterial(theme.spawnColor, {
        emissive: theme.spawnColor,
        opacity: 0.78
      })
    );

    this._animatedRotators.push({ entity: portal, speed: 34, axis: 'z' });
    this._animatedPulses.push({
      entity: core,
      baseScale: core.getLocalScale().clone(),
      amplitude: 0.1,
      speed: 4.2,
      phase: 0.9
    });
  }

  createPathVisualization() {
    const waypoints = this.currentLevel.waypoints;
    const pathStyle = this.currentLevel.pathStyle;
    const theme = this.currentLevel.theme;
    const pathMaterial = this._createMaterial(theme.pathColor, {
      emissive: { r: 0.1, g: 0.12, b: 0.16 },
      specular: theme.neutralGlow,
      shininess: 30
    });
    const edgeMaterial = this._createMaterial(theme.pathEdgeColor, {
      emissive: { r: theme.pathEdgeColor.r * 0.28, g: theme.pathEdgeColor.g * 0.28, b: theme.pathEdgeColor.b * 0.28 },
      opacity: 0.6
    });

    for (let i = 0; i < waypoints.length - 1; i++) {
      const start = waypoints[i];
      const end = waypoints[i + 1];
      const dx = end.x - start.x;
      const dz = end.z - start.z;
      const length = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dx, dz);

      const segment = this._createBox(
        `PathSegment_${i}`,
        {
          x: (start.x + end.x) / 2,
          y: pathStyle.height || 0.12,
          z: (start.z + end.z) / 2
        },
        { x: pathStyle.width, y: 0.18, z: length + pathStyle.width * 0.15 },
        pathMaterial,
        { x: 0, y: -angle * (180 / Math.PI), z: 0 }
      );
      this.pathMarkers.push(segment);

      const edgeOffset = pathStyle.width / 2 + 0.12;
      const edgeScale = { x: pathStyle.edgeWidth, y: 0.16, z: length + pathStyle.width * 0.18 };

      const leftEdge = this._createBox(
        `PathEdgeL_${i}`,
        {
          x: (start.x + end.x) / 2 - Math.cos(angle) * edgeOffset,
          y: 0.18,
          z: (start.z + end.z) / 2 + Math.sin(angle) * edgeOffset
        },
        edgeScale,
        edgeMaterial,
        { x: 0, y: -angle * (180 / Math.PI), z: 0 }
      );

      const rightEdge = this._createBox(
        `PathEdgeR_${i}`,
        {
          x: (start.x + end.x) / 2 + Math.cos(angle) * edgeOffset,
          y: 0.18,
          z: (start.z + end.z) / 2 - Math.sin(angle) * edgeOffset
        },
        edgeScale,
        edgeMaterial,
        { x: 0, y: -angle * (180 / Math.PI), z: 0 }
      );

      this.pathMarkers.push(leftEdge, rightEdge);
    }

    waypoints.forEach((waypoint, index) => {
      if (index === 0 || index === waypoints.length - 1) return;

      const marker = this._createCylinder(
        `Waypoint_${index}`,
        { x: waypoint.x, y: 0.22, z: waypoint.z },
        { x: pathStyle.waypointRadius, y: 0.18, z: pathStyle.waypointRadius },
        this._createMaterial(theme.neutralGlow, {
          emissive: { r: 0.28, g: 0.24, b: 0.16 },
          shininess: 80
        })
      );
      this.pathMarkers.push(marker);
    });
  }

  createBeacons() {
    const theme = this.currentLevel.theme;
    this.currentLevel.setPieces.beacons.forEach((beacon, index) => {
      const color =
        beacon.color === 'spawn'
          ? theme.spawnColor
          : beacon.color === 'core'
            ? theme.coreColor
            : theme.pathEdgeColor;

      const column = this._instantiateAsset(
        'broken_halo_beacon',
        beacon.name,
        [beacon.x, beacon.y - 0.9, beacon.z]
      ) || this._createBox(
        beacon.name,
        { x: beacon.x, y: beacon.y, z: beacon.z },
        { x: 0.26, y: 1.8, z: 0.26 },
        this._createMaterial(theme.metalAccent, {
          specular: theme.neutralGlow,
          shininess: 55
        })
      );

      const tip = this._createSphere(
        `${beacon.name}_Tip`,
        { x: beacon.x, y: beacon.y + 1.25, z: beacon.z },
        { x: 0.16, y: 0.16, z: 0.16 },
        this._createMaterial(color, { emissive: color })
      );

      const aura = this._createTorus(
        `${beacon.name}_Aura`,
        { x: beacon.x, y: beacon.y + 1.02, z: beacon.z },
        { x: 0.42, y: 0.42, z: 0.08 },
        this._createMaterial(color, {
          emissive: { r: color.r * 0.38, g: color.g * 0.38, b: color.b * 0.38 },
          opacity: 0.45
        }),
        { x: 90, y: 0, z: 0 }
      );

      this._animatedPulses.push({
        entity: tip,
        baseScale: tip.getLocalScale().clone(),
        amplitude: 0.16,
        speed: 3.0,
        phase: index * 0.45
      });
      this._animatedRotators.push({ entity: aura, speed: index % 2 === 0 ? 24 : -24 });

      column.setLocalEulerAngles(0, index * 20, 0);
    });
  }

  createBuildSlotMarkers() {
    const theme = this.currentLevel.theme;

    this.currentLevel.buildSlots.forEach((slot, index) => {
      const markerColor = this._getSlotColor(slot.role, theme);
      const slotY = slot.y ?? this.currentLevel.battlefield.padHeight;
      const marker = this._instantiateAsset(
        'broken_halo_pad',
        `BuildSlot_${slot.id}`,
        [slot.x, slotY, slot.z],
        slot.role === 'perch' ? [1.1, 1.1, 1.1] : [1, 1, 1]
      ) || this._createCylinder(
        `BuildSlot_${slot.id}`,
        { x: slot.x, y: slotY, z: slot.z },
        { x: 1.85, y: 0.34, z: 1.85 },
        this._createMaterial(theme.metalAccent, {
          specular: theme.neutralGlow,
          shininess: 55
        })
      );

      marker.slotId = slot.id;
      marker.slotData = slot;
      this.buildSlotMarkers.push(marker);
      this.buildSlotStates[slot.id] = { occupied: false, entity: marker };

      const ring = this._createTorus(
        `BuildSlotRing_${slot.id}`,
        { x: slot.x, y: (slot.y ?? this.currentLevel.battlefield.padHeight) + 0.07, z: slot.z },
        { x: 1.65, y: 1.65, z: 0.18 },
        this._createMaterial(markerColor, {
          emissive: { r: markerColor.r * 0.4, g: markerColor.g * 0.4, b: markerColor.b * 0.4 },
          opacity: 0.56
        }),
        { x: 90, y: 0, z: 0 }
      );

      const core = this._createSphere(
        `BuildSlotCore_${slot.id}`,
        { x: slot.x, y: (slot.y ?? this.currentLevel.battlefield.padHeight) + 0.25, z: slot.z },
        { x: 0.16, y: 0.16, z: 0.16 },
        this._createMaterial(markerColor, { emissive: markerColor })
      );

      this._animatedRotators.push({ entity: ring, speed: index % 2 === 0 ? 18 : -18 });
      this._animatedPulses.push({
        entity: core,
        baseScale: core.getLocalScale().clone(),
        amplitude: 0.2,
        speed: 3.1,
        phase: index * 0.6
      });

      if (slot.role === 'perch') {
        this._createBox(
          `PerchSupport_${slot.id}`,
          { x: slot.x, y: 0.42, z: slot.z },
          { x: 1.15, y: 0.8, z: 1.15 },
          this._createMaterial(theme.metalAccent, {
            specular: theme.neutralGlow,
            shininess: 45
          })
        );
      }
    });
  }

  getCamera() {
    return this.camera;
  }

  getSlotState(slotId) {
    return this.buildSlotStates[slotId] || null;
  }

  setSlotOccupied(slotId) {
    if (this.buildSlotStates[slotId]) {
      this.buildSlotStates[slotId].occupied = true;
    }
  }

  setSlotUnoccupied(slotId) {
    if (this.buildSlotStates[slotId]) {
      this.buildSlotStates[slotId].occupied = false;
    }
  }

  isSlotOccupied(slotId) {
    return this.buildSlotStates[slotId]?.occupied || false;
  }

  getBuildSlotMarkers() {
    return this.buildSlotMarkers;
  }

  _createBrokenGate() {
    const theme = this.currentLevel.theme;
    const debrisMaterial = this._createMaterial({ r: 0.22, g: 0.16, b: 0.14 }, {
      emissive: { r: 0.08, g: 0.04, b: 0.03 },
      shininess: 22
    });

    const fragments = [
      { x: -12.8, y: 0.4, z: 7.0, scale: { x: 1.8, y: 0.8, z: 0.9 }, rot: { x: 12, y: 34, z: 18 } },
      { x: -10.8, y: 0.25, z: 5.6, scale: { x: 1.2, y: 0.55, z: 0.9 }, rot: { x: 0, y: 10, z: -12 } },
      { x: -9.6, y: 0.22, z: 8.8, scale: { x: 1.4, y: 0.4, z: 0.7 }, rot: { x: 0, y: -20, z: 8 } }
    ];

    fragments.forEach((fragment, index) => {
      this._createBox(`BreachDebris_${index}`, fragment, fragment.scale, debrisMaterial, fragment.rot);
    });

    const fireGlow = this._createPlane(
      'BreachGlow',
      { x: -11.8, y: 0.06, z: 7.5 },
      { x: 4.8, y: 1, z: 3.8 },
      this._createMaterial(theme.spawnColor, {
        emissive: theme.spawnColor,
        opacity: 0.18
      })
    );
    fireGlow.setLocalEulerAngles(90, 0, 0);
    this._animatedPulses.push({
      entity: fireGlow,
      baseScale: fireGlow.getLocalScale().clone(),
      amplitude: 0.08,
      speed: 3.8,
      phase: 1.1
    });
  }

  _createPlateTrim(plate, theme) {
    this._createBox(
      `${plate.name}_Trim`,
      { x: plate.position.x, y: plate.position.y + plate.scale.y / 2 + 0.08, z: plate.position.z },
      { x: plate.scale.x * 0.96, y: 0.12, z: plate.scale.z * 0.96 },
      this._createMaterial(theme.metalAccent, {
        emissive: { r: 0.04, g: 0.06, b: 0.08 },
        shininess: 40
      })
    );
  }

  _getSlotColor(role, theme) {
    switch (role) {
      case 'forward':
        return theme.spawnColor;
      case 'panic':
        return theme.coreColor;
      case 'perch':
        return theme.neutralGlow;
      case 'crossfire':
      default:
        return theme.pathEdgeColor;
    }
  }

  _createPointLight(name, x, y, z, color, intensity, range) {
    const entity = new pc.Entity(name);
    entity.addComponent('light', {
      type: 'point',
      color: this._toColor(color),
      intensity,
      range
    });
    entity.setLocalPosition(x, y, z);
    this.sceneRoot.addChild(entity);
    return entity;
  }

  _instantiateAsset(assetName, entityName, position, scale = [1, 1, 1], rotation = [0, 0, 0]) {
    if (!this.assetLoader?.isLoaded?.()) {
      return null;
    }

    const renderEntity = this.assetLoader.createEntityFromModel(assetName);
    if (!renderEntity) {
      return null;
    }

    const wrapper = new pc.Entity(entityName);
    wrapper.setLocalPosition(position[0], position[1], position[2]);
    wrapper.setLocalScale(scale[0], scale[1], scale[2]);
    wrapper.setLocalEulerAngles(rotation[0], rotation[1], rotation[2]);
    renderEntity.setLocalPosition(0, 0, 0);
    renderEntity.setLocalScale(1, 1, 1);
    wrapper.addChild(renderEntity);
    this.sceneRoot.addChild(wrapper);
    return wrapper;
  }

  _createBox(name, position, scale, material, rotation = null) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'box' });
    entity.setLocalPosition(position.x, position.y, position.z);
    entity.setLocalScale(scale.x, scale.y, scale.z);
    if (rotation) {
      entity.setLocalEulerAngles(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }
    entity.render.material = material;
    this.sceneRoot.addChild(entity);
    return entity;
  }

  _createPlane(name, position, scale, material, rotation = null) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'plane' });
    entity.setLocalPosition(position.x, position.y, position.z);
    entity.setLocalScale(scale.x, scale.y, scale.z);
    if (rotation) {
      entity.setLocalEulerAngles(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }
    entity.render.material = material;
    this.sceneRoot.addChild(entity);
    return entity;
  }

  _createCylinder(name, position, scale, material) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'cylinder' });
    entity.setLocalPosition(position.x, position.y, position.z);
    entity.setLocalScale(scale.x, scale.y, scale.z);
    entity.render.material = material;
    this.sceneRoot.addChild(entity);
    return entity;
  }

  _createSphere(name, position, scale, material) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'sphere' });
    entity.setLocalPosition(position.x, position.y, position.z);
    entity.setLocalScale(scale.x, scale.y, scale.z);
    entity.render.material = material;
    this.sceneRoot.addChild(entity);
    return entity;
  }

  _createTorus(name, position, scale, material, rotation = null) {
    const entity = new pc.Entity(name);
    entity.addComponent('render', { type: 'torus' });
    entity.setLocalPosition(position.x, position.y, position.z);
    entity.setLocalScale(scale.x, scale.y, scale.z);
    if (rotation) {
      entity.setLocalEulerAngles(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }
    entity.render.material = material;
    this.sceneRoot.addChild(entity);
    return entity;
  }

  _createMaterial(diffuseColor, options = {}) {
    const material = new pc.StandardMaterial();
    material.diffuse = this._toColor(diffuseColor);
    material.specular = this._toColor(options.specular || { r: 0.18, g: 0.2, b: 0.22 });
    material.shininess = options.shininess ?? 20;

    if (options.emissive) {
      material.emissive = this._toColor(options.emissive);
    }

    if (options.opacity !== undefined) {
      material.opacity = options.opacity;
      material.blendType = pc.BLEND_NORMAL;
    }

    material.update();
    return material;
  }

  _toColor(color) {
    return new pc.Color(color.r, color.g, color.b, color.a ?? 1);
  }
}
