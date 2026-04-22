function getAnchorPosition(sceneFactory, name, fallback) {
  const anchor = sceneFactory.zoneAnchors?.[name];
  if (!anchor) {
    return fallback;
  }

  const position = anchor.getPosition();
  return { x: position.x, y: position.y, z: position.z };
}

function midpoint(a, b) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2
  };
}

function yawBetween(a, b) {
  return -Math.atan2(b.x - a.x, b.z - a.z) * (180 / Math.PI);
}

function offsetAlongYaw(origin, yawDeg, forward = 0, side = 0, y = 0) {
  const yawRad = -yawDeg * (Math.PI / 180);
  const sin = Math.sin(yawRad);
  const cos = Math.cos(yawRad);

  return {
    x: origin.x + sin * forward + cos * side,
    y: origin.y + y,
    z: origin.z + cos * forward - sin * side
  };
}

function createMaterials(sceneFactory, theme) {
  return {
    routeStripe: sceneFactory._createMaterial(theme.pathEdgeColor, {
      emissive: {
        r: theme.pathEdgeColor.r * 0.6,
        g: theme.pathEdgeColor.g * 0.6,
        b: theme.pathEdgeColor.b * 0.6
      },
      opacity: 0.82
    }),
    routeNode: sceneFactory._createMaterial(theme.neutralGlow, {
      emissive: {
        r: theme.neutralGlow.r * 0.45,
        g: theme.neutralGlow.g * 0.45,
        b: theme.neutralGlow.b * 0.4
      },
      opacity: 0.78
    }),
    spawnCue: sceneFactory._createMaterial(theme.spawnColor, {
      emissive: {
        r: theme.spawnColor.r * 0.48,
        g: theme.spawnColor.g * 0.2,
        b: theme.spawnColor.b * 0.14
      },
      opacity: 0.26
    }),
    coreCue: sceneFactory._createMaterial(theme.coreColor, {
      emissive: {
        r: theme.coreColor.r * 0.44,
        g: theme.coreColor.g * 0.44,
        b: theme.coreColor.b * 0.44
      },
      opacity: 0.24
    }),
    dangerCue: sceneFactory._createMaterial({ r: 0.96, g: 0.58, b: 0.14 }, {
      emissive: { r: 0.46, g: 0.24, b: 0.08 },
      opacity: 0.78
    }),
    forward: sceneFactory._createMaterial(theme.spawnColor, {
      emissive: {
        r: theme.spawnColor.r * 0.65,
        g: theme.spawnColor.g * 0.28,
        b: theme.spawnColor.b * 0.16
      },
      opacity: 0.9
    }),
    crossfire: sceneFactory._createMaterial(theme.pathEdgeColor, {
      emissive: {
        r: theme.pathEdgeColor.r * 0.54,
        g: theme.pathEdgeColor.g * 0.54,
        b: theme.pathEdgeColor.b * 0.54
      },
      opacity: 0.88
    }),
    perch: sceneFactory._createMaterial(theme.neutralGlow, {
      emissive: {
        r: theme.neutralGlow.r * 0.42,
        g: theme.neutralGlow.g * 0.4,
        b: theme.neutralGlow.b * 0.34
      },
      opacity: 0.92
    }),
    panic: sceneFactory._createMaterial(theme.coreColor, {
      emissive: {
        r: theme.coreColor.r * 0.5,
        g: theme.coreColor.g * 0.5,
        b: theme.coreColor.b * 0.5
      },
      opacity: 0.9
    }),
    neutralDark: sceneFactory._createMaterial({ r: 0.05, g: 0.07, b: 0.1 }, {
      specular: theme.metalAccent,
      shininess: 12
    })
  };
}

function createGroundTorus(sceneFactory, name, position, radius, thickness, material) {
  return sceneFactory._createTorus(
    name,
    position,
    { x: radius, y: radius, z: thickness },
    material,
    sceneFactory.sceneGroups.fx,
    { x: 90, y: 0, z: 0 }
  );
}

function createFlatMark(sceneFactory, name, position, scale, material, parentEntity, rotation = null) {
  return sceneFactory._createBox(
    name,
    position,
    { x: scale.x, y: scale.y ?? 0.04, z: scale.z },
    material,
    parentEntity,
    rotation
  );
}

function createRouteReadability(sceneFactory, materials) {
  const waypoints = sceneFactory.currentLevel.waypoints;
  const pathStyle = sceneFactory.currentLevel.pathStyle;

  for (let i = 0; i < waypoints.length - 1; i++) {
    const start = { ...waypoints[i], y: pathStyle.height || 0.12 };
    const end = { ...waypoints[i + 1], y: pathStyle.height || 0.12 };
    const segmentMidpoint = midpoint(start, end);
    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const length = Math.sqrt(dx * dx + dz * dz);
    const yaw = yawBetween(start, end);

    createFlatMark(
      sceneFactory,
      `RouteCenterStripe_${i}`,
      { x: segmentMidpoint.x, y: 0.26, z: segmentMidpoint.z },
      { x: 0.2, y: 0.03, z: Math.max(length - 0.55, 0.8) },
      materials.routeStripe,
      sceneFactory.sceneGroups.fx,
      { x: 0, y: yaw, z: 0 }
    );

    const chevronCenter = offsetAlongYaw(segmentMidpoint, yaw, length * 0.16, 0, 0.28);
    createFlatMark(
      sceneFactory,
      `RouteChevronL_${i}`,
      offsetAlongYaw(chevronCenter, yaw, 0.16, -0.13, 0),
      { x: 0.12, y: 0.03, z: 0.42 },
      materials.routeNode,
      sceneFactory.sceneGroups.fx,
      { x: 0, y: yaw - 32, z: 0 }
    );
    createFlatMark(
      sceneFactory,
      `RouteChevronR_${i}`,
      offsetAlongYaw(chevronCenter, yaw, 0.16, 0.13, 0),
      { x: 0.12, y: 0.03, z: 0.42 },
      materials.routeNode,
      sceneFactory.sceneGroups.fx,
      { x: 0, y: yaw + 32, z: 0 }
    );
  }

  waypoints.forEach((waypoint, index) => {
    const routeNode = createGroundTorus(
      sceneFactory,
      `RouteNodeHalo_${index}`,
      { x: waypoint.x, y: index === waypoints.length - 1 ? 0.24 : 0.22, z: waypoint.z },
      index === 0 || index === waypoints.length - 1 ? 0.94 : 0.78,
      0.08,
      materials.routeNode
    );

    if (index !== 0 && index !== waypoints.length - 1) {
      sceneFactory._animatedRotators.push({
        entity: routeNode,
        speed: index % 2 === 0 ? 16 : -16
      });
    }
  });
}

function createSpawnCoreReadability(sceneFactory, materials) {
  const spawn = sceneFactory.currentLevel.spawn;
  const base = sceneFactory.currentLevel.base;

  const spawnRing = createGroundTorus(
    sceneFactory,
    'SpawnGroundRing',
    { x: spawn.x, y: 0.18, z: spawn.z },
    4.9,
    0.1,
    materials.spawnCue
  );
  sceneFactory._animatedRotators.push({ entity: spawnRing, speed: 18 });

  const spawnPlate = sceneFactory._createPlane(
    'SpawnSourcePlate',
    { x: spawn.x + 0.55, y: 0.05, z: spawn.z },
    { x: 4.8, y: 1, z: 3.6 },
    materials.spawnCue,
    sceneFactory.sceneGroups.fx
  );
  spawnPlate.setLocalEulerAngles(90, 0, 0);

  const coreRing = createGroundTorus(
    sceneFactory,
    'CoreGroundRing',
    { x: base.x, y: 0.2, z: base.z },
    6.1,
    0.1,
    materials.coreCue
  );
  sceneFactory._animatedRotators.push({ entity: coreRing, speed: -14 });

  const corePocket = getAnchorPosition(sceneFactory, 'CorePocket', { x: 11, y: 0, z: -5 });
  const warningBase = { x: corePocket.x - 1.85, y: 0.08, z: corePocket.z + 2.15 };
  for (let i = 0; i < 6; i++) {
    createFlatMark(
      sceneFactory,
      `FinalDefenseStripe_${i}`,
      { x: warningBase.x + i * 0.72, y: warningBase.y, z: warningBase.z - i * 0.18 },
      { x: 0.34, y: 0.03, z: 1.2 },
      i % 2 === 0 ? materials.dangerCue : materials.coreCue,
      sceneFactory.sceneGroups.fx,
      { x: 0, y: -24, z: 0 }
    );
  }
}

function createForwardMark(sceneFactory, slot, materials) {
  const spawn = { ...sceneFactory.currentLevel.spawn, y: slot.y };
  const slotPosition = { x: slot.x, y: slot.y, z: slot.z };
  const yaw = yawBetween(slotPosition, spawn);

  createFlatMark(
    sceneFactory,
    `ForwardStem_${slot.id}`,
    offsetAlongYaw(slotPosition, yaw, -0.1, 0, 0.15),
    { x: 0.14, y: 0.03, z: 0.72 },
    materials.forward,
    sceneFactory.sceneGroups.buildSlots,
    { x: 0, y: yaw, z: 0 }
  );
  createFlatMark(
    sceneFactory,
    `ForwardWingL_${slot.id}`,
    offsetAlongYaw(slotPosition, yaw, 0.34, -0.18, 0.15),
    { x: 0.12, y: 0.03, z: 0.44 },
    materials.forward,
    sceneFactory.sceneGroups.buildSlots,
    { x: 0, y: yaw - 34, z: 0 }
  );
  createFlatMark(
    sceneFactory,
    `ForwardWingR_${slot.id}`,
    offsetAlongYaw(slotPosition, yaw, 0.34, 0.18, 0.15),
    { x: 0.12, y: 0.03, z: 0.44 },
    materials.forward,
    sceneFactory.sceneGroups.buildSlots,
    { x: 0, y: yaw + 34, z: 0 }
  );
}

function createCrossfireMark(sceneFactory, slot, materials) {
  createFlatMark(
    sceneFactory,
    `CrossfireLong_${slot.id}`,
    { x: slot.x, y: slot.y + 0.15, z: slot.z },
    { x: 0.14, y: 0.03, z: 1.18 },
    materials.crossfire,
    sceneFactory.sceneGroups.buildSlots
  );
  createFlatMark(
    sceneFactory,
    `CrossfireWide_${slot.id}`,
    { x: slot.x, y: slot.y + 0.15, z: slot.z },
    { x: 1.18, y: 0.03, z: 0.14 },
    materials.crossfire,
    sceneFactory.sceneGroups.buildSlots
  );
}

function createPerchMark(sceneFactory, slot, materials) {
  const ring = createGroundTorus(
    sceneFactory,
    `PerchSpecialRing_${slot.id}`,
    { x: slot.x, y: slot.y + 0.22, z: slot.z },
    2.28,
    0.12,
    materials.perch
  );
  sceneFactory._animatedRotators.push({ entity: ring, speed: 24 });

  const signal = sceneFactory._createSphere(
    `PerchSignal_${slot.id}`,
    { x: slot.x, y: slot.y + 0.62, z: slot.z },
    { x: 0.2, y: 0.2, z: 0.2 },
    materials.perch,
    sceneFactory.sceneGroups.buildSlots
  );
  sceneFactory._animatedPulses.push({
    entity: signal,
    baseScale: signal.getLocalScale().clone(),
    amplitude: 0.18,
    speed: 3.2,
    phase: 0.8
  });
}

function createPanicMark(sceneFactory, slot, materials) {
  const base = { ...sceneFactory.currentLevel.base, y: slot.y };
  const slotPosition = { x: slot.x, y: slot.y, z: slot.z };
  const yaw = yawBetween(slotPosition, base);

  [-0.32, 0, 0.32].forEach((side, index) => {
    createFlatMark(
      sceneFactory,
      `PanicStripe_${slot.id}_${index}`,
      offsetAlongYaw(slotPosition, yaw, 0.08, side, 0.15),
      { x: 0.16, y: 0.03, z: 0.86 },
      index % 2 === 0 ? materials.dangerCue : materials.panic,
      sceneFactory.sceneGroups.buildSlots,
      { x: 0, y: yaw + 56, z: 0 }
    );
  });

  createFlatMark(
    sceneFactory,
    `PanicShield_${slot.id}`,
    offsetAlongYaw(slotPosition, yaw, 0.56, 0, 0.16),
    { x: 1.0, y: 0.03, z: 0.12 },
    materials.panic,
    sceneFactory.sceneGroups.buildSlots,
    { x: 0, y: yaw, z: 0 }
  );
}

function createSlotReadability(sceneFactory, materials) {
  sceneFactory.currentLevel.buildSlots.forEach((slot) => {
    const slotY = slot.y ?? sceneFactory.currentLevel.battlefield.padHeight;
    const roleMaterial =
      slot.role === 'forward'
        ? materials.forward
        : slot.role === 'perch'
          ? materials.perch
          : slot.role === 'panic'
            ? materials.panic
            : materials.crossfire;

    createGroundTorus(
      sceneFactory,
      `SlotHaloOuter_${slot.id}`,
      { x: slot.x, y: slotY + 0.12, z: slot.z },
      slot.role === 'perch' ? 2.15 : slot.role === 'panic' ? 2.05 : 1.95,
      0.08,
      roleMaterial
    );

    createFlatMark(
      sceneFactory,
      `SlotBasePlate_${slot.id}`,
      { x: slot.x, y: slotY + 0.05, z: slot.z },
      { x: 1.7, y: 0.025, z: 1.7 },
      materials.neutralDark,
      sceneFactory.sceneGroups.buildSlots
    );

    if (slot.role === 'forward') {
      createForwardMark(sceneFactory, { ...slot, y: slotY }, materials);
    } else if (slot.role === 'perch') {
      createPerchMark(sceneFactory, { ...slot, y: slotY }, materials);
    } else if (slot.role === 'panic') {
      createPanicMark(sceneFactory, { ...slot, y: slotY }, materials);
    } else {
      createCrossfireMark(sceneFactory, { ...slot, y: slotY }, materials);
    }
  });
}

export function createBrokenHaloReadabilityPass(sceneFactory) {
  if (sceneFactory.currentLevel?.id !== 'broken_halo') {
    return;
  }

  const materials = createMaterials(sceneFactory, sceneFactory.currentLevel.theme);
  createRouteReadability(sceneFactory, materials);
  createSpawnCoreReadability(sceneFactory, materials);
  createSlotReadability(sceneFactory, materials);
}
