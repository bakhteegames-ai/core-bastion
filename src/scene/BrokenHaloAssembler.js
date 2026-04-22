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

function createPlate(sceneFactory, name, position, scale, material, trimMaterial, parentEntity) {
  sceneFactory._createBox(name, position, scale, material, parentEntity);
  sceneFactory._createBox(
    `${name}_Trim`,
    { x: position.x, y: position.y + scale.y / 2 + 0.05, z: position.z },
    { x: scale.x * 0.94, y: 0.1, z: scale.z * 0.94 },
    trimMaterial,
    parentEntity
  );
}

function createBeaconPylon(sceneFactory, name, position, materials, scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const pylon = sceneFactory._instantiateAsset(
    'broken_halo_beacon',
    name,
    [position.x, position.y, position.z],
    sceneFactory.sceneGroups.landmarks,
    scale,
    rotation
  );

  if (pylon) {
    return pylon;
  }

  sceneFactory._createBox(
    `${name}_Fallback`,
    { x: position.x, y: position.y + 0.9, z: position.z },
    { x: 0.48, y: 1.8, z: 0.48 },
    materials.barrier,
    sceneFactory.sceneGroups.landmarks
  );
  sceneFactory._createSphere(
    `${name}_FallbackCap`,
    { x: position.x, y: position.y + 2.1, z: position.z },
    { x: 0.22, y: 0.22, z: 0.22 },
    materials.emissive,
    sceneFactory.sceneGroups.landmarks
  );

  return null;
}

function createMaterials(sceneFactory, theme) {
  return {
    plate: sceneFactory._createMaterial(theme.metalColor, {
      specular: theme.metalAccent,
      shininess: 38
    }),
    trim: sceneFactory._createMaterial(theme.metalAccent, {
      emissive: { r: 0.05, g: 0.07, b: 0.1 },
      specular: theme.neutralGlow,
      shininess: 52
    }),
    support: sceneFactory._createMaterial(theme.groundColor, {
      specular: { r: 0.1, g: 0.12, b: 0.16 },
      shininess: 18
    }),
    barrier: sceneFactory._createMaterial(theme.metalAccent, {
      emissive: { r: 0.03, g: 0.05, b: 0.08 },
      specular: theme.neutralGlow,
      shininess: 60
    }),
    rail: sceneFactory._createMaterial(theme.pathEdgeColor, {
      emissive: {
        r: theme.pathEdgeColor.r * 0.34,
        g: theme.pathEdgeColor.g * 0.34,
        b: theme.pathEdgeColor.b * 0.34
      },
      opacity: 0.62
    }),
    spawnBarrier: sceneFactory._createMaterial({ r: 0.22, g: 0.12, b: 0.12 }, {
      emissive: {
        r: theme.spawnColor.r * 0.18,
        g: theme.spawnColor.g * 0.1,
        b: theme.spawnColor.b * 0.08
      },
      specular: theme.spawnColor,
      shininess: 58
    }),
    coreBarrier: sceneFactory._createMaterial({ r: 0.16, g: 0.21, b: 0.24 }, {
      emissive: {
        r: theme.coreColor.r * 0.16,
        g: theme.coreColor.g * 0.16,
        b: theme.coreColor.b * 0.16
      },
      specular: theme.coreColor,
      shininess: 68
    }),
    spawnGlow: sceneFactory._createMaterial(theme.spawnColor, {
      emissive: {
        r: theme.spawnColor.r * 0.48,
        g: theme.spawnColor.g * 0.18,
        b: theme.spawnColor.b * 0.12
      },
      opacity: 0.22
    }),
    coreGlow: sceneFactory._createMaterial(theme.coreColor, {
      emissive: {
        r: theme.coreColor.r * 0.4,
        g: theme.coreColor.g * 0.4,
        b: theme.coreColor.b * 0.4
      },
      opacity: 0.2
    }),
    emissive: sceneFactory._createMaterial(theme.neutralGlow, {
      emissive: theme.neutralGlow,
      shininess: 80
    })
  };
}

function buildBreachApron(sceneFactory, anchor, materials) {
  createPlate(
    sceneFactory,
    'BreachApronDeck',
    offsetPosition(anchor, { x: 0.2, y: -0.12, z: -0.1 }),
    { x: 8.2, y: 0.28, z: 5.8 },
    materials.plate,
    materials.trim,
    sceneFactory.sceneGroups.structural
  );

  [
    {
      name: 'BreachBackplate',
      position: offsetPosition(anchor, { x: -4.2, y: 2.3, z: 0.3 }),
      scale: { x: 0.9, y: 4.6, z: 6.2 }
    },
    {
      name: 'BreachFinNorth',
      position: offsetPosition(anchor, { x: -3.0, y: 2.0, z: 3.4 }),
      scale: { x: 0.9, y: 4.0, z: 1.7 }
    },
    {
      name: 'BreachFinSouth',
      position: offsetPosition(anchor, { x: -3.0, y: 2.0, z: -2.8 }),
      scale: { x: 0.9, y: 4.0, z: 1.7 }
    },
    {
      name: 'BreachFunnelNorth',
      position: offsetPosition(anchor, { x: 1.8, y: 0.85, z: 4.2 }),
      scale: { x: 2.6, y: 1.4, z: 0.8 },
      rotation: { x: 0, y: 14, z: 0 }
    },
    {
      name: 'BreachFunnelSouth',
      position: offsetPosition(anchor, { x: 1.8, y: 0.85, z: -4.1 }),
      scale: { x: 2.6, y: 1.4, z: 0.8 },
      rotation: { x: 0, y: -14, z: 0 }
    },
    {
      name: 'BreachButtressNorth',
      position: offsetPosition(anchor, { x: -1.6, y: 0.8, z: 4.1 }),
      scale: { x: 1.4, y: 1.6, z: 1.4 }
    },
    {
      name: 'BreachButtressSouth',
      position: offsetPosition(anchor, { x: -1.6, y: 0.8, z: -4.2 }),
      scale: { x: 1.4, y: 1.6, z: 1.4 }
    }
  ].forEach(({ name, position, scale, rotation }) => {
    sceneFactory._createBox(
      name,
      position,
      scale,
      materials.spawnBarrier,
      sceneFactory.sceneGroups.propsMedium,
      rotation || null
    );
  });

  createBeaconPylon(
    sceneFactory,
    'BreachPylonNorth',
    offsetPosition(anchor, { x: -1.6, y: 0.15, z: 3.1 }),
    { ...materials, emissive: materials.spawnGlow },
    [1.12, 1.12, 1.12],
    [0, 12, 0]
  );
  createBeaconPylon(
    sceneFactory,
    'BreachPylonSouth',
    offsetPosition(anchor, { x: -1.8, y: 0.15, z: -2.1 }),
    { ...materials, emissive: materials.spawnGlow },
    [1.12, 1.12, 1.12],
    [0, -12, 0]
  );

  const hazardPlate = sceneFactory._createPlane(
    'BreachHazardPlate',
    offsetPosition(anchor, { x: -1.1, y: 0.05, z: 0.4 }),
    { x: 4.6, y: 1, z: 3.6 },
    materials.spawnGlow,
    sceneFactory.sceneGroups.fx
  );
  hazardPlate.setLocalEulerAngles(90, 0, 0);
}

function buildCrossfireBridge(sceneFactory, anchor, materials) {
  createPlate(
    sceneFactory,
    'CrossfireBridgeDeck',
    offsetPosition(anchor, { x: 0, y: 0.18, z: 0 }),
    { x: 8.4, y: 0.24, z: 3.8 },
    materials.plate,
    materials.trim,
    sceneFactory.sceneGroups.structural
  );

  [
    {
      name: 'CrossfireNorthBulwark',
      position: offsetPosition(anchor, { x: 0, y: 1.05, z: 3.2 }),
      scale: { x: 7.6, y: 1.8, z: 0.7 },
      material: materials.barrier,
      parent: sceneFactory.sceneGroups.propsMedium
    },
    {
      name: 'CrossfireSouthBulwark',
      position: offsetPosition(anchor, { x: 0.1, y: 1.05, z: -3.2 }),
      scale: { x: 8.2, y: 1.8, z: 0.7 },
      material: materials.barrier,
      parent: sceneFactory.sceneGroups.propsMedium
    },
    {
      name: 'CrossfireGatehouseWest',
      position: offsetPosition(anchor, { x: -4.6, y: 1.4, z: 2.9 }),
      scale: { x: 1.2, y: 2.8, z: 1.4 },
      material: materials.barrier,
      parent: sceneFactory.sceneGroups.propsMedium
    },
    {
      name: 'CrossfireGatehouseEast',
      position: offsetPosition(anchor, { x: 4.2, y: 1.4, z: -2.7 }),
      scale: { x: 1.2, y: 2.8, z: 1.4 },
      material: materials.barrier,
      parent: sceneFactory.sceneGroups.propsMedium
    },
    {
      name: 'CrossfireSupportWest',
      position: offsetPosition(anchor, { x: -3.0, y: -0.55, z: 0.1 }),
      scale: { x: 1.2, y: 1.2, z: 4.6 },
      material: materials.support,
      parent: sceneFactory.sceneGroups.structural
    },
    {
      name: 'CrossfireSupportEast',
      position: offsetPosition(anchor, { x: 3.2, y: -0.6, z: 0.1 }),
      scale: { x: 1.2, y: 1.2, z: 4.6 },
      material: materials.support,
      parent: sceneFactory.sceneGroups.structural
    },
    {
      name: 'CrossfireRailNorth',
      position: offsetPosition(anchor, { x: 0, y: 0.7, z: 2.42 }),
      scale: { x: 7.4, y: 0.16, z: 0.18 },
      material: materials.rail,
      parent: sceneFactory.sceneGroups.propsSmall
    },
    {
      name: 'CrossfireRailSouth',
      position: offsetPosition(anchor, { x: 0.1, y: 0.7, z: -2.42 }),
      scale: { x: 7.8, y: 0.16, z: 0.18 },
      material: materials.rail,
      parent: sceneFactory.sceneGroups.propsSmall
    }
  ].forEach(({ name, position, scale, material, parent }) => {
    sceneFactory._createBox(name, position, scale, material, parent);
  });
}

function buildInnerRing(sceneFactory, anchor, materials) {
  sceneFactory._createCylinder(
    'InnerRingDeckPlate',
    offsetPosition(anchor, { x: 0, y: 0.12, z: 0 }),
    { x: 8.6, y: 0.16, z: 8.6 },
    materials.plate,
    sceneFactory.sceneGroups.structural
  );

  sceneFactory._createTorus(
    'InnerRingFortressHalo',
    offsetPosition(anchor, { x: 0, y: 0.28, z: 0 }),
    { x: 7.2, y: 7.2, z: 0.28 },
    materials.rail,
    sceneFactory.sceneGroups.propsSmall,
    { x: 90, y: 0, z: 0 }
  );

  [
    {
      name: 'InnerRingArcNorthEast',
      position: offsetPosition(anchor, { x: 2.9, y: 0.9, z: 2.7 }),
      scale: { x: 2.8, y: 1.3, z: 0.8 },
      rotation: { x: 0, y: 26, z: 0 }
    },
    {
      name: 'InnerRingArcEast',
      position: offsetPosition(anchor, { x: 3.7, y: 0.9, z: -0.1 }),
      scale: { x: 0.8, y: 1.3, z: 3.4 }
    },
    {
      name: 'InnerRingArcSouth',
      position: offsetPosition(anchor, { x: 0.2, y: 0.9, z: -3.3 }),
      scale: { x: 4.2, y: 1.3, z: 0.8 }
    },
    {
      name: 'InnerRingArcSouthWest',
      position: offsetPosition(anchor, { x: -2.9, y: 0.9, z: -2.1 }),
      scale: { x: 2.4, y: 1.2, z: 0.8 },
      rotation: { x: 0, y: -32, z: 0 }
    },
    {
      name: 'InnerRingCoverSouthWest',
      position: offsetPosition(anchor, { x: -1.4, y: 0.55, z: -2.8 }),
      scale: { x: 1.1, y: 0.7, z: 1.1 }
    },
    {
      name: 'InnerRingCoverSouthEast',
      position: offsetPosition(anchor, { x: 2.2, y: 0.55, z: -2.5 }),
      scale: { x: 1.1, y: 0.7, z: 1.1 }
    }
  ].forEach(({ name, position, scale, rotation }) => {
    sceneFactory._createBox(
      name,
      position,
      scale,
      materials.barrier,
      sceneFactory.sceneGroups.propsMedium,
      rotation || null
    );
  });
}

function buildCorePocket(sceneFactory, anchor, materials) {
  createPlate(
    sceneFactory,
    'CorePocketApron',
    offsetPosition(anchor, { x: -0.1, y: 0.22, z: -0.1 }),
    { x: 7.0, y: 0.28, z: 6.0 },
    materials.coreBarrier,
    materials.trim,
    sceneFactory.sceneGroups.structural
  );

  [
    {
      name: 'CorePocketNorthBarrier',
      position: offsetPosition(anchor, { x: 1.6, y: 1.05, z: 2.9 }),
      scale: { x: 2.4, y: 1.6, z: 0.8 }
    },
    {
      name: 'CorePocketEastBarrier',
      position: offsetPosition(anchor, { x: 2.4, y: 1.05, z: -0.1 }),
      scale: { x: 0.8, y: 1.6, z: 3.8 }
    },
    {
      name: 'CorePocketSouthBarrier',
      position: offsetPosition(anchor, { x: -0.4, y: 1.05, z: -3.1 }),
      scale: { x: 4.8, y: 1.6, z: 0.8 }
    },
    {
      name: 'CorePocketSouthWestBarrier',
      position: offsetPosition(anchor, { x: -3.1, y: 1.0, z: -2.2 }),
      scale: { x: 1.0, y: 1.4, z: 2.4 },
      rotation: { x: 0, y: -35, z: 0 }
    },
    {
      name: 'CorePocketBackWall',
      position: offsetPosition(anchor, { x: 3.1, y: 2.1, z: -0.1 }),
      scale: { x: 0.9, y: 4.2, z: 5.2 }
    }
  ].forEach(({ name, position, scale, rotation }) => {
    sceneFactory._createBox(
      name,
      position,
      scale,
      materials.coreBarrier,
      sceneFactory.sceneGroups.propsMedium,
      rotation || null
    );
  });

  createBeaconPylon(
    sceneFactory,
    'CorePocketSentinelA',
    offsetPosition(anchor, { x: -2.6, y: 0.15, z: -1.9 }),
    { ...materials, emissive: materials.coreGlow },
    [1.08, 1.08, 1.08],
    [0, -18, 0]
  );
  createBeaconPylon(
    sceneFactory,
    'CorePocketSentinelB',
    offsetPosition(anchor, { x: 1.8, y: 0.15, z: -1.6 }),
    { ...materials, emissive: materials.coreGlow },
    [1.08, 1.08, 1.08],
    [0, 18, 0]
  );

  const coreGlow = sceneFactory._createPlane(
    'CorePocketGlowPlate',
    offsetPosition(anchor, { x: -0.2, y: 0.05, z: -0.2 }),
    { x: 5.8, y: 1, z: 4.8 },
    materials.coreGlow,
    sceneFactory.sceneGroups.fx
  );
  coreGlow.setLocalEulerAngles(90, 0, 0);
}

function buildPerchPlatform(sceneFactory, materials) {
  const perchSlot = sceneFactory.currentLevel.buildSlots.find((slot) => slot.role === 'perch');
  if (!perchSlot) {
    return;
  }

  createPlate(
    sceneFactory,
    `PerchDeck_${perchSlot.id}`,
    { x: perchSlot.x, y: 0.8, z: perchSlot.z },
    { x: 3.4, y: 0.24, z: 2.8 },
    materials.barrier,
    materials.trim,
    sceneFactory.sceneGroups.buildSlots
  );

  sceneFactory._createBox(
    `PerchCauseway_${perchSlot.id}`,
    { x: perchSlot.x - 1.2, y: 0.58, z: perchSlot.z + 0.7 },
    { x: 1.6, y: 0.16, z: 1.7 },
    materials.plate,
    sceneFactory.sceneGroups.buildSlots,
    { x: 0, y: -18, z: 0 }
  );

  [
    {
      name: `PerchSupportA_${perchSlot.id}`,
      position: { x: perchSlot.x - 1.0, y: 0.22, z: perchSlot.z - 0.7 }
    },
    {
      name: `PerchSupportB_${perchSlot.id}`,
      position: { x: perchSlot.x + 0.9, y: 0.22, z: perchSlot.z + 0.6 }
    }
  ].forEach(({ name, position }) => {
    sceneFactory._createBox(
      name,
      position,
      { x: 0.6, y: 1.3, z: 0.6 },
      materials.support,
      sceneFactory.sceneGroups.propsMedium
    );
  });

  [
    {
      name: `PerchRailWest_${perchSlot.id}`,
      position: { x: perchSlot.x - 1.55, y: 1.08, z: perchSlot.z },
      scale: { x: 0.18, y: 0.22, z: 2.6 }
    },
    {
      name: `PerchRailSouth_${perchSlot.id}`,
      position: { x: perchSlot.x, y: 1.08, z: perchSlot.z - 1.3 },
      scale: { x: 2.6, y: 0.22, z: 0.18 }
    }
  ].forEach(({ name, position, scale }) => {
    sceneFactory._createBox(
      name,
      position,
      scale,
      materials.rail,
      sceneFactory.sceneGroups.propsSmall
    );
  });
}

export function createBrokenHaloVisualPass(sceneFactory) {
  if (sceneFactory.currentLevel?.id !== 'broken_halo') {
    return;
  }

  const materials = createMaterials(sceneFactory, sceneFactory.currentLevel.theme);
  const breachApron = getAnchorPosition(sceneFactory, 'BreachApron', { x: -11.8, y: 0, z: 7.5 });
  const crossfireBridge = getAnchorPosition(sceneFactory, 'CrossfireBridge', { x: 1.6, y: 0, z: 1.5 });
  const innerRing = getAnchorPosition(sceneFactory, 'InnerRing', { x: 9.5, y: 0, z: -4.5 });
  const corePocket = getAnchorPosition(sceneFactory, 'CorePocket', { x: 11, y: 0, z: -5 });

  buildBreachApron(sceneFactory, breachApron, materials);
  buildCrossfireBridge(sceneFactory, crossfireBridge, materials);
  buildInnerRing(sceneFactory, innerRing, materials);
  buildCorePocket(sceneFactory, corePocket, materials);
  buildPerchPlatform(sceneFactory, materials);
}
