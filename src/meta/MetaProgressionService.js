// src/meta/MetaProgressionService.js
import { TALENTS, getTalentCost, getTalentValue } from '../data/talents.js';
const META_SAVE_KEY = 'core_bastion_meta_v1';

export class MetaProgressionService {
  constructor(saveService = null) {
    this._saveService = saveService;
    this._shards = 0; this._crystals = 0;
    this._talentLevels = {}; this._totalRuns = 0;
    this._totalWaves = 0; this._totalKills = 0;
    this._highestWave = 0; this._shardsEarnedTotal = 0;
    this._activeModifiers = null; this._initialized = false;
  }

  async initialize() {
    if (this._initialized) return;
    await this._load(); this._initialized = true;
  }

  get shards() { return this._shards; }
  get crystals() { return this._crystals; }

  canAffordTalent(talentId) {
    return this._shards >= getTalentCost(talentId, this._talentLevels[talentId] || 0);
  }

  upgradeTalent(talentId) {
    if (!this.canAffordTalent(talentId)) return false;
    const lvl = this._talentLevels[talentId] || 0;
    this._shards -= getTalentCost(talentId, lvl);
    this._talentLevels[talentId] = lvl + 1;
    this._save(); return true;
  }

  getTalentLevel(talentId) { return this._talentLevels[talentId] || 0; }

  calculateRunModifiers() {
    const m = {
      towerDamageMultiplier: 1.0, towerRangeMultiplier: 1.0, critMultiplierBonus: 0,
      baseHpBonus: 0, hpRegenPerWave: 0, startingGoldBonus: 0,
      goldRewardMultiplier: 1.0, interestRate: 0, buildPhaseBonus: 0, freeContinue: false
    };
    const add = (id, key, div = 100) => {
      const l = this.getTalentLevel(id);
      if (l > 0) { const v = getTalentValue(id, l); if (div) m[key] += v / div; else m[key] = v; }
    };
    add('sharp_arrows', 'towerDamageMultiplier');
    add('sniper_training', 'towerRangeMultiplier');
    add('crit_mastery', 'critMultiplierBonus');
    add('fortified_base', 'baseHpBonus', 0);
    add('emergency_repair', 'hpRegenPerWave', 0);
    add('greedy_goblin', 'startingGoldBonus', 0);
    add('bounty_hunter', 'goldRewardMultiplier');
    add('interest_gains', 'interestRate');
    add('fast_builder', 'buildPhaseBonus', 0);
    if (this.getTalentLevel('second_chance') > 0) m.freeContinue = true;
    this._activeModifiers = m; return m;
  }

  get activeModifiers() { return this._activeModifiers || this.calculateRunModifiers(); }

  awardShards(amount) { if (amount > 0) { this._shards += amount; this._shardsEarnedTotal += amount; this._save(); } }
  awardCrystals(amount) { if (amount > 0) { this._crystals += amount; this._save(); } }
  spendCrystals(amount) { if (this._crystals < amount) return false; this._crystals -= amount; this._save(); return true; }
  convertCrystalsToShards(amount) { if (!this.spendCrystals(amount)) return false; this.awardShards(amount * 10); return true; }

  recordRun(waveReached, enemiesKilled) {
    this._totalRuns++; this._totalWaves += waveReached; this._totalKills += enemiesKilled;
    if (waveReached > this._highestWave) this._highestWave = waveReached;
    this._save();
  }

  getStats() {
    return { shards: this._shards, crystals: this._crystals, totalRuns: this._totalRuns,
      totalWaves: this._totalWaves, totalKills: this._totalKills, highestWave: this._highestWave,
      shardsEarnedTotal: this._shardsEarnedTotal };
  }

  getTalentTreeState() {
    return Object.keys(TALENTS).map(id => {
      const t = TALENTS[id], l = this.getTalentLevel(id);
      const nc = getTalentCost(id, l), nv = l < t.maxLevel ? getTalentValue(id, l + 1) : null;
      return { ...t, currentLevel: l, nextCost: nc, currentValue: getTalentValue(id, l),
        nextValue: nv, isMaxed: l >= t.maxLevel, canAfford: this._shards >= nc };
    });
  }

  resetTalents() {
    let spent = 0;
    for (const [id, l] of Object.entries(this._talentLevels))
      for (let i = 0; i < l; i++) spent += getTalentCost(id, i);
    const refund = Math.floor(spent * 0.8);
    this._talentLevels = {}; this._shards += refund; this._save();
    return refund;
  }

  async _load() {
    try {
      let d = this._saveService?.loadData ? await this._saveService.loadData(META_SAVE_KEY) : null;
      if (!d && typeof localStorage !== 'undefined') { const r = localStorage.getItem(META_SAVE_KEY); if (r) d = JSON.parse(r); }
      if (d) { this._shards = d.shards || 0; this._crystals = d.crystals || 0; this._talentLevels = d.talentLevels || {};
        this._totalRuns = d.totalRuns || 0; this._totalWaves = d.totalWaves || 0; this._totalKills = d.totalKills || 0;
        this._highestWave = d.highestWave || 0; this._shardsEarnedTotal = d.shardsEarnedTotal || 0; }
    } catch (e) { console.error(e); }
  }

  async _save() {
    const d = { shards: this._shards, crystals: this._crystals, talentLevels: this._talentLevels,
      totalRuns: this._totalRuns, totalWaves: this._totalWaves, totalKills: this._totalKills,
      highestWave: this._highestWave, shardsEarnedTotal: this._shardsEarnedTotal, version: 1 };
    try {
      if (this._saveService?.saveData) await this._saveService.saveData(META_SAVE_KEY, d);
      if (typeof localStorage !== 'undefined') localStorage.setItem(META_SAVE_KEY, JSON.stringify(d));
    } catch (e) { console.error(e); }
  }
}
