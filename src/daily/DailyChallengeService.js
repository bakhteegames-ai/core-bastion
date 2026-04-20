/**
 * DailyChallengeService
 * Fixed daily run with deterministic seed. 1 free attempt + 1 for ad.
 */

import { getLevel } from '../data/levels.js';

const DAILY_KEY = 'core_bastion_daily_v1';

export class DailyChallengeService {
  constructor(saveService = null) {
    this._saveService = saveService;
    this._todaySeed = this._generateSeed();
    this._attemptsUsed = 0;
    this._bestWaveToday = 0;
    this._lastPlayedDate = null;
    this._initialized = false;
  }

  async initialize() {
    await this._load();
    this._initialized = true;
    if (this._lastPlayedDate !== this._todaySeed) {
      this._attemptsUsed = 0;
      this._bestWaveToday = 0;
      this._lastPlayedDate = this._todaySeed;
      this._save();
    }
  }

  getTodaysChallenge() {
    const rng = this._seededRandom(this._todaySeed);
    const levels = ['meadow', 'desert', 'snow'];
    const levelId = levels[Math.floor(rng() * levels.length)];
    const modifiers = [];
    const modCount = 2 + Math.floor(rng() * 2);
    const pool = ['swarm', 'tank_wave', 'rush', 'expensive_towers', 'short_build', 'flying_horde', 'regeneration', 'elite_minions'];
    for (let i = 0; i < modCount; i++) {
      modifiers.push({ wave: (i + 1) * 5, modifierId: pool[Math.floor(rng() * pool.length)] });
    }
    return {
      date: this._todaySeed,
      levelId,
      level: getLevel(levelId),
      modifierSchedule: modifiers,
      startingGold: 80 + Math.floor(rng() * 40)
    };
  }

  canAttempt() { return this._attemptsUsed < 1; }
  
  useAttempt() {
    if (!this.canAttempt()) return false;
    this._attemptsUsed++; this._save(); return true;
  }

  addAttemptViaAd() {
    this._attemptsUsed = Math.max(0, this._attemptsUsed - 1);
    this._save(); return true;
  }

  recordResult(waveReached) {
    if (waveReached > this._bestWaveToday) {
      this._bestWaveToday = waveReached; this._save();
    }
  }

  getStats() {
    return {
      todaySeed: this._todaySeed,
      attemptsUsed: this._attemptsUsed,
      attemptsRemaining: 1 - this._attemptsUsed,
      bestWaveToday: this._bestWaveToday,
      canAttempt: this.canAttempt()
    };
  }

  _generateSeed() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  }

  _seededRandom(seed) {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = ((s << 5) - s) + seed.charCodeAt(i), s |= 0;
    return () => { s = Math.imul(s ^ (s >>> 16), 0x7feb352d); s = Math.imul(s ^ (s >>> 15), 0x846ca68b); return ((s ^ (s >>> 16)) >>> 0) / 4294967296; };
  }

  async _load() {
    try {
      let d = this._saveService?.loadData ? await this._saveService.loadData(DAILY_KEY) : null;
      if (!d && typeof localStorage !== 'undefined') { const r = localStorage.getItem(DAILY_KEY); if (r) d = JSON.parse(r); }
      if (d) { this._attemptsUsed = d.attemptsUsed || 0; this._bestWaveToday = d.bestWaveToday || 0; this._lastPlayedDate = d.lastPlayedDate || null; }
    } catch (e) { console.error(e); }
  }

  async _save() {
    const d = { attemptsUsed: this._attemptsUsed, bestWaveToday: this._bestWaveToday, lastPlayedDate: this._lastPlayedDate, version: 1 };
    try {
      if (this._saveService?.saveData) await this._saveService.saveData(DAILY_KEY, d);
      if (typeof localStorage !== 'undefined') localStorage.setItem(DAILY_KEY, JSON.stringify(d));
    } catch (e) { console.error(e); }
  }
}
