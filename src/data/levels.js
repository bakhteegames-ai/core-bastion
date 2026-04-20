/**
 * Level Definitions
 * 3 biomes with different paths, visuals, and difficulty curves.
 */

export const LEVELS = {
  'meadow': {
    id: 'meadow',
    name: 'Зелёный Луг',
    nameEn: 'Green Meadow',
    description: 'Классическое поле битвы. Сбалансировано для новичков.',
    difficulty: 1,
    backgroundColor: { r: 0.4, g: 0.7, b: 0.3 },
    groundColor: { r: 0.3, g: 0.5, b: 0.2 },
    pathColor: { r: 0.6, g: 0.5, b: 0.3 },
    
    // Waypoints for enemy path
    waypoints: [
      { x: -8, z: -4 },
      { x: -4, z: -4 },
      { x: -4, z: 2 },
      { x: 2, z: 2 },
      { x: 2, z: -2 },
      { x: 6, z: -2 },
      { x: 6, z: 4 },
      { x: 10, z: 4 }
    ],
    
    // Build slots
    buildSlots: [
      { id: 'A', x: -6, z: -2 },
      { id: 'B', x: -2, z: 0 },
      { id: 'C', x: 0, z: 4 },
      { id: 'D', x: 4, z: 0 },
      { id: 'E', x: 8, z: 2 }
    ],
    
    // Camera position
    camera: { x: 0, y: 12, z: 8 },
    
    // Wave adjustments
    waveModifiers: {
      enemyHpMultiplier: 1.0,
      enemySpeedMultiplier: 1.0,
      goldMultiplier: 1.0
    }
  },

  'desert': {
    id: 'desert',
    name: 'Пылающая Пустыня',
    nameEn: 'Blazing Desert',
    description: 'Враги быстрее, но дают больше золота.',
    difficulty: 2,
    backgroundColor: { r: 0.9, g: 0.7, b: 0.4 },
    groundColor: { r: 0.8, g: 0.6, b: 0.3 },
    pathColor: { r: 0.7, g: 0.5, b: 0.2 },
    
    waypoints: [
      { x: -10, z: 0 },
      { x: -6, z: 0 },
      { x: -6, z: -4 },
      { x: -2, z: -4 },
      { x: -2, z: 4 },
      { x: 4, z: 4 },
      { x: 4, z: -2 },
      { x: 10, z: -2 }
    ],
    
    buildSlots: [
      { id: 'A', x: -8, z: 2 },
      { id: 'B', x: -4, z: -2 },
      { id: 'C', x: 0, z: 0 },
      { id: 'D', x: 2, z: 2 },
      { id: 'E', x: 6, z: 0 },
      { id: 'F', x: 8, z: -4 }
    ],
    
    camera: { x: 0, y: 14, z: 6 },
    
    waveModifiers: {
      enemyHpMultiplier: 0.9,
      enemySpeedMultiplier: 1.3,
      goldMultiplier: 1.25
    }
  },

  'snow': {
    id: 'snow',
    name: 'Ледяные Пики',
    nameEn: 'Frozen Peaks',
    description: 'Враги крепче, но замедление башен эффективнее.',
    difficulty: 3,
    backgroundColor: { r: 0.7, g: 0.8, b: 0.9 },
    groundColor: { r: 0.8, g: 0.9, b: 1.0 },
    pathColor: { r: 0.5, g: 0.6, b: 0.7 },
    
    waypoints: [
      { x: -8, z: 6 },
      { x: -8, z: 2 },
      { x: -4, z: 2 },
      { x: -4, z: -2 },
      { x: 0, z: -2 },
      { x: 0, z: 2 },
      { x: 4, z: 2 },
      { x: 4, z: -4 },
      { x: 10, z: -4 }
    ],
    
    buildSlots: [
      { id: 'A', x: -6, z: 4 },
      { id: 'B', x: -6, z: 0 },
      { id: 'C', x: -2, z: 0 },
      { id: 'D', x: 2, z: 0 },
      { id: 'E', x: 2, z: 4 },
      { id: 'F', x: 6, z: 0 },
      { id: 'G', x: 6, z: -2 }
    ],
    
    camera: { x: 0, y: 15, z: 4 },
    
    waveModifiers: {
      enemyHpMultiplier: 1.4,
      enemySpeedMultiplier: 0.8,
      goldMultiplier: 1.1,
      slowEffectiveness: 1.5 // Ice towers slow 50% more
    }
  }
};

/**
 * Get level by ID
 */
export function getLevel(id) {
  return LEVELS[id] || LEVELS['meadow'];
}

/**
 * Get all levels
 */
export function getAllLevels() {
  return Object.values(LEVELS);
}

/**
 * Get level IDs for unlocking logic
 */
export function getLevelIds() {
  return Object.keys(LEVELS);
}
