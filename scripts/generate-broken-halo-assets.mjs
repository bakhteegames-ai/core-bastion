import fs from 'node:fs/promises';
import path from 'node:path';
import { Document, NodeIO, Accessor } from '@gltf-transform/core';

const OUT_DIR = path.resolve(process.cwd(), 'public/assets/models');

const MATERIALS = {
  hull: {
    base: [0.16, 0.2, 0.25, 1],
    metallic: 0.78,
    roughness: 0.5
  },
  accent: {
    base: [0.25, 0.3, 0.38, 1],
    metallic: 0.82,
    roughness: 0.36
  },
  plate: {
    base: [0.31, 0.35, 0.41, 1],
    metallic: 0.75,
    roughness: 0.44
  },
  dark: {
    base: [0.05, 0.07, 0.1, 1],
    metallic: 0.3,
    roughness: 0.82
  },
  cyan: {
    base: [0.24, 0.86, 0.92, 1],
    metallic: 0.12,
    roughness: 0.18,
    emissive: [0.22, 0.8, 0.92]
  },
  cyanSoft: {
    base: [0.18, 0.52, 0.58, 1],
    metallic: 0.2,
    roughness: 0.3,
    emissive: [0.1, 0.36, 0.44]
  },
  orange: {
    base: [0.9, 0.38, 0.2, 1],
    metallic: 0.06,
    roughness: 0.35,
    emissive: [0.46, 0.16, 0.08]
  },
  warning: {
    base: [0.72, 0.56, 0.23, 1],
    metallic: 0.62,
    roughness: 0.4,
    emissive: [0.14, 0.11, 0.03]
  }
};

const DEG = Math.PI / 180;

function geometry() {
  return { positions: [], normals: [], indices: [] };
}

function append(target, source) {
  const offset = target.positions.length / 3;
  target.positions.push(...source.positions);
  target.normals.push(...source.normals);
  target.indices.push(...source.indices.map((index) => index + offset));
  return target;
}

function addFace(target, vertices, normal) {
  const offset = target.positions.length / 3;
  for (const vertex of vertices) {
    target.positions.push(vertex[0], vertex[1], vertex[2]);
    target.normals.push(normal[0], normal[1], normal[2]);
  }
  target.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);
}

function box(width, height, depth) {
  const hx = width / 2;
  const hy = height / 2;
  const hz = depth / 2;
  const result = geometry();

  addFace(result, [[-hx, -hy, hz], [hx, -hy, hz], [hx, hy, hz], [-hx, hy, hz]], [0, 0, 1]);
  addFace(result, [[hx, -hy, -hz], [-hx, -hy, -hz], [-hx, hy, -hz], [hx, hy, -hz]], [0, 0, -1]);
  addFace(result, [[-hx, -hy, -hz], [-hx, -hy, hz], [-hx, hy, hz], [-hx, hy, -hz]], [-1, 0, 0]);
  addFace(result, [[hx, -hy, hz], [hx, -hy, -hz], [hx, hy, -hz], [hx, hy, hz]], [1, 0, 0]);
  addFace(result, [[-hx, hy, hz], [hx, hy, hz], [hx, hy, -hz], [-hx, hy, -hz]], [0, 1, 0]);
  addFace(result, [[-hx, -hy, -hz], [hx, -hy, -hz], [hx, -hy, hz], [-hx, -hy, hz]], [0, -1, 0]);

  return result;
}

function cylinder(radius, height, segments = 16, capped = true) {
  const result = geometry();
  const half = height / 2;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    const x0 = Math.cos(a0) * radius;
    const z0 = Math.sin(a0) * radius;
    const x1 = Math.cos(a1) * radius;
    const z1 = Math.sin(a1) * radius;

    const nx0 = Math.cos(a0);
    const nz0 = Math.sin(a0);
    const nx1 = Math.cos(a1);
    const nz1 = Math.sin(a1);

    const offset = result.positions.length / 3;
    result.positions.push(
      x0, -half, z0,
      x1, -half, z1,
      x1, half, z1,
      x0, half, z0
    );
    result.normals.push(
      nx0, 0, nz0,
      nx1, 0, nz1,
      nx1, 0, nz1,
      nx0, 0, nz0
    );
    result.indices.push(offset, offset + 1, offset + 2, offset, offset + 2, offset + 3);

    if (capped) {
      const topOffset = result.positions.length / 3;
      result.positions.push(
        0, half, 0,
        x0, half, z0,
        x1, half, z1
      );
      result.normals.push(0, 1, 0, 0, 1, 0, 0, 1, 0);
      result.indices.push(topOffset, topOffset + 1, topOffset + 2);

      const bottomOffset = result.positions.length / 3;
      result.positions.push(
        0, -half, 0,
        x1, -half, z1,
        x0, -half, z0
      );
      result.normals.push(0, -1, 0, 0, -1, 0, 0, -1, 0);
      result.indices.push(bottomOffset, bottomOffset + 1, bottomOffset + 2);
    }
  }

  return result;
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function rotatePoint(vertex, rotation) {
  let [x, y, z] = vertex;
  const [rx, ry, rz] = rotation;

  if (rx) {
    const cy = Math.cos(rx);
    const sy = Math.sin(rx);
    const ny = y * cy - z * sy;
    const nz = y * sy + z * cy;
    y = ny;
    z = nz;
  }

  if (ry) {
    const cx = Math.cos(ry);
    const sx = Math.sin(ry);
    const nx = x * cx + z * sx;
    const nz = -x * sx + z * cx;
    x = nx;
    z = nz;
  }

  if (rz) {
    const cx = Math.cos(rz);
    const sx = Math.sin(rz);
    const nx = x * cx - y * sx;
    const ny = x * sx + y * cx;
    x = nx;
    y = ny;
  }

  return [x, y, z];
}

function transform(source, { translation = [0, 0, 0], rotation = [0, 0, 0] } = {}) {
  const result = geometry();
  result.indices.push(...source.indices);

  for (let i = 0; i < source.positions.length; i += 3) {
    const point = rotatePoint(
      [source.positions[i], source.positions[i + 1], source.positions[i + 2]],
      rotation
    );
    result.positions.push(
      point[0] + translation[0],
      point[1] + translation[1],
      point[2] + translation[2]
    );
  }

  for (let i = 0; i < source.normals.length; i += 3) {
    const normal = rotatePoint(
      [source.normals[i], source.normals[i + 1], source.normals[i + 2]],
      rotation
    );
    const normalized = normalize(normal);
    result.normals.push(normalized[0], normalized[1], normalized[2]);
  }

  return result;
}

function ringOfBoxes(target, {
  count,
  radius,
  width,
  height,
  depth,
  y = 0,
  angleOffset = 0
}) {
  for (let i = 0; i < count; i++) {
    const angle = angleOffset + (i / count) * Math.PI * 2;
    append(
      target,
      transform(box(width, height, depth), {
        translation: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
        rotation: [0, -angle, 0]
      })
    );
  }
}

function createDocument(name) {
  const document = new Document();
  document.createBuffer(`${name}_buffer`);
  return document;
}

function createMaterial(document, name, config) {
  const material = document.createMaterial(name)
    .setBaseColorFactor(config.base)
    .setMetallicFactor(config.metallic)
    .setRoughnessFactor(config.roughness);

  if (config.emissive) {
    material.setEmissiveFactor(config.emissive);
  }

  return material;
}

function addMeshNode(document, rootNode, meshName, sourceGeometry, material, translation = [0, 0, 0]) {
  const root = document.getRoot();
  const buffer = root.listBuffers()[0];
  const position = document.createAccessor(`${meshName}_positions`, buffer)
    .setType(Accessor.Type.VEC3)
    .setArray(new Float32Array(sourceGeometry.positions));
  const normal = document.createAccessor(`${meshName}_normals`, buffer)
    .setType(Accessor.Type.VEC3)
    .setArray(new Float32Array(sourceGeometry.normals));
  const indexArray = sourceGeometry.positions.length / 3 > 65535
    ? new Uint32Array(sourceGeometry.indices)
    : new Uint16Array(sourceGeometry.indices);
  const indices = document.createAccessor(`${meshName}_indices`, buffer)
    .setType(Accessor.Type.SCALAR)
    .setArray(indexArray);

  const primitive = document.createPrimitive()
    .setAttribute('POSITION', position)
    .setAttribute('NORMAL', normal)
    .setIndices(indices)
    .setMaterial(material);

  const mesh = document.createMesh(meshName).addPrimitive(primitive);
  const node = document.createNode(meshName).setMesh(mesh);
  node.setTranslation(translation);
  rootNode.addChild(node);
  return node;
}

function buildEnvironment(document) {
  const rootNode = document.createNode('BrokenHaloEnv');
  const scene = document.createScene('Scene');
  scene.addChild(rootNode);

  const hull = createMaterial(document, 'Hull', MATERIALS.hull);
  const accent = createMaterial(document, 'Accent', MATERIALS.accent);
  const plate = createMaterial(document, 'Plate', MATERIALS.plate);
  const dark = createMaterial(document, 'Dark', MATERIALS.dark);
  const cyan = createMaterial(document, 'Cyan', MATERIALS.cyan);
  const cyanSoft = createMaterial(document, 'CyanSoft', MATERIALS.cyanSoft);
  const orange = createMaterial(document, 'Orange', MATERIALS.orange);
  const warning = createMaterial(document, 'Warning', MATERIALS.warning);

  const deck = geometry();
  append(deck, transform(box(12.8, 0.8, 9.1), { translation: [-9.4, -0.45, 7.2] }));
  append(deck, transform(box(9.8, 0.55, 6.8), { translation: [1.1, -0.18, 1.7] }));
  append(deck, transform(box(11.3, 0.75, 9.4), { translation: [8.9, -0.35, -3.6] }));
  append(deck, transform(box(6.4, 0.22, 2.4), { translation: [-1.6, 0.24, 3.5] }));
  append(deck, transform(box(5.3, 0.22, 2.0), { translation: [3.8, 0.24, -1.2] }));
  addMeshNode(document, rootNode, 'Deck', deck, hull);

  const trims = geometry();
  append(trims, transform(box(12.2, 0.12, 8.5), { translation: [-9.4, 0.06, 7.2] }));
  append(trims, transform(box(9.2, 0.12, 6.2), { translation: [1.1, 0.14, 1.7] }));
  append(trims, transform(box(10.7, 0.12, 8.8), { translation: [8.9, 0.08, -3.6] }));
  addMeshNode(document, rootNode, 'DeckTrim', trims, plate);

  const walls = geometry();
  append(walls, transform(box(1.0, 3.2, 4.8), { translation: [-15.1, 1.6, 10.9] }));
  append(walls, transform(box(1.0, 3.2, 8.7), { translation: [-15.1, 1.6, 2.3] }));
  append(walls, transform(box(12.4, 3.1, 1.0), { translation: [-8.4, 1.55, 12.6] }));
  append(walls, transform(box(24.0, 2.8, 0.95), { translation: [2.3, 1.42, -11.55] }));
  append(walls, transform(box(0.95, 3.1, 10.5), { translation: [13.95, 1.55, -4.0] }));
  append(walls, transform(box(2.4, 3.0, 0.85), { translation: [-2.5, 1.52, 6.15] }));
  append(walls, transform(box(2.4, 3.0, 0.85), { translation: [6.5, 1.52, -3.85] }));
  addMeshNode(document, rootNode, 'Walls', walls, accent);

  const buttresses = geometry();
  for (const position of [
    [-12.2, 0.9, 12.0],
    [-5.7, 0.9, 12.0],
    [7.8, 0.9, 5.8],
    [12.8, 0.9, -7.2],
    [7.0, 0.9, -10.8]
  ]) {
    append(buttresses, transform(box(1.4, 1.8, 1.4), { translation: position }));
    append(buttresses, transform(box(0.8, 3.4, 0.8), { translation: [position[0], 2.4, position[2]] }));
  }
  addMeshNode(document, rootNode, 'Buttresses', buttresses, plate);

  const trenchBase = geometry();
  append(trenchBase, transform(box(10.5, 2.9, 3.3), { translation: [0.6, -1.55, 4.8] }));
  append(trenchBase, transform(box(7.4, 3.1, 4.8), { translation: [4.7, -1.6, -1.0] }));
  addMeshNode(document, rootNode, 'TrenchBase', trenchBase, dark);

  const trenchGlow = geometry();
  append(trenchGlow, transform(box(9.3, 0.08, 1.5), { translation: [0.6, -0.22, 4.8] }));
  append(trenchGlow, transform(box(5.8, 0.08, 2.1), { translation: [4.7, -0.28, -1.0] }));
  append(trenchGlow, transform(box(1.8, 0.08, 2.0), { translation: [-0.5, -0.22, 0.2] }));
  addMeshNode(document, rootNode, 'TrenchGlow', trenchGlow, cyanSoft);

  const bridge = geometry();
  append(bridge, transform(box(7.5, 0.28, 2.5), { translation: [1.2, 0.4, 1.2] }));
  append(bridge, transform(box(7.2, 0.2, 0.18), { translation: [1.1, 0.92, 3.0] }));
  append(bridge, transform(box(7.4, 0.2, 0.18), { translation: [2.0, 0.92, -0.8] }));
  append(bridge, transform(box(0.2, 1.2, 5.1), { translation: [-1.0, 0.75, 1.1] }));
  append(bridge, transform(box(0.2, 1.2, 5.1), { translation: [3.5, 0.75, 1.1] }));
  addMeshNode(document, rootNode, 'Bridge', bridge, plate);

  const bridgeBraces = geometry();
  append(bridgeBraces, transform(box(0.22, 2.2, 0.22), { translation: [-0.9, -0.36, 1.1], rotation: [0, 0, 22 * DEG] }));
  append(bridgeBraces, transform(box(0.22, 2.2, 0.22), { translation: [3.4, -0.36, 1.1], rotation: [0, 0, -22 * DEG] }));
  append(bridgeBraces, transform(box(3.8, 0.14, 0.18), { translation: [1.2, -0.9, 1.1], rotation: [0, 0, 0] }));
  append(bridgeBraces, transform(box(0.18, 1.8, 0.18), { translation: [1.2, -0.55, 3.0], rotation: [0, 25 * DEG, -16 * DEG] }));
  append(bridgeBraces, transform(box(0.18, 1.8, 0.18), { translation: [1.95, -0.55, -0.8], rotation: [0, -22 * DEG, 16 * DEG] }));
  addMeshNode(document, rootNode, 'BridgeBraces', bridgeBraces, accent);

  const conduits = geometry();
  append(conduits, transform(cylinder(0.18, 8.5, 10), { translation: [-8.8, 0.42, 11.1], rotation: [0, 0, 90 * DEG] }));
  append(conduits, transform(cylinder(0.18, 7.0, 10), { translation: [-1.8, 0.32, 5.3], rotation: [0, 45 * DEG, 90 * DEG] }));
  append(conduits, transform(cylinder(0.18, 5.8, 10), { translation: [8.4, 0.38, -8.3], rotation: [0, 0, 90 * DEG] }));
  addMeshNode(document, rootNode, 'Conduits', conduits, warning);

  const innerHalo = geometry();
  ringOfBoxes(innerHalo, {
    count: 20,
    radius: 2.9,
    width: 1.1,
    height: 0.26,
    depth: 1.9,
    y: 0.22,
    angleOffset: 8 * DEG
  });
  addMeshNode(document, rootNode, 'InnerHalo', innerHalo, accent, [9.45, 0, -4.55]);

  const breachDebris = geometry();
  append(breachDebris, transform(box(2.2, 0.7, 1.0), { translation: [-12.6, 0.32, 7.0], rotation: [14 * DEG, 38 * DEG, 17 * DEG] }));
  append(breachDebris, transform(box(1.4, 0.45, 1.0), { translation: [-10.6, 0.22, 5.6], rotation: [0, 14 * DEG, -11 * DEG] }));
  append(breachDebris, transform(box(1.7, 0.34, 0.9), { translation: [-9.2, 0.18, 8.8], rotation: [0, -18 * DEG, 10 * DEG] }));
  append(breachDebris, transform(box(2.4, 0.18, 0.26), { translation: [-11.8, 0.1, 8.6], rotation: [0, 30 * DEG, 0] }));
  addMeshNode(document, rootNode, 'BreachDebris', breachDebris, orange);

  const breachFrame = geometry();
  append(breachFrame, transform(box(0.75, 4.2, 1.1), { translation: [-13.9, 2.1, 5.25], rotation: [0, 0, 3 * DEG] }));
  append(breachFrame, transform(box(0.6, 3.8, 1.0), { translation: [-13.2, 1.8, 9.75], rotation: [0, 0, -7 * DEG] }));
  append(breachFrame, transform(box(3.4, 0.45, 1.0), { translation: [-13.0, 4.15, 7.4], rotation: [0, 0, -5 * DEG] }));
  append(breachFrame, transform(box(1.6, 0.24, 0.24), { translation: [-12.5, 2.65, 5.2], rotation: [0, 22 * DEG, 18 * DEG] }));
  append(breachFrame, transform(box(1.9, 0.24, 0.24), { translation: [-11.8, 3.1, 9.4], rotation: [0, -25 * DEG, -14 * DEG] }));
  addMeshNode(document, rootNode, 'BreachFrame', breachFrame, hull);

  const catwalks = geometry();
  append(catwalks, transform(box(8.2, 0.14, 1.2), { translation: [-10.2, 0.34, 10.9] }));
  append(catwalks, transform(box(4.2, 0.14, 1.0), { translation: [-4.0, 0.34, 8.6] }));
  append(catwalks, transform(box(4.8, 0.14, 1.0), { translation: [7.1, 0.42, -7.4] }));
  append(catwalks, transform(box(0.14, 0.52, 8.0), { translation: [-6.2, 0.68, 10.9] }));
  append(catwalks, transform(box(0.14, 0.52, 5.0), { translation: [4.8, 0.76, -7.4] }));
  append(catwalks, transform(box(8.2, 0.52, 0.14), { translation: [-10.2, 0.68, 11.45] }));
  append(catwalks, transform(box(4.8, 0.52, 0.14), { translation: [7.1, 0.76, -6.9] }));
  addMeshNode(document, rootNode, 'Catwalks', catwalks, plate);

  const sanctumRibs = geometry();
  ringOfBoxes(sanctumRibs, {
    count: 6,
    radius: 4.05,
    width: 0.34,
    height: 2.6,
    depth: 0.5,
    y: 1.38,
    angleOffset: 18 * DEG
  });
  append(sanctumRibs, transform(box(0.24, 1.8, 4.2), { translation: [9.45, 1.4, -4.55], rotation: [0, 45 * DEG, 0] }));
  append(sanctumRibs, transform(box(0.24, 1.8, 4.2), { translation: [9.45, 1.4, -4.55], rotation: [0, -45 * DEG, 0] }));
  addMeshNode(document, rootNode, 'SanctumRibs', sanctumRibs, accent);

  const skyline = geometry();
  for (const fin of [
    [-14.8, 3.2, 12.4, 0.7, 6.2, 1.0, 12],
    [-6.2, 2.9, 12.7, 0.6, 5.4, 0.9, -8],
    [8.4, 2.7, 6.7, 0.65, 5.0, 0.9, 10],
    [13.2, 3.0, -7.8, 0.75, 5.8, 1.0, -10],
    [6.9, 2.6, -11.1, 0.65, 4.8, 0.9, 8]
  ]) {
    append(skyline, transform(box(fin[3], fin[4], fin[5]), {
      translation: [fin[0], fin[1], fin[2]],
      rotation: [0, fin[6] * DEG, 0]
    }));
  }
  addMeshNode(document, rootNode, 'SkylineFins', skyline, accent);

  const battlefieldProps = geometry();
  append(battlefieldProps, transform(box(1.2, 0.7, 0.8), { translation: [-6.3, 0.3, 6.4], rotation: [0, 22 * DEG, 0] }));
  append(battlefieldProps, transform(box(0.9, 0.5, 0.9), { translation: [-4.9, 0.22, 5.7], rotation: [0, -12 * DEG, 0] }));
  append(battlefieldProps, transform(box(1.1, 0.6, 0.7), { translation: [6.5, 0.3, -2.2], rotation: [0, -20 * DEG, 0] }));
  append(battlefieldProps, transform(box(0.24, 1.4, 0.24), { translation: [11.8, 0.72, -8.4] }));
  append(battlefieldProps, transform(box(0.24, 1.4, 0.24), { translation: [4.6, 0.72, -10.1] }));
  addMeshNode(document, rootNode, 'BattlefieldProps', battlefieldProps, hull);

  const accentLines = geometry();
  append(accentLines, transform(box(10.1, 0.06, 0.16), { translation: [-9.2, 0.14, 11.2] }));
  append(accentLines, transform(box(5.8, 0.06, 0.16), { translation: [0.4, 0.24, 4.55] }));
  append(accentLines, transform(box(5.2, 0.06, 0.16), { translation: [3.3, 0.24, -2.1] }));
  append(accentLines, transform(box(3.4, 0.06, 0.16), { translation: [9.2, 0.28, -7.0], rotation: [0, 90 * DEG, 0] }));
  append(accentLines, transform(box(2.8, 0.06, 0.16), { translation: [-10.6, 0.22, 7.9], rotation: [0, 35 * DEG, 0] }));
  append(accentLines, transform(box(2.4, 0.06, 0.16), { translation: [7.2, 0.26, -4.2], rotation: [0, 25 * DEG, 0] }));
  addMeshNode(document, rootNode, 'AccentLines', accentLines, cyan);

  return document;
}

function buildReactor(document) {
  const rootNode = document.createNode('BrokenHaloReactor');
  const scene = document.createScene('Scene');
  scene.addChild(rootNode);

  const hull = createMaterial(document, 'Hull', MATERIALS.hull);
  const accent = createMaterial(document, 'Accent', MATERIALS.accent);
  const cyan = createMaterial(document, 'Cyan', MATERIALS.cyan);
  const warning = createMaterial(document, 'Warning', MATERIALS.warning);

  const base = geometry();
  append(base, transform(cylinder(1.18, 0.52, 18), { translation: [0, 0.26, 0] }));
  append(base, transform(cylinder(0.78, 1.8, 18), { translation: [0, 1.45, 0] }));
  append(base, transform(cylinder(0.52, 0.32, 18), { translation: [0, 2.55, 0] }));
  addMeshNode(document, rootNode, 'ReactorCore', base, hull);

  const chamber = geometry();
  append(chamber, transform(cylinder(0.55, 1.26, 18), { translation: [0, 1.45, 0] }));
  addMeshNode(document, rootNode, 'ReactorChamber', chamber, cyan);

  const cage = geometry();
  ringOfBoxes(cage, {
    count: 12,
    radius: 0.98,
    width: 0.18,
    height: 0.18,
    depth: 0.7,
    y: 0.95
  });
  ringOfBoxes(cage, {
    count: 12,
    radius: 1.08,
    width: 0.14,
    height: 0.14,
    depth: 0.56,
    y: 1.95,
    angleOffset: 12 * DEG
  });
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    append(cage, transform(box(0.22, 1.9, 0.22), {
      translation: [Math.cos(angle) * 1.05, 1.45, Math.sin(angle) * 1.05]
    }));
  }
  addMeshNode(document, rootNode, 'ReactorCage', cage, accent);

  const pylons = geometry();
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + Math.PI / 4;
    append(pylons, transform(box(0.44, 1.8, 0.44), {
      translation: [Math.cos(angle) * 1.85, 0.9, Math.sin(angle) * 1.85]
    }));
    append(pylons, transform(box(0.18, 1.4, 0.8), {
      translation: [Math.cos(angle) * 1.2, 1.25, Math.sin(angle) * 1.2],
      rotation: [0, -angle, 0]
    }));
  }
  addMeshNode(document, rootNode, 'ReactorPylons', pylons, hull);

  const signal = geometry();
  ringOfBoxes(signal, {
    count: 10,
    radius: 1.45,
    width: 0.34,
    height: 0.08,
    depth: 0.3,
    y: 0.75,
    angleOffset: 10 * DEG
  });
  ringOfBoxes(signal, {
    count: 14,
    radius: 2.1,
    width: 0.26,
    height: 0.06,
    depth: 0.24,
    y: 2.08
  });
  addMeshNode(document, rootNode, 'ReactorSignals', signal, warning);

  const spire = geometry();
  append(spire, transform(box(0.24, 0.9, 0.24), { translation: [0, 3.1, 0] }));
  append(spire, transform(box(0.7, 0.14, 0.14), { translation: [0, 2.85, 0], rotation: [0, 45 * DEG, 0] }));
  append(spire, transform(box(0.7, 0.14, 0.14), { translation: [0, 2.85, 0], rotation: [0, -45 * DEG, 0] }));
  addMeshNode(document, rootNode, 'ReactorSpire', spire, warning);

  const vanes = geometry();
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    append(vanes, transform(box(0.14, 1.35, 1.2), {
      translation: [Math.cos(angle) * 1.42, 1.55, Math.sin(angle) * 1.42],
      rotation: [0, -angle, 18 * DEG]
    }));
  }
  addMeshNode(document, rootNode, 'ReactorVanes', vanes, accent);

  return document;
}

function buildPad(document) {
  const rootNode = document.createNode('BrokenHaloPad');
  const scene = document.createScene('Scene');
  scene.addChild(rootNode);

  const hull = createMaterial(document, 'Hull', MATERIALS.hull);
  const accent = createMaterial(document, 'Accent', MATERIALS.accent);
  const cyan = createMaterial(document, 'Cyan', MATERIALS.cyan);

  const base = geometry();
  append(base, cylinder(0.88, 0.28, 8));
  append(base, transform(cylinder(0.62, 0.12, 12), { translation: [0, 0.18, 0] }));
  addMeshNode(document, rootNode, 'PadBase', base, hull);

  const struts = geometry();
  ringOfBoxes(struts, {
    count: 8,
    radius: 0.76,
    width: 0.18,
    height: 0.2,
    depth: 0.42,
    y: 0.18,
    angleOffset: 22.5 * DEG
  });
  addMeshNode(document, rootNode, 'PadStruts', struts, accent);

  const emitters = geometry();
  append(emitters, transform(cylinder(0.12, 0.18, 10), { translation: [0, 0.3, 0] }));
  ringOfBoxes(emitters, {
    count: 6,
    radius: 0.48,
    width: 0.1,
    height: 0.04,
    depth: 0.22,
    y: 0.26
  });
  addMeshNode(document, rootNode, 'PadEmitters', emitters, cyan);

  const fins = geometry();
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2;
    append(fins, transform(box(0.12, 0.28, 0.48), {
      translation: [Math.cos(angle) * 0.58, 0.08, Math.sin(angle) * 0.58],
      rotation: [0, -angle, 0]
    }));
  }
  addMeshNode(document, rootNode, 'PadFins', fins, accent);

  return document;
}

function buildBeacon(document) {
  const rootNode = document.createNode('BrokenHaloBeacon');
  const scene = document.createScene('Scene');
  scene.addChild(rootNode);

  const accent = createMaterial(document, 'Accent', MATERIALS.accent);
  const cyan = createMaterial(document, 'Cyan', MATERIALS.cyan);
  const orange = createMaterial(document, 'Orange', MATERIALS.orange);

  const body = geometry();
  append(body, transform(box(0.28, 1.8, 0.28), { translation: [0, 0.9, 0] }));
  append(body, transform(box(0.48, 0.2, 0.48), { translation: [0, 0.12, 0] }));
  addMeshNode(document, rootNode, 'BeaconBody', body, accent);

  const tip = geometry();
  append(tip, transform(cylinder(0.12, 0.18, 10), { translation: [0, 1.92, 0] }));
  append(tip, transform(cylinder(0.06, 0.22, 10), { translation: [0, 2.12, 0] }));
  addMeshNode(document, rootNode, 'BeaconTip', tip, cyan);

  const warningLines = geometry();
  append(warningLines, transform(box(0.08, 0.02, 0.36), { translation: [0, 1.18, 0] }));
  append(warningLines, transform(box(0.36, 0.02, 0.08), { translation: [0, 1.18, 0] }));
  addMeshNode(document, rootNode, 'BeaconWarning', warningLines, orange);

  return document;
}

function buildPortal(document) {
  const rootNode = document.createNode('BrokenHaloPortal');
  const scene = document.createScene('Scene');
  scene.addChild(rootNode);

  const hull = createMaterial(document, 'Hull', MATERIALS.hull);
  const orange = createMaterial(document, 'Orange', MATERIALS.orange);
  const warning = createMaterial(document, 'Warning', MATERIALS.warning);

  const base = geometry();
  append(base, transform(cylinder(1.04, 0.42, 14), { translation: [0, 0.21, 0] }));
  append(base, transform(cylinder(0.56, 0.24, 12), { translation: [0, 0.54, 0] }));
  addMeshNode(document, rootNode, 'PortalBase', base, hull);

  const ring = geometry();
  ringOfBoxes(ring, {
    count: 14,
    radius: 1.25,
    width: 0.18,
    height: 0.26,
    depth: 0.42,
    y: 1.42
  });
  append(ring, transform(cylinder(0.62, 0.22, 14), { translation: [0, 1.38, 0] }));
  addMeshNode(document, rootNode, 'PortalRing', ring, orange);

  const spikes = geometry();
  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + Math.PI / 4;
    append(spikes, transform(box(0.18, 0.85, 0.18), {
      translation: [Math.cos(angle) * 0.96, 0.65, Math.sin(angle) * 0.96]
    }));
  }
  addMeshNode(document, rootNode, 'PortalSpikes', spikes, warning);

  const frame = geometry();
  append(frame, transform(box(0.24, 2.4, 0.24), { translation: [-1.1, 1.45, 0] }));
  append(frame, transform(box(0.24, 2.4, 0.24), { translation: [1.1, 1.45, 0] }));
  append(frame, transform(box(2.0, 0.22, 0.22), { translation: [0, 2.55, 0] }));
  append(frame, transform(box(1.0, 0.16, 0.16), { translation: [0, 2.95, 0], rotation: [0, 45 * DEG, 0] }));
  addMeshNode(document, rootNode, 'PortalFrame', frame, hull);

  return document;
}

async function writeAsset(fileName, documentBuilder) {
  const document = createDocument(fileName.replace('.glb', ''));
  const complete = documentBuilder(document);
  const io = new NodeIO();
  const buffer = await io.writeBinary(complete);
  await fs.writeFile(path.join(OUT_DIR, fileName), buffer);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });

  await writeAsset('broken_halo_env.glb', buildEnvironment);
  await writeAsset('broken_halo_reactor.glb', buildReactor);
  await writeAsset('broken_halo_pad.glb', buildPad);
  await writeAsset('broken_halo_beacon.glb', buildBeacon);
  await writeAsset('broken_halo_portal.glb', buildPortal);

  console.log('Generated Broken Halo GLB assets in', OUT_DIR);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
