/**
 * LeaderboardService
 * Yandex Games API + local fallback.
 */

const LOCAL_KEY = 'core_bastion_leaderboard_v1';

export class LeaderboardService {
  constructor(bridge) {
    this._bridge = bridge;
    this._local = this._loadLocal();
    this._initialized = false;
  }

  setBridge(bridge) {
    this._bridge = bridge;
  }

  async initialize() {
    if (!this._bridge || !this._bridge.isYandex) {
      this._initialized = true;
      return;
    }
    try {
      await this._bridge.initLeaderboard();
    } catch (e) {
      console.warn('[LeaderboardService] initLeaderboard failed:', e);
    }
    this._initialized = true;
  }

  async submitScore(wave, mode = 'endless') {
    const entry = {
      mode,
      wave,
      date: new Date().toISOString(),
      name: this._bridge?.playerName || 'Player'
    };

    if (this._bridge?.submitLeaderboardScore) {
      try {
        await this._bridge.submitLeaderboardScore(mode, wave);
      } catch (e) {
        console.warn('[LeaderboardService] submitLeaderboardScore failed:', e);
      }
    }

    this._local.push(entry);
    this._local.sort((a, b) => b.wave - a.wave);
    this._local = this._local.slice(0, 100);
    this._saveLocal();
  }

  async getLeaderboard(mode = 'endless', count = 10) {
    if (this._bridge?.getLeaderboardEntries) {
      try {
        const entries = await this._bridge.getLeaderboardEntries(mode, count);
        return entries.map(e => ({
          rank: e.rank,
          name: e.player?.publicName || 'Player',
          score: e.score,
          avatar: e.player?.getAvatarSrc?.() || null
        }));
      } catch (e) {
        console.warn('[LeaderboardService] getLeaderboardEntries failed:', e);
      }
    }

    return this._local
      .filter(e => e.mode === mode)
      .slice(0, count)
      .map((e, i) => ({ rank: i + 1, name: e.name, score: e.wave, avatar: null }));
  }

  async getPlayerBest(mode = 'endless') {
    if (this._bridge?.getPlayerScore) {
      try {
        const score = await this._bridge.getPlayerScore(mode);
        return score || 0;
      } catch (e) {
        console.warn('[LeaderboardService] getPlayerScore failed:', e);
      }
    }

    const top = this._local
      .filter(e => e.mode === mode)
      .sort((a, b) => b.wave - a.wave)[0];
    return top ? top.wave : 0;
  }

  _loadLocal() {
    try {
      if (typeof localStorage === 'undefined') return [];
      const raw = localStorage.getItem(LOCAL_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn('[LeaderboardService] Failed to load local leaderboard:', e);
      return [];
    }
  }

  _saveLocal() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(LOCAL_KEY, JSON.stringify(this._local));
      }
    } catch (e) {
      console.warn('[LeaderboardService] Failed to save local leaderboard:', e);
    }
  }
}
