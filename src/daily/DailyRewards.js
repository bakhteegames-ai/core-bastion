/**
 * DailyRewards
 * 7-day streak system. Missed day = watch ad to keep or reset.
 */

const REWARDS = [
  { day: 1, shards: 50, crystals: 0, name: 'Начало пути' },
  { day: 2, shards: 75, crystals: 0, name: 'Упорство' },
  { day: 3, shards: 100, crystals: 0, name: 'Рутина' },
  { day: 4, shards: 150, crystals: 0, name: 'Дисциплина' },
  { day: 5, shards: 200, crystals: 1, name: 'Привычка' },
  { day: 6, shards: 300, crystals: 2, name: 'Мастерство' },
  { day: 7, shards: 500, crystals: 5, name: 'ЛЕГЕНДА' }
];

const REWARDS_KEY = 'core_bastion_rewards_v1';

export class DailyRewards {
  constructor(saveService = null) {
    this._saveService = saveService;
    this._streak = 0;
    this._lastClaimDate = null;
    this._claimedToday = false;
  }

  async initialize() {
    await this._load();
    this._checkNewDay();
  }

  canClaim() { return !this._claimedToday; }

  getStreakInfo() {
    const next = REWARDS[Math.min(this._streak, 6)];
    return { streak: this._streak, day: Math.min(this._streak + 1, 7), canClaim: this.canClaim(), nextReward: next, isComplete: this._streak >= 7 };
  }

  claimReward() {
    if (!this.canClaim()) return null;
    const reward = REWARDS[Math.min(this._streak, 6)];
    this._claimedToday = true;
    this._lastClaimDate = this._todayString();
    if (this._streak < 7) this._streak++;
    this._save();
    return { shards: reward.shards, crystals: reward.crystals, bonus: reward.name, day: Math.min(this._streak, 7) };
  }

  keepStreakViaAd() {
    if (this._isMissedDay()) { this._lastClaimDate = this._todayString(); this._save(); return true; }
    return false;
  }

  _checkNewDay() {
    const today = this._todayString();
    if (this._lastClaimDate === today) this._claimedToday = true;
    else if (this._isStreakBroken()) { this._streak = 0; this._claimedToday = false; this._save(); }
    else this._claimedToday = false;
  }

  _isMissedDay() { if (!this._lastClaimDate) return false; return this._lastClaimDate === this._dateString(new Date(Date.now() - 86400000)); }
  _isStreakBroken() { if (!this._lastClaimDate) return false; return this._lastClaimDate <= this._dateString(new Date(Date.now() - 172800000)); }
  _todayString() { return this._dateString(new Date()); }
  _dateString(d) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }

  async _load() {
    try {
      let d = this._saveService?.loadData ? await this._saveService.loadData(REWARDS_KEY) : null;
      if (!d && typeof localStorage !== 'undefined') { const r = localStorage.getItem(REWARDS_KEY); if (r) d = JSON.parse(r); }
      if (d) { this._streak = d.streak || 0; this._lastClaimDate = d.lastClaimDate || null; this._claimedToday = d.claimedToday || false; }
    } catch (e) { console.error(e); }
  }

  async _save() {
    const d = { streak: this._streak, lastClaimDate: this._lastClaimDate, claimedToday: this._claimedToday, version: 1 };
    try {
      if (this._saveService?.saveData) await this._saveService.saveData(REWARDS_KEY, d);
      if (typeof localStorage !== 'undefined') localStorage.setItem(REWARDS_KEY, JSON.stringify(d));
    } catch (e) { console.error(e); }
  }
}
