/**
 * LeaderboardService
 * Yandex Games API + local fallback.
 */

export class LeaderboardService {
  constructor(bridge) {
    this._bridge = bridge;
    this._local = [];
    this._initialized = false;
  }

  async initialize() {
    if (!this._bridge || !this._bridge.isYandex) { this._initialized = true; return; }
    try { await this._bridge.initLeaderboard(); this._initialized = true; } catch (e) { this._initialized = true; }
  }

  async submitScore(wave, mode = 'endless') {
    const entry = { mode, wave, date: new Date().toISOString(), name: this._bridge?.playerName || 'Player' };
    if (this._bridge?.submitLeaderboardScore) {
      try { await this._bridge.submitLeaderboardScore(mode, wave); } catch (e) {}
    }
    this._local.push(entry);
    this._local.sort((a, b) => b.wave - a.wave);
    this._local = this._local.slice(0, 100);
  }

  async getLeaderboard(mode = 'endless', count = 10) {
    if (this._bridge?.getLeaderboardEntries) {
      try {
        const entries = await this._bridge.getLeaderboardEntries(mode, count);
        return entries.map(e => ({ rank: e.rank, name: e.player?.publicName || 'Player', score: e.score, avatar: e.player?.getAvatarSrc?.() || null }));
      } catch (e) {}
    }
    return this._local.filter(e => e.mode === mode).slice(0, count).map((e, i) => ({ rank: i + 1, name: e.name, score: e.wave, avatar: null }));
  }

  async getPlayerBest(mode = 'endless') {
    if (this._bridge?.getPlayerScore) {
      try { const s = await this._bridge.getPlayerScore(mode); return s || 0; } catch (e) { return 0; }
    }
    const p = this._local.filter(e => e.mode === mode).sort((a, b) => b.wave - a.wave)[0];
    return p ? p.wave : 0;
  }
}
