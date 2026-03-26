/**
 * Wave Data Helper
 * Formula-derived wave data per §17.7
 */

/**
 * Calculate enemy count for a wave.
 * Formula: enemyCount = 2 + waveNumber
 */
export function getEnemyCount(waveNumber) {
  return 2 + waveNumber;
}

/**
 * Calculate enemy HP for a wave.
 * Formula: enemyHP = 10 + ((waveNumber - 1) * 5)
 */
export function getEnemyHP(waveNumber) {
  return 10 + ((waveNumber - 1) * 5);
}

/**
 * Calculate enemy speed for a wave.
 * Formula: enemySpeed = min(2.0 + ((waveNumber - 1) * 0.1), 3.0)
 */
export function getEnemySpeed(waveNumber) {
  return Math.min(2.0 + ((waveNumber - 1) * 0.1), 3.0);
}

/**
 * Calculate spawn interval for a wave.
 * Formula: spawnInterval = max(1.2 - ((waveNumber - 1) * 0.03), 0.7)
 */
export function getSpawnInterval(waveNumber) {
  return Math.max(1.2 - ((waveNumber - 1) * 0.03), 0.7);
}

/**
 * Get gold reward per kill (constant).
 */
export function getGoldReward() {
  return 25;
}

/**
 * Get complete wave data for a wave number.
 */
export function getWaveData(waveNumber) {
  return {
    waveNumber: waveNumber,
    enemyCount: getEnemyCount(waveNumber),
    enemyHP: getEnemyHP(waveNumber),
    enemySpeed: getEnemySpeed(waveNumber),
    spawnInterval: getSpawnInterval(waveNumber),
    goldReward: getGoldReward()
  };
}
