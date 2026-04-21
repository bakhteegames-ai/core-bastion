// src/meta/RunModifier.js
export class RunModifier {
  constructor(meta) {
    this._meta = meta;
  }

  applyToRun(game) {
    const m = this._meta.activeModifiers;

    if (m.startingGoldBonus > 0) {
      game.economyService.addGold(m.startingGoldBonus);
    }

    if (m.baseHpBonus > 0) {
      const base = game.baseHealth;
      const maxHp = (base.maxHP || 10) + m.baseHpBonus;
      base.setMaxHP(maxHp);
      base.setHP(maxHp);
    }

    game._buildPhaseBonus = m.buildPhaseBonus || 0;
    game._runModifiers = {
      towerDamageMultiplier: m.towerDamageMultiplier,
      towerRangeMultiplier: m.towerRangeMultiplier,
      critMultiplierBonus: m.critMultiplierBonus,
      goldRewardMultiplier: m.goldRewardMultiplier,
      hpRegenPerWave: m.hpRegenPerWave,
      interestRate: m.interestRate,
      freeContinue: m.freeContinue
    };
  }

  applyToWave(_waveNumber) {
    // Hook reserved for future per-wave logic.
  }

  applyToWaveCompletion(_waveNumber, game) {
    const interestRate = this._meta.activeModifiers.interestRate;
    if (!interestRate || !game?.economyService) {
      return 0;
    }

    const currentGold = game.economyService.gold;
    if (currentGold <= 0) {
      return 0;
    }

    const bonus = Math.floor(currentGold * interestRate);
    if (bonus > 0) {
      game.economyService.addGold(bonus);
      game._updateHudGold?.();
      console.log(`[RunModifier] Interest bonus awarded: ${bonus}`);
    }
    return bonus;
  }

  getTowerDamageMultiplier() { return this._meta.activeModifiers.towerDamageMultiplier; }
  getTowerRangeMultiplier() { return this._meta.activeModifiers.towerRangeMultiplier; }
  getGoldMultiplier() { return this._meta.activeModifiers.goldRewardMultiplier; }
  hasFreeContinue() { return this._meta.activeModifiers.freeContinue; }
  getHpRegenPerWave() { return this._meta.activeModifiers.hpRegenPerWave; }
}
