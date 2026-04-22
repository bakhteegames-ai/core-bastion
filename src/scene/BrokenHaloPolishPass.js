function getAnchorPosition(sceneFactory, name, fallback) {
  const anchor = sceneFactory.zoneAnchors?.[name];
  if (!anchor) {
    return fallback;
  }

  const position = anchor.getPosition();
  return { x: position.x, y: position.y, z: position.z };
}

function offsetPosition(origin, offset) {
  return {
    x: origin.x + (offset.x || 0),
    y: origin.y + (offset.y || 0),
    z: origin.z + (offset.z || 0)
  };
}

function getPerchSlot(sceneFactory) {
  return sceneFactory.currentLevel.buildSlots.find((slot) => slot.role === 'perch') || null;
}

function createMaterials(sceneFactory, theme) {
  return {
    support: sceneFactory._createMaterial({ r: 0.09, g: 0.11, b: 0.14 }, {
      specular: { r: 0.18, g: 0.2, b: 0.24 },
      shininess: 18
    }),
    supportHeavy: sceneFactory._createMaterial({ r: 0.12, g: 0.15, b: 0.19 }, {
      specular: theme.metalAccent,
      shininess: 26
    }),
    crate: sceneFactory._createMaterial({ r: 0.16, g: 0.18, b: 0.22 }, {
      specular: theme.metalAccent,
      shininess: 22
    }),
    crateTrim: sceneFactory._createMaterial(theme.metalAccent, {
      emissive: { r: 0.03, g: 0.05, b: 0.07 },
      shininess: 38
    }),
    cable: sceneFactory._createMaterial({ r: 0.07, g: 0.09, b: 0.11 }, {
      emissive: { r: 0.02, g: 0.08, b: 0.1 },
      shininess: 14
    }),
    vent: sceneFactory._createMaterial({ r: 0.13, g: 0.15, b: 0.18 }, {
      specular: theme.metalAccent,
      shininess: 24
    }),
    ventGlow: sceneFactory._createMaterial(theme.trenchGlow, {
      emissive: {
        r: theme.trenchGlow.r * 0.42,
        g: theme.trenchGlow.g * 0.42,
        b: theme.trenchGlow.b * 0.42
      },
      opacity: 0.24
    }),
    wreck: sceneFactory._createMaterial({ r: 0.16, g: 0.12, b: 0.12 }, {
      emissive: { r: 0.05, g: 0.03, b: 0.03 },
      shininess: 16
    }),
    pylon: sceneFactory._createMaterial({ r: 0.14, g: 0.18, b: 0.21 }, {
      specular: theme.neutralGlow,
      shininess: 32
    }),
    defense: sceneFactory._createMaterial({ r: 0.14, g: 0.17, b: 0.2 }, {
      specular: theme.neutralGlow,
      shininess: 36
    }),
    spawnAccent: sceneFactory._createMaterial(theme.spawnColor, {
      emissive: {
        r: theme.spawnColor.r * 0.42,
        g: theme.spawnColor.g * 0.16,
        b: theme.spawnColor.b * 0.1
      },
      opacity: 0.42
    }),
    coreAccent: sceneFactory._createMaterial(theme.coreColor, {
      emissive: {
        r: theme.coreColor.r * 0.42,
        g: theme.coreColor.g * 0.42,
        b: theme.coreColor.b * 0.42
      },
      opacity: 0.42
    }),
    neutralAccent: sceneFactory._createMaterial(theme.pathEdgeColor, {
      emissive: {
        r: theme.pathEdgeColor.r * 0.38,
        g: theme.pathEdgeColor.g * 0.38,
        b: theme.pathEdgeColor.b * 0.38
      },
      opacity: 0.38
    }),
    sensor: sceneFactory._createMaterial(theme.neutralGlow, {
      emissive: theme.neutralGlow,
      shininess: 80
    })
  };
}

function createCrateStack(sceneFactory, name, position, materials, rotationY = 0) {
  sceneFactory._createBox(
    `${name}_Main`,
    { x: position.x, y: position.y + 0.32, z: position.z },
    { x: 1.02, y: 0.64, z: 0.8 },
    materials.crate,
    sceneFactory.sceneGroups.propsMedium,
    { x: 0, y: rotationY, z: 0 }
  );
  sceneFactory._createBox(
    `${name}_Side`,
    { x: position.x + 0.56, y: position.y + 0.21, z: position.z - 0.42 },
    { x: 0.7, y: 0.42, z: 0.64 },
    materials.crate,
    sceneFactory.sceneGroups.propsMedium,
    { x: 0, y: rotationY + 16, z: 0 }
  );
  sceneFactory._createBox(
    `${name}_Trim`,
    { x: position.x, y: position.y + 0.67, z: position.z },
    { x: 0.82, y: 0.08, z: 0.14 },
    materials.crateTrim,
    sceneFactory.sceneGroups.propsSmall,
    { x: 0, y: rotationY, z: 0 }
  );
}

function createCableBundle(sceneFactory, name, position, materials, rotationY = 0) {
  [-0.14, 0, 0.14].forEach((offset, index) => {
    sceneFactory._createBox(
      `${name}_Run_${index}`,
      { x: position.x + offset, y: position.y + 0.06, z: position.z },
      { x: 0.08, y: 0.08, z: 1.2 },
      materials.cable,
      sceneFactory.sceneGroups.propsSmall,
      { x: 0, y: rotationY, z: 0 }
    );
  });

  sceneFactory._createBox(
    `${name}_Junction`,
    { x: position.x - 0.34, y: position.y + 0.14, z: position.z + 0.32 },
    { x: 0.28, y: 0.18, z: 0.28 },
    materials.support,
    sceneFactory.sceneGroups.propsSmall
  );
}

function createVentCluster(sceneFactory, name, position, materials, rotationY = 0) {
  sceneFactory._createBox(
    `${name}_Base`,
    { x: position.x, y: position.y + 0.16, z: position.z },
    { x: 1.3, y: 0.32, z: 0.9 },
    materials.vent,
    sceneFactory.sceneGroups.propsMedium,
    { x: 0, y: rotationY, z: 0 }
  );

  [-0.28, 0, 0.28].forEach((offset, index) => {
    sceneFactory._createBox(
      `${name}_Stack_${index}`,
      { x: position.x + offset, y: position.y + 0.42, z: position.z - 0.06 },
      { x: 0.16, y: 0.32, z: 0.16 },
      materials.supportHeavy,
      sceneFactory.sceneGroups.propsSmall,
      { x: 0, y: rotationY, z: 0 }
    );
  });

  const glow = sceneFactory._createPlane(
    `${name}_Glow`,
    { x: position.x, y: position.y + 0.03, z: position.z },
    { x: 1.0, y: 1, z: 0.55 },
    materials.ventGlow,
    sceneFactory.sceneGroups.fx
  );
  glow.setLocalEulerAngles(90, rotationY, 0);
}

function createWreckCluster(sceneFactory, name, position, materials, rotationY = 0, accentMaterial = null) {
  sceneFactory._createBox(
    `${name}_SlabA`,
    { x: position.x - 0.22, y: position.y + 0.16, z: position.z + 0.12 },
    { x: 1.1, y: 0.26, z: 0.48 },
    materials.wreck,
    sceneFactory.sceneGroups.propsMedium,
    { x: 12, y: rotationY + 26, z: 8 }
  );
  sceneFactory._createBox(
    `${name}_SlabB`,
    { x: position.x + 0.42, y: position.y + 0.12, z: position.z - 0.22 },
    { x: 0.76, y: 0.18, z: 0.38 },
    materials.wreck,
    sceneFactory.sceneGroups.propsMedium,
    { x: -8, y: rotationY - 18, z: -12 }
  );
  sceneFactory._createBox(
    `${name}_Fragment`,
    { x: position.x + 0.58, y: position.y + 0.08, z: position.z + 0.42 },
    { x: 0.22, y: 0.16, z: 0.22 },
    materials.support,
    sceneFactory.sceneGroups.propsSmall
  );

  if (accentMaterial) {
    const plate = sceneFactory._createPlane(
      `${name}_Heat`,
      { x: position.x, y: position.y + 0.02, z: position.z },
      { x: 1.2, y: 1, z: 0.8 },
      accentMaterial,
      sceneFactory.sceneGroups.fx
    );
    plate.setLocalEulerAngles(90, rotationY + 18, 0);
  }
}

function createTechnicalPylon(sceneFactory, name, position, materials, accentMaterial, scale = [0.82, 0.82, 0.82], rotationY = 0) {
  const asset = sceneFactory._instantiateAsset(
    'broken_halo_beacon',
    name,
    [position.x, position.y, position.z],
    sceneFactory.sceneGroups.propsMedium,
    scale,
    [0, rotationY, 0]
  );

  if (!asset) {
    sceneFactory._createBox(
      `${name}_Fallback`,
      { x: position.x, y: position.y + 0.84, z: position.z },
      { x: 0.42, y: 1.68, z: 0.42 },
      materials.pylon,
      sceneFactory.sceneGroups.propsMedium
    );
  }

  sceneFactory._createBox(
    `${name}_Base`,
    { x: position.x, y: position.y + 0.16, z: position.z },
    { x: 0.94, y: 0.32, z: 0.94 },
    materials.supportHeavy,
    sceneFactory.sceneGroups.propsMedium,
    { x: 0, y: rotationY, z: 0 }
  );

  const tip = sceneFactory._createSphere(
    `${name}_Tip`,
    { x: position.x, y: position.y + 1.45, z: position.z },
    { x: 0.16, y: 0.16, z: 0.16 },
    accentMaterial,
    sceneFactory.sceneGroups.propsSmall
  );

  sceneFactory._animatedPulses.push({
    entity: tip,
    baseScale: tip.getLocalScale().clone(),
    amplitude: 0.12,
    speed: 2.4,
    phase: position.x * 0.12
  });
}

function createDefenseHardware(sceneFactory, name, position, materials, accentMaterial, rotationY = 0) {
  sceneFactory._createBox(
    `${name}_Base`,
    { x: position.x, y: position.y + 0.24, z: position.z },
    { x: 1.0, y: 0.48, z: 0.82 },
    materials.defense,
    sceneFactory.sceneGroups.propsMedium,
    { x: 0, y: rotationY, z: 0 }
  );
  sceneFactory._createBox(
    `${name}_Barrel`,
    { x: position.x, y: position.y + 0.5, z: position.z + 0.32 },
    { x: 0.22, y: 0.18, z: 0.92 },
    materials.supportHeavy,
    sceneFactory.sceneGroups.propsSmall,
    { x: 0, y: rotationY, z: 0 }
  );
  sceneFactory._createBox(
    `${name}_ShieldL`,
    { x: position.x - 0.32, y: position.y + 0.38, z: position.z + 0.06 },
    { x: 0.12, y: 0.42, z: 0.34 },
    materials.support,
    sceneFactory.sceneGroups.propsSmall,
    { x: 0, y: rotationY - 18, z: 0 }
  );
  sceneFactory._createBox(
    `${name}_ShieldR`,
    { x: position.x + 0.32, y: position.y + 0.38, z: position.z + 0.06 },
    { x: 0.12, y: 0.42, z: 0.34 },
    materials.support,
    sceneFactory.sceneGroups.propsSmall,
    { x: 0, y: rotationY + 18, z: 0 }
  );

  sceneFactory._createSphere(
    `${name}_Node`,
    { x: position.x, y: position.y + 0.68, z: position.z - 0.1 },
    { x: 0.1, y: 0.1, z: 0.1 },
    accentMaterial,
    sceneFactory.sceneGroups.propsSmall
  );
}

function createPerchSensor(sceneFactory, position, materials) {
  sceneFactory._createBox(
    'PerchSensorBase',
    { x: position.x, y: position.y + 0.2, z: position.z },
    { x: 0.42, y: 0.4, z: 0.42 },
    materials.supportHeavy,
    sceneFactory.sceneGroups.propsSmall
  );

  const orb = sceneFactory._createSphere(
    'PerchSensorOrb',
    { x: position.x, y: position.y + 0.58, z: position.z },
    { x: 0.14, y: 0.14, z: 0.14 },
    materials.sensor,
    sceneFactory.sceneGroups.propsSmall
  );

  sceneFactory._animatedPulses.push({
    entity: orb,
    baseScale: orb.getLocalScale().clone(),
    amplitude: 0.16,
    speed: 3.6,
    phase: 0.9
  });
}

function addAccentLight(sceneFactory, name, position, color, intensity, range, pulse = null) {
  const light = sceneFactory._createPointLight(
    name,
    position.x,
    position.y,
    position.z,
    color,
    intensity,
    range,
    sceneFactory.sceneGroups.lighting
  );

  if (pulse) {
    sceneFactory._pulsingLights.push({
      entity: light,
      baseIntensity: intensity,
      amplitude: pulse.amplitude,
      speed: pulse.speed,
      phase: pulse.phase ?? 0
    });
  }

  return light;
}

function addBrokenHaloLighting(sceneFactory) {
  const theme = sceneFactory.currentLevel.theme;
  const crossfire = getAnchorPosition(sceneFactory, 'CrossfireBridge', { x: 1.6, y: 0, z: 1.5 });
  const innerRing = getAnchorPosition(sceneFactory, 'InnerRing', { x: 9.5, y: 0, z: -4.5 });
  const perchSlot = getPerchSlot(sceneFactory);

  addAccentLight(
    sceneFactory,
    'PortalHostileLight',
    { x: sceneFactory.currentLevel.spawn.x + 0.8, y: 3.8, z: sceneFactory.currentLevel.spawn.z + 0.2 },
    { r: 1.0, g: 0.46, b: 0.26 },
    2.8,
    16,
    { amplitude: 0.45, speed: 3.2, phase: 0.35 }
  );

  addAccentLight(
    sceneFactory,
    'CoreHierarchyLight',
    { x: sceneFactory.currentLevel.base.x - 0.2, y: 4.3, z: sceneFactory.currentLevel.base.z + 0.2 },
    { r: 0.78, g: 1.0, b: 1.0 },
    3.3,
    18,
    { amplitude: 0.42, speed: 2.6, phase: 0.8 }
  );

  addAccentLight(
    sceneFactory,
    'NorthCoolFill',
    { x: -6.8, y: 8.2, z: 12.4 },
    { r: 0.22, g: 0.34, b: 0.42 },
    0.72,
    28
  );

  addAccentLight(
    sceneFactory,
    'SouthCoolFill',
    { x: 8.8, y: 7.5, z: -10.4 },
    { r: 0.18, g: 0.28, b: 0.38 },
    0.64,
    26
  );

  addAccentLight(
    sceneFactory,
    'BridgePathAccent',
    { x: crossfire.x + 0.8, y: 2.3, z: crossfire.z + 0.2 },
    theme.pathEdgeColor,
    0.95,
    10,
    { amplitude: 0.16, speed: 2.1, phase: 0.5 }
  );

  addAccentLight(
    sceneFactory,
    'InnerRingPathAccent',
    { x: innerRing.x - 1.2, y: 2.1, z: innerRing.z + 1.0 },
    theme.pathEdgeColor,
    0.78,
    9
  );

  if (perchSlot) {
    addAccentLight(
      sceneFactory,
      'PerchSlotAccent',
      { x: perchSlot.x + 0.2, y: 2.6, z: perchSlot.z - 0.1 },
      theme.neutralGlow,
      0.8,
      8,
      { amplitude: 0.14, speed: 2.8, phase: 1.1 }
    );
  }
}

function dressBreachApron(sceneFactory, anchor, materials) {
  createWreckCluster(
    sceneFactory,
    'BreachSalvageCluster',
    offsetPosition(anchor, { x: -2.7, y: 0.02, z: 2.9 }),
    materials,
    18,
    materials.spawnAccent
  );
  createVentCluster(
    sceneFactory,
    'BreachServiceVent',
    offsetPosition(anchor, { x: -2.5, y: 0, z: -3.2 }),
    materials,
    -6
  );
  createCrateStack(
    sceneFactory,
    'BreachSupplyCrates',
    offsetPosition(anchor, { x: 4.5, y: 0, z: 3.7 }),
    materials,
    12
  );
  createCableBundle(
    sceneFactory,
    'BreachCableBundle',
    offsetPosition(anchor, { x: 3.8, y: 0, z: 4.7 }),
    materials,
    14
  );
  createTechnicalPylon(
    sceneFactory,
    'BreachTechPylon',
    offsetPosition(anchor, { x: -2.9, y: 0.02, z: -0.5 }),
    materials,
    materials.spawnAccent,
    [0.76, 0.76, 0.76],
    12
  );
}

function dressCrossfireBridge(sceneFactory, anchor, materials) {
  createVentCluster(
    sceneFactory,
    'BridgeVentCluster',
    offsetPosition(anchor, { x: 4.4, y: 0.02, z: 3.8 }),
    materials,
    18
  );
  createCableBundle(
    sceneFactory,
    'BridgeCableBundle',
    offsetPosition(anchor, { x: 3.9, y: 0.02, z: 4.9 }),
    materials,
    12
  );
  createDefenseHardware(
    sceneFactory,
    'BridgeDefenseNode',
    offsetPosition(anchor, { x: 4.8, y: 0.02, z: -4.2 }),
    materials,
    materials.neutralAccent,
    168
  );
}

function dressInnerRing(sceneFactory, anchor, materials) {
  createCrateStack(
    sceneFactory,
    'InnerRingCrates',
    offsetPosition(anchor, { x: 3.2, y: 0, z: -4.0 }),
    materials,
    -22
  );
  createVentCluster(
    sceneFactory,
    'InnerRingVent',
    offsetPosition(anchor, { x: 3.8, y: 0, z: 1.0 }),
    materials,
    90
  );
  createCableBundle(
    sceneFactory,
    'InnerRingCableBundle',
    offsetPosition(anchor, { x: -2.5, y: 0, z: -5.0 }),
    materials,
    -72
  );
}

function dressCorePocket(sceneFactory, anchor, materials) {
  createDefenseHardware(
    sceneFactory,
    'CorePocketDefenseNode',
    offsetPosition(anchor, { x: 2.1, y: 0.02, z: 2.7 }),
    materials,
    materials.coreAccent,
    182
  );
  createVentCluster(
    sceneFactory,
    'CorePocketVent',
    offsetPosition(anchor, { x: 1.6, y: 0, z: 0.1 }),
    materials,
    90
  );
  createCableBundle(
    sceneFactory,
    'CorePocketCableBundle',
    offsetPosition(anchor, { x: -1.9, y: 0, z: -2.9 }),
    materials,
    -38
  );
  createTechnicalPylon(
    sceneFactory,
    'CorePocketTechPylon',
    offsetPosition(anchor, { x: 2.1, y: 0.02, z: -1.6 }),
    materials,
    materials.coreAccent,
    [0.78, 0.78, 0.78],
    16
  );
}

function dressPerchSupport(sceneFactory, materials) {
  const perchSlot = getPerchSlot(sceneFactory);
  if (!perchSlot) {
    return;
  }

  createPerchSensor(
    sceneFactory,
    { x: perchSlot.x + 1.5, y: perchSlot.y + 0.02, z: perchSlot.z - 1.05 },
    materials
  );
}

export function createBrokenHaloPolishPass(sceneFactory) {
  if (sceneFactory.currentLevel?.id !== 'broken_halo') {
    return;
  }

  const materials = createMaterials(sceneFactory, sceneFactory.currentLevel.theme);
  const breachApron = getAnchorPosition(sceneFactory, 'BreachApron', { x: -11.8, y: 0, z: 7.5 });
  const crossfireBridge = getAnchorPosition(sceneFactory, 'CrossfireBridge', { x: 1.6, y: 0, z: 1.5 });
  const innerRing = getAnchorPosition(sceneFactory, 'InnerRing', { x: 9.5, y: 0, z: -4.5 });
  const corePocket = getAnchorPosition(sceneFactory, 'CorePocket', { x: 11, y: 0, z: -5 });

  addBrokenHaloLighting(sceneFactory);
  dressBreachApron(sceneFactory, breachApron, materials);
  dressCrossfireBridge(sceneFactory, crossfireBridge, materials);
  dressInnerRing(sceneFactory, innerRing, materials);
  dressCorePocket(sceneFactory, corePocket, materials);
  dressPerchSupport(sceneFactory, materials);
}
