import { ABILITIES } from '../data/abilities.js';

/**
 * AbilityRuntimeController
 * Single live gameplay executor for shipped active abilities.
 */
export class AbilityRuntimeController {
  constructor(options = {}) {
    this.economyService = options.economyService || null;
    this.baseHealth = options.baseHealth || null;
    this.audioService = options.audioService || null;
    this.vfxController = options.vfxController || null;
    this.getActiveEnemies = options.getActiveEnemies || (() => []);
    this.onGoldChanged = options.onGoldChanged || null;
    this.onBaseHealthChanged = options.onBaseHealthChanged || null;
    this.onAbilityUsed = options.onAbilityUsed || null;

    this._goldMultiplier = 1;
    this._goldRushRemaining = 0;
  }

  useAbility(abilityId) {
    const ability = ABILITIES[abilityId];
    if (!ability) {
      console.warn(`[AbilityRuntime] Unknown ability: ${abilityId}`);
      return false;
    }

    if (!this._canUseAbility(ability)) {
      return false;
    }

    if (ability.cost > 0 && this.economyService?.canAfford && !this.economyService.canAfford(ability.cost)) {
      return false;
    }

    const executed = this._executeAbility(ability);
    if (!executed) {
      return false;
    }

    if (ability.cost > 0) {
      this.economyService.spendGold(ability.cost);
      this.onGoldChanged?.();
    }

    this.onAbilityUsed?.(abilityId, ability);
    return true;
  }

  update(dt, gameplayActive = true) {
    if (!gameplayActive) {
      return;
    }

    if (this._goldRushRemaining > 0) {
      this._goldRushRemaining -= dt;
      if (this._goldRushRemaining <= 0) {
        this._goldRushRemaining = 0;
        this._goldMultiplier = 1;
        console.log('[AbilityRuntime] Gold Rush expired');
      }
    }
  }

  reset() {
    this._goldMultiplier = 1;
    this._goldRushRemaining = 0;
  }

  getGoldMultiplier() {
    return this._goldMultiplier;
  }

  _getLiveEnemies() {
    const enemies = this.getActiveEnemies?.() || [];
    return enemies.filter(enemy => enemy && enemy.isActive && !enemy.isDead());
  }

  _canUseAbility(ability) {
    const effectType = ability.effect?.type;

    if (effectType === 'base_heal') {
      return this.baseHealth && this.baseHealth.currentHP < this.baseHealth.maxHP;
    }

    if (effectType === 'global_damage' || effectType === 'global_slow' || effectType === 'gold_multiplier') {
      return this._getLiveEnemies().length > 0;
    }

    return true;
  }

  _executeAbility(ability) {
    switch (ability.effect?.type) {
      case 'global_damage':
        return this._executeAirstrike(ability);
      case 'global_slow':
        return this._executeFreeze(ability);
      case 'base_heal':
        return this._executeHeal(ability);
      case 'gold_multiplier':
        return this._executeGoldRush(ability);
      default:
        return false;
    }
  }

  _executeAirstrike(ability) {
    const enemies = this._getLiveEnemies();
    if (enemies.length === 0) {
      return false;
    }

    for (const enemy of enemies) {
      enemy.takeDamage(ability.effect.damage);
      if (this.vfxController && enemy.position) {
        this.vfxController.createHitEffect(enemy.position);
      }
    }

    this.audioService?.playExplosion?.();
    return true;
  }

  _executeFreeze(ability) {
    const enemies = this._getLiveEnemies();
    if (enemies.length === 0) {
      return false;
    }

    for (const enemy of enemies) {
      enemy.applySlow(ability.effect.slowAmount, ability.effect.duration);
    }

    this.audioService?.playFreeze?.();
    return true;
  }

  _executeHeal(ability) {
    if (!this.baseHealth || this.baseHealth.currentHP >= this.baseHealth.maxHP) {
      return false;
    }

    this.baseHealth.restore(ability.effect.amount);
    this.onBaseHealthChanged?.();
    this.audioService?.playHeal?.();
    return true;
  }

  _executeGoldRush(ability) {
    if (this._getLiveEnemies().length === 0) {
      return false;
    }

    this._goldMultiplier = ability.effect.multiplier;
    this._goldRushRemaining = Math.max(this._goldRushRemaining, ability.effect.duration);
    this.audioService?.playWaveComplete?.();
    return true;
  }
}
