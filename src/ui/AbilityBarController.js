import { ABILITIES } from '../data/abilities.js';

/**
 * Ability Bar Controller
 * Controls shipped active abilities with cooldowns and costs.
 */
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

  useAbility(abilityId) {
    const ability = ABILITIES[abilityId];
    if (!ability) {
      console.warn(`[AbilityBar] Unknown ability: ${abilityId}`);
      return false;
    }

    if (this.cooldowns[abilityId] > 0) {
      return false;
    }

    if (this.economyService && this.economyService.gold < ability.cost) {
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
        if (isAffordable) slot.classList.remove('disabled');
        else slot.classList.add('disabled');
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
    if (this.container) this.container.classList.remove('hidden');
    this._visible = true;
  }

  hide() {
    if (this.container) this.container.classList.add('hidden');
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
