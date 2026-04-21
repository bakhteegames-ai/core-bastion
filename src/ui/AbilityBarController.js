/**
 * Ability Bar Controller
 * Controls active abilities with cooldowns and costs.
 * Runtime-safe version: only exposes abilities that are actually wired in GameBootstrap.
 */

/**
 * Gameplay-wired ability definitions.
 * Keep ids aligned with GameBootstrap._onUseAbility switch cases.
 */
export const ABILITIES = {
  airstrike: {
    id: 'airstrike',
    name: 'Air Strike',
    nameRu: 'Авиаудар',
    cost: 100,
    cooldown: 60,
    icon: '💣',
    description: 'Deal 50 damage to all enemies',
    descriptionRu: 'Нанести 50 урона всем врагам',
    hotkey: '1'
  },
  freeze: {
    id: 'freeze',
    name: 'Freeze',
    nameRu: 'Заморозка',
    cost: 75,
    cooldown: 45,
    icon: '❄️',
    description: 'Slow all enemies for 3s',
    descriptionRu: 'Замедлить всех врагов на 3 сек',
    hotkey: '2'
  },
  heal: {
    id: 'heal',
    name: 'Heal Base',
    nameRu: 'Лечение базы',
    cost: 150,
    cooldown: 90,
    icon: '❤️',
    description: 'Restore 3 base HP',
    descriptionRu: 'Восстановить 3 HP базы',
    hotkey: '3'
  },
  goldrush: {
    id: 'goldrush',
    name: 'Gold Rush',
    nameRu: 'Золотая лихорадка',
    cost: 0,
    cooldown: 120,
    icon: '💰',
    description: '2x gold for 10s',
    descriptionRu: '2x золота на 10 сек',
    hotkey: '4'
  }
};

export class AbilityBarController {
  constructor(options = {}) {
    this.economyService = options.economyService;
    this.onUseAbility = options.onUseAbility || null;

    this.cooldowns = {};
    this._lang = 'en';
    this._visible = true;

    Object.keys(ABILITIES).forEach(id => {
      this.cooldowns[id] = 0;
    });

    this._cacheElements();
    this._setupEventListeners();
    this._render();
  }

  _cacheElements() {
    this.bar = document.getElementById('abilities-bar');
    this.container = document.getElementById('abilities-bar-container');
  }

  _setupEventListeners() {
    this._setupSlotClickHandlers();

    document.addEventListener('keydown', (e) => {
      const abilityKeys = {
        '1': 'airstrike',
        '2': 'freeze',
        '3': 'heal',
        '4': 'goldrush'
      };

      if (abilityKeys[e.key]) {
        this.useAbility(abilityKeys[e.key]);
      }
    });
  }

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

    this._setupSlotClickHandlers();
  }

  /**
   * Use an ability.
   * Cost is validated here, but the actual gold spend is delegated to GameBootstrap.
   */
  useAbility(abilityId) {
    const ability = ABILITIES[abilityId];
    if (!ability) {
      console.warn(`[AbilityBar] Unknown ability: ${abilityId}`);
      return false;
    }

    if (this.cooldowns[abilityId] > 0) {
      console.log(`[AbilityBar] Ability ${abilityId} on cooldown: ${this.cooldowns[abilityId].toFixed(1)}s`);
      return false;
    }

    if (this.economyService && this.economyService.gold < ability.cost) {
      console.log(`[AbilityBar] Not enough gold for ${abilityId}. Need ${ability.cost}, have ${this.economyService.gold}`);
      return false;
    }

    let used = true;
    if (this.onUseAbility) {
      used = this.onUseAbility(abilityId, ability) !== false;
    }

    if (!used) {
      return false;
    }

    this.cooldowns[abilityId] = ability.cooldown;
    this._updateSlotDisplay(abilityId);
    this.updateAffordability();

    console.log(`[AbilityBar] Used ability: ${abilityId}`);
    return true;
  }

  update(dt) {
    let anyUpdated = false;

    for (const id in this.cooldowns) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] -= dt;
        if (this.cooldowns[id] < 0) {
          this.cooldowns[id] = 0;
        }
        this._updateSlotDisplay(id);
        anyUpdated = true;
      }
    }

    if (anyUpdated) {
      this.updateAffordability();
    }
  }

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

  isReady(abilityId) {
    return this.cooldowns[abilityId] <= 0;
  }

  getCooldown(abilityId) {
    return this.cooldowns[abilityId] || 0;
  }

  resetCooldown(abilityId) {
    this.cooldowns[abilityId] = 0;
    this._updateSlotDisplay(abilityId);
  }

  resetAllCooldowns() {
    Object.keys(ABILITIES).forEach(id => {
      this.cooldowns[id] = 0;
      this._updateSlotDisplay(id);
    });
  }

  show() {
    if (this.container) {
      this.container.classList.remove('hidden');
    }
    this._visible = true;
  }

  hide() {
    if (this.container) {
      this.container.classList.add('hidden');
    }
    this._visible = false;
  }

  isVisible() {
    return this._visible;
  }

  setLanguage(lang) {
    this._lang = lang === 'ru' ? 'ru' : 'en';
    this._render();
  }

  setEconomyService(economyService) {
    this.economyService = economyService;
    this.updateAffordability();
  }

  getAbility(abilityId) {
    return ABILITIES[abilityId] || null;
  }

  getAllAbilities() {
    return { ...ABILITIES };
  }
}
