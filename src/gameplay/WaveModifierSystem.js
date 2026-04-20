/**
 * WaveModifierSystem
 * Applies active modifiers to wave/enemy parameters.
 * Called by WaveManager when spawning enemies.
 */

export class WaveModifierSystem {
  constructor() {
    this._activeModifiers = [];
    this._currentEffects = this._calculateCombinedEffects();
  }

  /**
   * Set modifier schedule for current run
   */
  setSchedule(schedule) {
    this._activeModifiers = schedule || [];
    this._currentEffects = this._calculateCombinedEffects();
  }

  /**
   * Check and activate modifier for specific wave
   */
  onWaveStart(waveNumber) {
    const entry = this._activeModifiers.find(m => m.wave === waveNumber);
    if (entry) {
      console.log(`[WaveModifier] ACTIVATED: ${entry.modifier.name} on wave ${waveNumber}`);
      this._currentEffects = this._calculateCombinedEffects();
      return entry.modifier;
    }
    return null;
  }

  /**
   * Get active modifier names for UI
   */
  getActiveModifierNames() {
    // Return modifiers that have been activated (wave <= current)
    // This needs current wave info from outside, simplified here
    return this._activeModifiers.map(m => m.modifier.name);
  }

  /**
   * Apply modifiers to enemy spawn data
   */
  modifyEnemyData(baseData, waveNumber) {
    const effects = this._currentEffects;
    const modified = { ...baseData };

    // HP modifications
    if (effects.enemyHpMultiplier) {
      modified.hp = Math.round(modified.hp * effects.enemyHpMultiplier);
    }
    if (effects.armorBonus) {
      modified.armor = (modified.armor || 0) + effects.armorBonus;
    }

    // Speed modifications
    if (effects.speedMultiplier) {
      modified.speed = modified.speed * effects.speedMultiplier;
    }

    // Gold modifications
    if (effects.goldMultiplier) {
      modified.goldReward = Math.round(modified.goldReward * effects.goldMultiplier);
    }

    // Leak damage
    if (effects.leakDamageMultiplier) {
      modified.leakDamage = (modified.leakDamage || 1) * effects.leakDamageMultiplier;
    }

    // Regeneration
    if (effects.hpRegenPercent) {
      modified.hpRegen = Math.round(modified.hp * effects.hpRegenPercent);
    }

    // Flyer conversion
    if (effects.flyerChance && Math.random() < effects.flyerChance) {
      modified.typeId = 'flyer';
      // Recalculate stats for flyer type
      const flyerStats = this._getFlyerStats(waveNumber);
      modified.hp = flyerStats.hp;
      modified.speed = flyerStats.speed;
      modified.canFly = true;
    }

    // Boss modifications
    if (modified.typeId === 'boss') {
      if (effects.bossHpMultiplier) {
        modified.hp = Math.round(modified.hp * effects.bossHpMultiplier);
      }
    }

    return modified;
  }

  /**
   * Get build phase duration with modifiers
   */
  getBuildPhaseDuration(baseDuration) {
    const effects = this._currentEffects;
    if (effects.buildPhaseDuration) {
      return effects.buildPhaseDuration;
    }
    return baseDuration;
  }

  /**
   * Get tower cost multiplier
   */
  getTowerCostMultiplier() {
    return this._currentEffects.towerCostMultiplier || 1.0;
  }

  /**
   * Get spawn interval multiplier
   */
  getSpawnIntervalMultiplier() {
    return this._currentEffects.spawnIntervalMultiplier || 1.0;
  }

  /**
   * Get enemy count multiplier
   */
  getEnemyCountMultiplier() {
    return this._currentEffects.enemyCountMultiplier || 1.0;
  }

  /**
   * Get boss count for boss waves
   */
  getBossCount() {
    return this._currentEffects.bossCount || 1;
  }

  /**
   * Check if regeneration is active
   */
  hasRegeneration() {
    return !!this._currentEffects.hpRegenPercent;
  }

  getRegenPercent() {
    return this._currentEffects.hpRegenPercent || 0;
  }

  // ============================
  // PRIVATE
  // ============================

  _calculateCombinedEffects() {
    const combined = {};
    
    // Combine all active modifier effects (multiplicative for multipliers, additive for bonuses)
    this._activeModifiers.forEach(entry => {
      const effects = entry.modifier.effects;
      for (const [key, value] of Object.entries(effects)) {
        if (typeof value === 'number') {
          if (key.includes('Multiplier')) {
            combined[key] = (combined[key] || 1.0) * value;
          } else {
            combined[key] = (combined[key] || 0) + value;
          }
        } else {
          combined[key] = value;
        }
      }
    });

    return combined;
  }

  _getFlyerStats(waveNumber) {
    // Simplified flyer scaling
    return {
      hp: 15 + (waveNumber - 1) * 4,
      speed: 2.5
    };
  }
}
