// src/meta/RunModifier.js
export class RunModifier {
  constructor(meta) { this._meta = meta; }
  applyToRun(g) {
    const m = this._meta.activeModifiers;
    if (m.startingGoldBonus > 0) g.economyService.addGold(m.startingGoldBonus);
    if (m.baseHpBonus > 0) { const b = g.baseHealth; b.setMaxHP((b.maxHP || 10) + m.baseHpBonus); b.setHP(b.maxHP); }
    if (m.buildPhaseBonus > 0) g._buildPhaseBonus = m.buildPhaseBonus;
    g._runModifiers = { towerDamageMultiplier: m.towerDamageMultiplier, towerRangeMultiplier: m.towerRangeMultiplier,
      critMultiplierBonus: m.critMultiplierBonus, goldRewardMultiplier: m.goldRewardMultiplier,
      hpRegenPerWave: m.hpRegenPerWave, interestRate: m.interestRate, freeContinue: m.freeContinue };
  }
  getTowerDamageMultiplier() { return this._meta.activeModifiers.towerDamageMultiplier; }
  getTowerRangeMultiplier() { return this._meta.activeModifiers.towerRangeMultiplier; }
  getGoldMultiplier() { return this._meta.activeModifiers.goldRewardMultiplier; }
  hasFreeContinue() { return this._meta.activeModifiers.freeContinue; }
  getHpRegenPerWave() { return this._meta.activeModifiers.hpRegenPerWave; }
}
