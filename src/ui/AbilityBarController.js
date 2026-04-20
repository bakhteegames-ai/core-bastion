/**
 * Ability Bar Controller
 * Controls active abilities with cooldowns and costs
 * Updated to support Ultimate Ability System
 */

import { ULTIMATE_ABILITIES } from '../gameplay/UltimateAbilitySystem.js';

/**
 * Combined ability definitions (legacy + ultimate)
 */
export const ABILITIES = {
  // Legacy abilities (kept for backward compatibility)
  airstrike_legacy: {
    id: 'airstrike_legacy',
    name: 'Air Strike',
    nameRu: 'Авиаудар',
    cost: 100,
    cooldown: 60,
    icon: '💣',
    description: 'Deal 100 damage in area',
    descriptionRu: '100 урона по области',
    hotkey: '1'
  },
  freeze_legacy: {
    id: 'freeze_legacy',
    name: 'Freeze',
    nameRu: 'Заморозка',
    cost: 75,
    cooldown: 45,
    icon: '❄️',
    description: 'Freeze all enemies for 3s',
    descriptionRu: 'Заморозить врагов на 3 сек',
    hotkey: '2'
  },
  heal_legacy: {
    id: 'heal_legacy',
    name: 'Heal Base',
    nameRu: 'Лечение базы',
    cost: 150,
    cooldown: 90,
    icon: '❤️',
    description: 'Restore 3 base HP',
    descriptionRu: 'Восстановить 3 HP базы',
    hotkey: '3'
  },
  goldrush_legacy: {
    id: 'goldrush_legacy',
    name: 'Gold Rush',
    nameRu: 'Золотая лихорадка',
    cost: 0,
    cooldown: 120,
    icon: '💰',
    description: '2x gold for 10s',
    descriptionRu: '2x золота на 10 сек',
    hotkey: '4'
  },
  
  // NEW ULTIMATE ABILITIES - MASTERPIECE TIER
  meteor: {
    id: 'meteor',
    name: 'Meteor Shower',
    nameRu: 'Метеоритный дождь',
    cost: 250,
    cooldown: 75,
    icon: '☄️',
    description: 'Call down 5 meteors dealing area damage',
    descriptionRu: 'Вызвать 5 метеоров с уроном по области',
    hotkey: '5',
    tier: 'ultimate'
  },
  timewarp: {
    id: 'timewarp',
    name: 'Time Warp',
    nameRu: 'Искажение времени',
    cost: 175,
    cooldown: 60,
    icon: '⏰',
    description: 'Slow all enemies by 70% for 6 seconds',
    descriptionRu: 'Замедлить всех врагов на 70% на 6 секунд',
    hotkey: '6',
    tier: 'ultimate'
  },
  lightning: {
    id: 'lightning',
    name: 'Chain Lightning',
    nameRu: 'Цепная молния',
    cost: 125,
    cooldown: 35,
    icon: '⚡',
    description: 'Lightning chains through 10 enemies dealing damage',
    descriptionRu: 'Молния бьет по 10 врагам',
    hotkey: '7',
    tier: 'ultimate'
  },
  nuke: {
    id: 'nuke',
    name: 'Tactical Nuke',
    nameRu: 'Тактическая ядерка',
    cost: 500,
    cooldown: 180,
    icon: '☢️',
    description: 'INSTANTLY destroy ALL enemies on screen',
    descriptionRu: 'УНИЧТОЖИТЬ всех врагов на экране',
    hotkey: '8',
    tier: 'ultimate'
  }
};

/**
 * Ability Bar Controller class
 */
export class AbilityBarController {
  constructor(options = {}) {
    this.economyService = options.economyService;
    this.onUseAbility = options.onUseAbility || null;
    
    this.cooldowns = {};
    this._lang = 'en';
    this._visible = true;
    
    // Initialize cooldowns for all abilities
    Object.keys(ABILITIES).forEach(id => {
      this.cooldowns[id] = 0;
    });
    
    this._cacheElements();
    this._setupEventListeners();
    this._render();
  }
  
  /**
   * Cache DOM elements
   */
  _cacheElements() {
    this.bar = document.getElementById('abilities-bar');
    this.container = document.getElementById('abilities-bar-container');
  }
  
  /**
   * Setup event listeners
   */
  _setupEventListeners() {
    // Click handlers on ability slots
    this._setupSlotClickHandlers();
    
    // Keyboard shortcuts (1-8 for abilities)
    document.addEventListener('keydown', (e) => {
      const abilityKeys = {
        '1': 'airstrike_legacy',
        '2': 'freeze_legacy',
        '3': 'heal_legacy',
        '4': 'goldrush_legacy',
        '5': 'meteor',
        '6': 'timewarp',
        '7': 'lightning',
        '8': 'nuke'
      };
      
      if (abilityKeys[e.key]) {
        this.useAbility(abilityKeys[e.key]);
      }
    });
  }
  
  /**
   * Setup click handlers on ability slots
   */
  _setupSlotClickHandlers() {
    if (!this.bar) return;
    
    const slots = this.bar.querySelectorAll('.ability-slot');
    slots.forEach(slot => {
      slot.addEventListener('click', () => {
        const abilityId = slot.dataset.ability;
        if (abilityId) {
          this.useAbility(abilityId);
        }
      });
    });
  }
  
  /**
   * Render ability bar
   */
  _render() {
    if (!this.bar) return;
    
    this.bar.innerHTML = '';
    
    Object.values(ABILITIES).forEach(ability => {
      const slot = document.createElement('div');
      slot.className = 'ability-slot';
      slot.dataset.ability = ability.id;
      
      const isAffordable = !this.economyService || this.economyService.gold >= ability.cost;
      if (!isAffordable) {
        slot.classList.add('disabled');
      }
      
      slot.innerHTML = `
        <div class="ability-icon">${ability.icon}</div>
        <div class="ability-cost">${ability.cost > 0 ? ability.cost + 'g' : 'Free'}</div>
        <div class="ability-cooldown hidden">0</div>
        <div class="ability-hotkey">${ability.hotkey}</div>
        <div class="ability-tooltip">
          <div class="tooltip-name">${this._lang === 'ru' ? ability.nameRu : ability.name}</div>
          <div class="tooltip-desc">${this._lang === 'ru' ? ability.descriptionRu : ability.description}</div>
          <div class="tooltip-cooldown">${this._lang === 'ru' ? 'Кулдаун' : 'Cooldown'}: ${ability.cooldown}s</div>
        </div>
      `;
      
      this.bar.appendChild(slot);
    });
    
    // Re-setup click handlers after render
    this._setupSlotClickHandlers();
  }
  
  /**
   * Use an ability
   * @param {string} abilityId - Ability ID
   * @returns {boolean} - True if ability was used successfully
   */
  useAbility(abilityId) {
    const ability = ABILITIES[abilityId];
    if (!ability) {
      console.warn(`[AbilityBar] Unknown ability: ${abilityId}`);
      return false;
    }
    
    // Check cooldown
    if (this.cooldowns[abilityId] > 0) {
      console.log(`[AbilityBar] Ability ${abilityId} on cooldown: ${this.cooldowns[abilityId].toFixed(1)}s`);
      return false;
    }
    
    // Check cost
    if (this.economyService && this.economyService.gold < ability.cost) {
      console.log(`[AbilityBar] Not enough gold for ${abilityId}. Need ${ability.cost}, have ${this.economyService.gold}`);
      return false;
    }
    
    // Deduct gold
    if (this.economyService && ability.cost > 0) {
      this.economyService.spendGold(ability.cost);
    }
    
    // Set cooldown
    this.cooldowns[abilityId] = ability.cooldown;
    
    // Update slot display
    this._updateSlotDisplay(abilityId);
    
    // Callback
    if (this.onUseAbility) {
      this.onUseAbility(abilityId, ability);
    }
    
    console.log(`[AbilityBar] Used ability: ${abilityId}`);
    return true;
  }
  
  /**
   * Update ability cooldowns (call in game loop)
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    let anyUpdated = false;
    
    for (const id in this.cooldowns) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] -= dt;
        
        // Clamp to 0
        if (this.cooldowns[id] < 0) {
          this.cooldowns[id] = 0;
        }
        
        this._updateSlotDisplay(id);
        anyUpdated = true;
      }
    }
    
    // Update affordability display
    if (anyUpdated) {
      this.updateAffordability();
    }
  }
  
  /**
   * Update slot display for an ability
   * @param {string} abilityId - Ability ID
   */
  _updateSlotDisplay(abilityId) {
    const slot = document.querySelector(`[data-ability="${abilityId}"]`);
    if (!slot) return;
    
    const cooldownOverlay = slot.querySelector('.ability-cooldown');
    
    if (this.cooldowns[abilityId] > 0) {
      slot.classList.add('on-cooldown');
      if (cooldownOverlay) {
        cooldownOverlay.classList.remove('hidden');
        cooldownOverlay.textContent = Math.ceil(this.cooldowns[abilityId]);
      }
    } else {
      slot.classList.remove('on-cooldown');
      if (cooldownOverlay) {
        cooldownOverlay.classList.add('hidden');
      }
    }
  }
  
  /**
   * Update affordability display based on current gold
   */
  updateAffordability() {
    Object.keys(ABILITIES).forEach(abilityId => {
      const ability = ABILITIES[abilityId];
      const slot = document.querySelector(`[data-ability="${abilityId}"]`);
      
      if (slot && this.cooldowns[abilityId] <= 0) {
        const isAffordable = !this.economyService || this.economyService.gold >= ability.cost;
        
        if (isAffordable) {
          slot.classList.remove('disabled');
        } else {
          slot.classList.add('disabled');
        }
      }
    });
  }
  
  /**
   * Check if ability is ready
   * @param {string} abilityId - Ability ID
   * @returns {boolean}
   */
  isReady(abilityId) {
    return this.cooldowns[abilityId] <= 0;
  }
  
  /**
   * Get remaining cooldown for ability
   * @param {string} abilityId - Ability ID
   * @returns {number} - Remaining cooldown in seconds
   */
  getCooldown(abilityId) {
    return this.cooldowns[abilityId] || 0;
  }
  
  /**
   * Reset cooldown for ability
   * @param {string} abilityId - Ability ID
   */
  resetCooldown(abilityId) {
    this.cooldowns[abilityId] = 0;
    this._updateSlotDisplay(abilityId);
  }
  
  /**
   * Reset all cooldowns
   */
  resetAllCooldowns() {
    Object.keys(ABILITIES).forEach(id => {
      this.cooldowns[id] = 0;
      this._updateSlotDisplay(id);
    });
  }
  
  /**
   * Show ability bar
   */
  show() {
    if (this.container) {
      this.container.classList.remove('hidden');
    }
    this._visible = true;
  }
  
  /**
   * Hide ability bar
   */
  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
    }
    this._visible = false;
  }
  
  /**
   * Check if bar is visible
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
    this._render();
  }
  
  /**
   * Set economy service reference
   * @param {object} economyService - Economy service instance
   */
  setEconomyService(economyService) {
    this.economyService = economyService;
    this.updateAffordability();
  }
  
  /**
   * Get ability data by ID
   * @param {string} abilityId - Ability ID
   * @returns {object|null}
   */
  getAbility(abilityId) {
    return ABILITIES[abilityId] || null;
  }
  
  /**
   * Get all abilities
   * @returns {object}
   */
  getAllAbilities() {
    return { ...ABILITIES };
  }
}
