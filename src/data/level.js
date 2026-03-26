/**
 * Level and Battlefield Data
 * Values from §17.2 World Space Battlefield Reference
 */

// Ground bounds
export const GROUND_WIDTH = 16;
export const GROUND_DEPTH = 24;

// Spawn and Base points
export const SPAWN_POINT = { x: 0, y: 0, z: 10 };
export const BASE_POINT = { x: 0, y: 0, z: -10 };

// Build slots (exactly 2 as per §17.3)
export const BUILD_SLOTS = [
  { id: 'A', x: -4, y: 0, z: 2 },
  { id: 'B', x: 1, y: 0, z: -6 }
];

// Waypoints for enemy path (§17.2)
export const WAYPOINTS = [
  { x: 0, y: 0, z: 10 },   // P0 - Spawn
  { x: 0, y: 0, z: 6 },    // P1
  { x: -5, y: 0, z: 6 },   // P2
  { x: -5, y: 0, z: -4 },  // P3
  { x: 0, y: 0, z: -10 }   // P4 - Base
];
