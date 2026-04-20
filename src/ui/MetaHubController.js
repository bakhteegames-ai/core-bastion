/**
 * MetaHubController
 * Manages the Meta-progression UI screen between runs.
 */

export class MetaHubController {
  constructor(options = {}) {
    this._metaService = options.metaService;
    this._onStartRun = options.onStartRun || (() => {});
    this._onWatchAd = options.onWatchAd || (() => {});
    this._onConvertCrystals = options.onConvertCrystals || (() => {});
    this._container = null;
    this._isVisible = false;
  }

  show() {
    if (this._isVisible) return;
    this._isVisible = true;
    this._createDOM();
    this._render();
  }

  hide() {
    this._isVisible = false;
    if (this._container) this._container.style.display = 'none';
  }

  destroy() {
    if (this._container) { this._container.remove(); this._container = null; }
    this._isVisible = false;
  }

  _createDOM() {
    if (this._container) return;
    this._container = document.createElement('div');
    this._container.id = 'meta-hub';
    this._container.style.cssText = `
      position:fixed;top:0;left:0;width:100%;height:100%;
      background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);
      color:#eee;font-family:'Segoe UI',system-ui,sans-serif;
      z-index:1000;display:flex;flex-direction:column;overflow:hidden;
    `;
    document.body.appendChild(this._container);
  }

  _render() {
    if (!this._container) return;
    const stats = this._metaService.getStats();
    const talents = this._metaService.getTalentTreeState();

    this._container.innerHTML = `
      <div style="padding:20px;text-align:center;border-bottom:2px solid #e94560;">
        <h1 style="margin:0;color:#e94560;font-size:28px;">🏰 КРЕПОСТЬ</h1>
        <div style="margin-top:10px;display:flex;justify-content:center;gap:30px;font-size:18px;">
          <span>💎 ${stats.shards} Осколков</span>
          <span>💠 ${stats.crystals} Кристаллов</span>
          <span>🏆 Волна ${stats.highestWave}</span>
        </div>
      </div>
      <div style="flex:1;overflow-y:auto;padding:20px;">
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:15px;max-width:1200px;margin:0 auto;">
          ${talents.map(t => this._renderTalentCard(t)).join('')}
        </div>
      </div>
      <div style="padding:20px;border-top:2px solid #e94560;display:flex;justify-content:center;gap:15px;background:rgba(0,0,0,0.3);">
        <button id="meta-start" style="padding:15px 40px;font-size:20px;background:#e94560;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">⚔️ НАЧАТЬ ЗАБЕГ</button>
        <button id="meta-ad" style="padding:15px 30px;font-size:16px;background:#f9a825;color:#1a1a2e;border:none;border-radius:8px;cursor:pointer;font-weight:bold;">📺 ×2 Осколков</button>
        <button id="meta-convert" style="padding:15px 20px;font-size:14px;background:#00bcd4;color:white;border:none;border-radius:8px;cursor:pointer;">💠→💎</button>
        <button id="meta-reset" style="padding:15px 20px;font-size:14px;background:transparent;color:#aaa;border:1px solid #555;border-radius:8px;cursor:pointer;">↺ Сброс</button>
      </div>
    `;
    this._attachListeners();
  }

  _renderTalentCard(t) {
    const isMaxed = t.isMaxed, canAfford = t.canAfford;
    const progress = (t.currentLevel / t.maxLevel) * 100;
    return `
      <div style="background:rgba(255,255,255,0.05);border-radius:12px;padding:15px;border:1px solid ${isMaxed ? '#ffd700' : '#333'};">
        <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
          <h3 style="margin:0;color:${isMaxed ? '#ffd700' : '#fff'};font-size:16px;">${t.name}</h3>
          <span style="background:${isMaxed ? '#ffd700' : '#e94560'};color:${isMaxed ? '#1a1a2e' : '#fff'};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:bold;">${t.currentLevel}/${t.maxLevel}</span>
        </div>
        <p style="margin:0 0 10px 0;color:#aaa;font-size:13px;line-height:1.4;">${t.description.replace('{value}', t.nextValue || t.currentValue)}</p>
        <div style="background:rgba(0,0,0,0.3);height:6px;border-radius:3px;margin-bottom:10px;overflow:hidden;">
          <div style="width:${progress}%;height:100%;background:linear-gradient(90deg,#e94560,#ff6b6b);"></div>
        </div>
        <button class="talent-up" data-talent="${t.id}" style="width:100%;padding:10px;border:none;border-radius:6px;cursor:${isMaxed || !canAfford ? 'not-allowed' : 'pointer'};font-weight:bold;background:${isMaxed ? '#2d2d2d' : canAfford ? '#e94560' : '#555'};color:${isMaxed ? '#666' : '#fff'};" ${isMaxed || !canAfford ? 'disabled' : ''}>${isMaxed ? 'МАКСИМУМ' : `Улучшить за ${t.nextCost} 💎`}</button>
      </div>
    `;
  }

  _attachListeners() {
    const startBtn = this._container.querySelector('#meta-start');
    if (startBtn) startBtn.onclick = () => this._onStartRun();

    const adBtn = this._container.querySelector('#meta-ad');
    if (adBtn) adBtn.onclick = () => this._onWatchAd();

    const convertBtn = this._container.querySelector('#meta-convert');
    if (convertBtn) convertBtn.onclick = () => this._onConvertCrystals();

    const resetBtn = this._container.querySelector('#meta-reset');
    if (resetBtn) {
      resetBtn.onclick = () => {
        if (confirm('Сбросить все таланты? Вернётся 80% осколков.')) {
          const refunded = this._metaService.resetTalents();
          alert(`Возвращено ${refunded} осколков!`);
          this._render();
        }
      };
    }

    this._container.querySelectorAll('.talent-up').forEach(btn => {
      btn.onclick = (e) => {
        if (this._metaService.upgradeTalent(e.target.dataset.talent)) this._render();
      };
    });
  }
}
