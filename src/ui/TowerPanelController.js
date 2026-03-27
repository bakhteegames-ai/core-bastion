/**
 * Tower Panel Controller
 * Controls tower selection and upgrade menu UI
 */

import { getAllTowerTypes, getTowerType, getTowerStats, getUpgradeCost, getSellValue } from '../data/towerTypes.js';
import { getString } from './strings.js';

export class TowerPanelController {
  constructor(options = {}) {
    this.economyService = options.economyService;
    this.onTowerSelect = options.onTowerSelect || null;
    this.onUpgrade = options.onUpgrade || null;
    this.onSell = options.onSell || null;
    
    this.selectedType = 'archer';
    this.selectedSlot = null;
    this._lang = 'en';
    this._visible = true;
    
    this._cacheElements();
    this._setupEventListeners();
    this._renderTowerList();
  }
  
  /**
   * Cache DOM elements
   */
  _cacheElements() {
    this.panel = document.getElementById('tower-panel');
    this.towerList = document.querySelector('.tower-list');
    this.towerInfo = document.querySelector('.tower-info');
    this.upgradeMenu = document.getElementById('upgrade-menu');
    this.towerPanelContainer = document.getElementById('tower-panel-container');
  }
  
  /**
   * Setup event listeners for upgrade menu buttons
   */
  _setupEventListeners() {
    // Upgrade button
    const upgradeBtn = document.querySelector('.upgrade-btn');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => {
        if (this.selectedSlot && this.onUpgrade) {
          this.onUpgrade(this.selectedSlot);
        }
      });
    }
    
    // Sell button
    const sellBtn = document.querySelector('.sell-btn');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => {
        if (this.selectedSlot && this.onSell) {
          this.onSell(this.selectedSlot);
        }
      });
    }
    
    // Close upgrade menu button
    const closeBtn = document.querySelector('.upgrade-close-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideUpgradeMenu();
      });
    }
    
    // Keyboard shortcuts for tower selection (1-5)
    document.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '5') {
        const types = getAllTowerTypes();
        const index = parseInt(e.key) - 1;
        if (index < types.length) {
          this.selectTower(types[index].id);
        }
      }
    });
  }
  
  /**
   * Render the tower selection list
   */
  _renderTowerList() {
    const types = getAllTowerTypes();
    if (!this.towerList) return;
    
    this.towerList.innerHTML = '';
    
    types.forEach((type, index) => {
      const item = document.createElement('div');
      item.className = 'tower-item';
      item.dataset.type = type.id;
      
      const isAffordable = !this.economyService || this.economyService.gold >= type.cost;
      if (!isAffordable) {
        item.classList.add('disabled');
      }
      
      item.innerHTML = `
        <div class="tower-item-icon">${this._getTowerIcon(type.id)}</div>
        <div class="tower-item-name">${this._lang === 'ru' ? type.nameRu : type.name}</div>
        <div class="tower-item-cost">${type.cost}g</div>
        <div class="tower-hotkey">${index + 1}</div>
      `;
      
      item.addEventListener('click', () => {
        if (isAffordable) {
          this.selectTower(type.id);
        }
      });
      
      this.towerList.appendChild(item);
    });
  }
  
  /**
   * Select a tower type
   * @param {string} typeId - Tower type ID
   */
  selectTower(typeId) {
    this.selectedType = typeId;
    this._updateSelection();
    this._updateInfo(typeId);
    
    if (this.onTowerSelect) {
      this.onTowerSelect(typeId);
    }
    
    console.log(`[TowerPanel] Selected tower: ${typeId}`);
  }
  
  /**
   * Update visual selection state
   */
  _updateSelection() {
    if (!this.towerList) return;
    
    const items = this.towerList.querySelectorAll('.tower-item');
    items.forEach(item => {
      if (item.dataset.type === this.selectedType) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }
  
  /**
   * Update tower info panel
   * @param {string} typeId - Tower type ID
   */
  _updateInfo(typeId) {
    if (!this.towerInfo) return;
    
    const type = getTowerType(typeId);
    const stats = getTowerStats(typeId, 1);
    
    this.towerInfo.innerHTML = `
      <div class="tower-info-name">${this._lang === 'ru' ? type.nameRu : type.name}</div>
      <div class="tower-info-stats">
        <div class="stat-row">
          <span class="stat-label">${this._lang === 'ru' ? 'Урон' : 'Damage'}:</span>
          <span class="stat-value">${stats.damage}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">${this._lang === 'ru' ? 'Радиус' : 'Range'}:</span>
          <span class="stat-value">${stats.range}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">${this._lang === 'ru' ? 'Скорость' : 'Speed'}:</span>
          <span class="stat-value">${stats.fireRate}/s</span>
        </div>
      </div>
      <div class="tower-info-desc">${this._lang === 'ru' ? type.descriptionRu : type.description}</div>
    `;
  }
  
  /**
   * Show upgrade menu for a tower
   * @param {string} slotId - Build slot ID
   * @param {object} towerData - Tower data (typeId, level, etc.)
   */
  showUpgradeMenu(slotId, towerData) {
    this.selectedSlot = slotId;
    const type = getTowerType(towerData.typeId);
    const currentStats = getTowerStats(towerData.typeId, towerData.level);
    const nextStats = towerData.level < 5 ? getTowerStats(towerData.typeId, towerData.level + 1) : null;
    
    if (!this.upgradeMenu) return;
    
    // Fill tower name
    const nameEl = this.upgradeMenu.querySelector('.upgrade-tower-name');
    if (nameEl) {
      nameEl.textContent = this._lang === 'ru' ? type.nameRu : type.name;
    }
    
    // Fill current stats
    const currentEl = this.upgradeMenu.querySelector('.upgrade-current-stats');
    if (currentEl) {
      currentEl.innerHTML = `Lvl ${towerData.level} | DMG: ${currentStats.damage} | RNG: ${currentStats.range}`;
    }
    
    // Fill next stats and upgrade button
    const nextEl = this.upgradeMenu.querySelector('.upgrade-next-stats');
    const upgradeBtn = this.upgradeMenu.querySelector('.upgrade-btn');
    
    if (towerData.level < 5) {
      if (nextEl) {
        nextEl.innerHTML = `Lvl ${towerData.level + 1} | DMG: ${nextStats.damage} | RNG: ${nextStats.range}`;
      }
      if (upgradeBtn) {
        const cost = getUpgradeCost(type.cost, towerData.level);
        upgradeBtn.textContent = `${this._lang === 'ru' ? 'Улучшить' : 'Upgrade'} (${cost}g)`;
        upgradeBtn.disabled = this.economyService ? this.economyService.gold < cost : false;
      }
    } else {
      if (nextEl) {
        nextEl.textContent = 'MAX LEVEL';
      }
      if (upgradeBtn) {
        upgradeBtn.textContent = this._lang === 'ru' ? 'Макс. уровень' : 'MAX LEVEL';
        upgradeBtn.disabled = true;
      }
    }
    
    // Fill sell button
    const sellBtn = this.upgradeMenu.querySelector('.sell-btn');
    if (sellBtn) {
      const sellValue = getSellValue(type.cost, towerData.level);
      sellBtn.textContent = `${this._lang === 'ru' ? 'Продать' : 'Sell'} (+${sellValue}g)`;
    }
    
    this.upgradeMenu.classList.remove('hidden');
    console.log(`[TowerPanel] Showing upgrade menu for slot ${slotId}`);
  }
  
  /**
   * Hide upgrade menu
   */
  hideUpgradeMenu() {
    if (this.upgradeMenu) {
      this.upgradeMenu.classList.add('hidden');
    }
    this.selectedSlot = null;
  }
  
  /**
   * Update affordability of towers based on current gold
   */
  updateAffordability() {
    if (!this.towerList) return;
    
    const types = getAllTowerTypes();
    const items = this.towerList.querySelectorAll('.tower-item');
    
    items.forEach((item, index) => {
      if (index < types.length) {
        const cost = types[index].cost;
        const isAffordable = !this.economyService || this.economyService.gold >= cost;
        
        if (isAffordable) {
          item.classList.remove('disabled');
        } else {
          item.classList.add('disabled');
        }
      }
    });
    
    // Also update upgrade button if menu is open
    if (this.selectedSlot && this.upgradeMenu && !this.upgradeMenu.classList.contains('hidden')) {
      const upgradeBtn = this.upgradeMenu.querySelector('.upgrade-btn');
      if (upgradeBtn && !upgradeBtn.disabled) {
        // Re-check affordability (this would need the current tower data)
        // For now, we'll trigger a re-render when gold changes
      }
    }
  }
  
  /**
   * Get icon emoji for tower type
   * @param {string} typeId - Tower type ID
   * @returns {string} - Emoji icon
   */
  _getTowerIcon(typeId) {
    const icons = {
      archer: '🏹',
      cannon: '💣',
      ice: '❄️',
      lightning: '⚡',
      sniper: '🎯'
    };
    return icons[typeId] || '🗼';
  }
  
  /**
   * Show the tower panel
   */
  show() {
    if (this.towerPanelContainer) {
      this.towerPanelContainer.classList.remove('hidden');
    }
    this._visible = true;
  }
  
  /**
   * Hide the tower panel
   */
  hide() {
    if (this.towerPanelContainer) {
      this.towerPanelContainer.classList.add('hidden');
    }
    this._visible = false;
  }
  
  /**
   * Check if panel is visible
   * @returns {boolean}
   */
  isVisible() {
    return this._visible;
  }
  
  /**
   * Set language for localization
   * @param {string} lang - Language code ('en' or 'ru')
   */
  setLanguage(lang) {
    this._lang = lang === 'ru' ? 'ru' : 'en';
    this._renderTowerList();
    this._updateInfo(this.selectedType);
  }
  
  /**
   * Get currently selected tower type
   * @returns {string}
   */
  getSelectedType() {
    return this.selectedType;
  }
  
  /**
   * Set economy service reference
   * @param {object} economyService - Economy service instance
   */
  setEconomyService(economyService) {
    this.economyService = economyService;
    this.updateAffordability();
  }
}
