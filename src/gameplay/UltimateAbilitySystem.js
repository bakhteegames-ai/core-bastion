/**
 * Ultimate Ability System
 * Advanced ability system with VFX integration and gameplay effects
 * Task: Create masterpiece-level ultimate abilities
 */

import { ABILITIES } from '../ui/AbilityBarController.js';

/**
 * Ultimate Ability definitions with enhanced effects
 */
export const ULTIMATE_ABILITIES = {
  airstrike: {
    id: 'airstrike',
    name: 'Air Strike',
    nameRu: 'Авиаудар',
    cost: 150,
    cooldown: 45,
    icon: '💣',
    description: 'Deal massive damage in target area',
    descriptionRu: 'Массивный урон по области',
    hotkey: '1',
    
    // Gameplay parameters
    damage: 150,
    radius: 4.0,
    duration: 0.5,
    
    // VFX parameters
    vfx: {
      type: 'explosion',
      particleCount: 50,
      color: [1.0, 0.4, 0.1, 1.0],
      scale: 3.0,
      duration: 1.5
    },
    
    // Audio
    sound: 'explosion_large'
  },
  
  freeze: {
    id: 'freeze',
    name: 'Absolute Zero',
    nameRu: 'Абсолютный ноль',
    cost: 100,
    cooldown: 40,
    icon: '❄️',
    description: 'Freeze ALL enemies for 4 seconds',
    descriptionRu: 'Заморозить ВСЕХ врагов на 4 секунды',
    hotkey: '2',
    
    // Gameplay parameters
    freezeDuration: 4.0,
    slowFactor: 0.0, // Complete freeze
    
    // VFX parameters
    vfx: {
      type: 'freeze_wave',
      particleCount: 100,
      color: [0.2, 0.6, 1.0, 1.0],
      scale: 5.0,
      duration: 2.0
    },
    
    // Audio
    sound: 'ice_shatter'
  },
  
  heal: {
    id: 'heal',
    name: 'Divine Shield',
    nameRu: 'Божественный щит',
    cost: 200,
    cooldown: 60,
    icon: '🛡️',
    description: 'Restore 5 base HP and grant temporary shield',
    descriptionRu: 'Восстановить 5 HP базы и дать временный щит',
    hotkey: '3',
    
    // Gameplay parameters
    healAmount: 5,
    shieldAmount: 3,
    shieldDuration: 10.0,
    
    // VFX parameters
    vfx: {
      type: 'healing_aura',
      particleCount: 30,
      color: [0.2, 1.0, 0.4, 1.0],
      scale: 2.5,
      duration: 2.0
    },
    
    // Audio
    sound: 'holy_light'
  },
  
  goldrush: {
    id: 'goldrush',
    name: 'Midas Touch',
    nameRu: 'Прикосновение Мидаса',
    cost: 0,
    cooldown: 90,
    icon: '👑',
    description: '2x gold from kills for 15 seconds',
    descriptionRu: '2x золота за убийства на 15 секунд',
    hotkey: '4',
    
    // Gameplay parameters
    multiplier: 2.0,
    duration: 15.0,
    
    // VFX parameters
    vfx: {
      type: 'golden_aura',
      particleCount: 40,
      color: [1.0, 0.85, 0.0, 1.0],
      scale: 3.0,
      duration: 1.0
    },
    
    // Audio
    sound: 'coins_rain'
  },
  
  // NEW MASTERPIECE ABILITIES
  
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
    
    // Gameplay parameters
    meteorCount: 5,
    damage: 80,
    radius: 3.0,
    delayBetweenMeteors: 0.3,
    
    // VFX parameters
    vfx: {
      type: 'meteor_storm',
      particleCount: 80,
      color: [1.0, 0.3, 0.0, 1.0],
      scale: 2.0,
      duration: 3.0
    },
    
    // Audio
    sound: 'meteor_impact'
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
    
    // Gameplay parameters
    slowFactor: 0.3, // 70% slow
    duration: 6.0,
    
    // VFX parameters
    vfx: {
      type: 'time_distortion',
      particleCount: 60,
      color: [0.6, 0.2, 1.0, 1.0],
      scale: 4.0,
      duration: 1.5
    },
    
    // Audio
    sound: 'time_warp'
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
    
    // Gameplay parameters
    damage: 60,
    chainCount: 10,
    chainRadius: 5.0,
    
    // VFX parameters
    vfx: {
      type: 'lightning_chain',
      particleCount: 40,
      color: [0.4, 0.8, 1.0, 1.0],
      scale: 1.5,
      duration: 2.0
    },
    
    // Audio
    sound: 'lightning_strike'
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
    
    // Gameplay parameters
    damage: 9999, // Insta-kill
    radius: 999, // Global
    
    // VFX parameters
    vfx: {
      type: 'nuclear_explosion',
      particleCount: 200,
      color: [1.0, 0.9, 0.2, 1.0],
      scale: 10.0,
      duration: 4.0
    },
    
    // Audio
    sound: 'nuke_detonation'
  }
};

/**
 * Active ability effects tracking
 */
export class ActiveAbilityEffects {
  constructor() {
    this.activeEffects = new Map();
  }
  
  /**
   * Add an active effect
   */
  addEffect(effectId, data) {
    this.activeEffects.set(effectId, {
      ...data,
      startTime: Date.now(),
      remainingDuration: data.duration
    });
  }
  
  /**
   * Remove an effect
   */
  removeEffect(effectId) {
    this.activeEffects.delete(effectId);
  }
  
  /**
   * Get all active effects
   */
  getActiveEffects() {
    return Array.from(this.activeEffects.values());
  }
  
  /**
   * Check if specific effect is active
   */
  hasEffect(effectId) {
    return this.activeEffects.has(effectId);
  }
  
  /**
   * Update effects
   */
  update(dt) {
    for (const [effectId, effect] of this.activeEffects) {
      effect.remainingDuration -= dt;
      if (effect.remainingDuration <= 0) {
        this.activeEffects.delete(effectId);
      }
    }
  }
  
  /**
   * Clear all effects
   */
  clear() {
    this.activeEffects.clear();
  }
}

/**
 * Ultimate Ability System Core
 */
export class UltimateAbilitySystem {
  constructor(options = {}) {
    this.app = options.app;
    this.waveManager = options.waveManager;
    this.economyService = options.economyService;
    this.vfxController = options.vfxController;
    this.audioService = options.audioService;
    this.baseHealth = options.baseHealth;
    
    this.cooldowns = {};
    this.activeEffects = new ActiveAbilityEffects();
    this.goldMultiplier = 1.0;
    this.goldMultiplierTimer = 0;
    
    // Initialize cooldowns
    Object.keys(ULTIMATE_ABILITIES).forEach(id => {
      this.cooldowns[id] = 0;
    });
    
    // Callbacks
    this.onAbilityUsed = options.onAbilityUsed || null;
    this.onEffectExpired = options.onEffectExpired || null;
  }
  
  /**
   * Use an ultimate ability
   */
  useAbility(abilityId, targetPosition = null) {
    const ability = ULTIMATE_ABILITIES[abilityId];
    if (!ability) {
      console.warn(`[UltimateSystem] Unknown ability: ${abilityId}`);
      return { success: false, reason: 'unknown_ability' };
    }
    
    // Check cooldown
    if (this.cooldowns[abilityId] > 0) {
      return { success: false, reason: 'on_cooldown', remaining: this.cooldowns[abilityId] };
    }
    
    // Check cost
    if (this.economyService && ability.cost > 0 && this.economyService.gold < ability.cost) {
      return { success: false, reason: 'not_enough_gold', required: ability.cost, have: this.economyService.gold };
    }
    
    // Deduct gold
    if (this.economyService && ability.cost > 0) {
      this.economyService.spendGold(ability.cost);
    }
    
    // Set cooldown
    this.cooldowns[abilityId] = ability.cooldown;
    
    // Execute ability effect
    this._executeAbility(ability, targetPosition);
    
    // Play VFX
    if (this.vfxController && ability.vfx) {
      this._playAbilityVFX(ability, targetPosition);
    }
    
    // Play sound
    if (this.audioService && ability.sound) {
      this.audioService.playSound(ability.sound);
    }
    
    // Callback
    if (this.onAbilityUsed) {
      this.onAbilityUsed(abilityId, ability);
    }
    
    console.log(`[UltimateSystem] Used ultimate: ${abilityId}`);
    return { success: true, ability };
  }
  
  /**
   * Execute ability gameplay effect
   */
  _executeAbility(ability, targetPosition) {
    switch (ability.id) {
      case 'airstrike':
        this._executeAirstrike(ability, targetPosition);
        break;
      case 'freeze':
        this._executeFreeze(ability);
        break;
      case 'heal':
        this._executeHeal(ability);
        break;
      case 'goldrush':
        this._executeGoldRush(ability);
        break;
      case 'meteor':
        this._executeMeteor(ability, targetPosition);
        break;
      case 'timewarp':
        this._executeTimeWarp(ability);
        break;
      case 'lightning':
        this._executeLightning(ability);
        break;
      case 'nuke':
        this._executeNuke(ability);
        break;
    }
  }
  
  /**
   * Air Strike - Area damage
   */
  _executeAirstrike(ability, position) {
    if (!this.waveManager) return;
    
    const targetPos = position || this._getCenterOfMass();
    const killed = this.waveManager.dealDamageInRadius(targetPos, ability.radius, ability.damage);
    console.log(`[UltimateSystem] Air Strike hit, killed: ${killed}`);
  }
  
  /**
   * Freeze - Freeze all enemies
   */
  _executeFreeze(ability) {
    if (!this.waveManager) return;
    
    const frozen = this.waveManager.applySlowInRadius(
      { x: 0, y: 0, z: 0 }, // Center doesn't matter for global
      9999, // Global
      ability.slowFactor,
      ability.freezeDuration
    );
    
    this.activeEffects.addEffect('freeze', {
      duration: ability.freezeDuration,
      affectedCount: frozen
    });
    
    console.log(`[UltimateSystem] Freeze hit ${frozen} enemies`);
  }
  
  /**
   * Heal - Restore base HP + shield
   */
  _executeHeal(ability) {
    if (!this.baseHealth) return;
    
    // Heal
    this.baseHealth.heal(ability.healAmount);
    
    // Add shield
    if (ability.shieldAmount > 0) {
      this.baseHealth.addShield(ability.shieldAmount, ability.shieldDuration);
    }
    
    this.activeEffects.addEffect('shield', {
      amount: ability.shieldAmount,
      duration: ability.shieldDuration
    });
    
    console.log(`[UltimateSystem] Healed ${ability.healAmount} HP, shield: ${ability.shieldAmount}`);
  }
  
  /**
   * Gold Rush - Double gold
   */
  _executeGoldRush(ability) {
    this.goldMultiplier = ability.multiplier;
    this.goldMultiplierTimer = ability.duration;
    
    this.activeEffects.addEffect('goldrush', {
      multiplier: ability.multiplier,
      duration: ability.duration
    });
    
    console.log(`[UltimateSystem] Gold rush activated: ${ability.multiplier}x for ${ability.duration}s`);
  }
  
  /**
   * Meteor Shower - Multiple area damages
   */
  _executeMeteor(ability, position) {
    if (!this.waveManager) return;
    
    const centerPos = position || this._getCenterOfMass();
    let totalKilled = 0;
    
    for (let i = 0; i < ability.meteorCount; i++) {
      setTimeout(() => {
        const offset = {
          x: (Math.random() - 0.5) * 10,
          y: 0,
          z: (Math.random() - 0.5) * 10
        };
        const targetPos = {
          x: centerPos.x + offset.x,
          y: centerPos.y,
          z: centerPos.z + offset.z
        };
        
        const killed = this.waveManager.dealDamageInRadius(targetPos, ability.radius, ability.damage);
        totalKilled += killed;
        
        if (this.vfxController) {
          this._playMeteorVFX(targetPos);
        }
      }, i * ability.delayBetweenMeteors * 1000);
    }
    
    console.log(`[UltimateSystem] Meteor shower launched: ${ability.meteorCount} meteors`);
  }
  
  /**
   * Time Warp - Slow all enemies
   */
  _executeTimeWarp(ability) {
    if (!this.waveManager) return;
    
    const slowed = this.waveManager.applySlowInRadius(
      { x: 0, y: 0, z: 0 },
      9999,
      ability.slowFactor,
      ability.duration
    );
    
    this.activeEffects.addEffect('timewarp', {
      slowFactor: ability.slowFactor,
      duration: ability.duration,
      affectedCount: slowed
    });
    
    console.log(`[UltimateSystem] Time warp slowed ${slowed} enemies`);
  }
  
  /**
   * Chain Lightning - Damage chains through enemies
   */
  _executeLightning(ability) {
    if (!this.waveManager) return;
    
    const enemies = this.waveManager.getActiveEnemies();
    if (enemies.length === 0) return;
    
    // Sort by distance to find first target
    const sorted = [...enemies].sort((a, b) => {
      const distA = a.getPosition().length();
      const distB = b.getPosition().length();
      return distA - distB;
    });
    
    let currentTarget = sorted[0];
    let chainCount = 0;
    const visited = new Set();
    
    while (currentTarget && chainCount < ability.chainCount) {
      const enemyId = currentTarget.getEntityId();
      if (visited.has(enemyId)) break;
      
      visited.add(enemyId);
      currentTarget.takeDamage(ability.damage);
      chainCount++;
      
      // Find next target in chain
      const currentPos = currentTarget.getPosition();
      let nearestDist = Infinity;
      let nearestEnemy = null;
      
      for (const enemy of sorted) {
        if (visited.has(enemy.getEntityId())) continue;
        
        const dist = this._distance(currentPos, enemy.getPosition());
        if (dist < ability.chainRadius && dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }
      
      currentTarget = nearestEnemy;
    }
    
    console.log(`[UltimateSystem] Chain lightning hit ${chainCount} enemies`);
  }
  
  /**
   * Nuke - Kill everything
   */
  _executeNuke(ability) {
    if (!this.waveManager) return;
    
    const killed = this.waveManager.dealDamageInRadius(
      { x: 0, y: 0, z: 0 },
      ability.radius,
      ability.damage
    );
    
    console.log(`[UltimateSystem] NUKED ${killed} enemies!`);
  }
  
  /**
   * Play ability VFX
   */
  _playAbilityVFX(ability, position) {
    if (!this.vfxController) return;
    
    const vfxData = ability.vfx;
    const targetPos = position || { x: 0, y: 0, z: 0 };
    
    this.vfxController.spawnEffect(vfxData.type, {
      position: targetPos,
      particleCount: vfxData.particleCount,
      color: vfxData.color,
      scale: vfxData.scale,
      duration: vfxData.duration
    });
  }
  
  /**
   * Play meteor VFX
   */
  _playMeteorVFX(position) {
    if (!this.vfxController) return;
    
    this.vfxController.spawnEffect('explosion', {
      position: position,
      particleCount: 30,
      color: [1.0, 0.5, 0.0, 1.0],
      scale: 2.0,
      duration: 1.0
    });
  }
  
  /**
   * Get center of mass of all enemies
   */
  _getCenterOfMass() {
    if (!this.waveManager) return { x: 0, y: 0, z: 0 };
    
    const enemies = this.waveManager.getActiveEnemies();
    if (enemies.length === 0) return { x: 0, y: 0, z: 0 };
    
    let sumX = 0, sumZ = 0;
    for (const enemy of enemies) {
      const pos = enemy.getPosition();
      sumX += pos.x;
      sumZ += pos.z;
    }
    
    return {
      x: sumX / enemies.length,
      y: 0,
      z: sumZ / enemies.length
    };
  }
  
  /**
   * Calculate distance between two points
   */
  _distance(a, b) {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
  
  /**
   * Update system (call in game loop)
   */
  update(dt) {
    // Update cooldowns
    for (const id in this.cooldowns) {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] -= dt;
        if (this.cooldowns[id] < 0) {
          this.cooldowns[id] = 0;
        }
      }
    }
    
    // Update active effects
    this.activeEffects.update(dt);
    
    // Update gold multiplier
    if (this.goldMultiplier > 1.0) {
      this.goldMultiplierTimer -= dt;
      if (this.goldMultiplierTimer <= 0) {
        this.goldMultiplier = 1.0;
        console.log('[UltimateSystem] Gold multiplier expired');
      }
    }
  }
  
  /**
   * Get gold multiplier (for economy service)
   */
  getGoldMultiplier() {
    return this.goldMultiplier;
  }
  
  /**
   * Check if ability is ready
   */
  isReady(abilityId) {
    return this.cooldowns[abilityId] <= 0;
  }
  
  /**
   * Get remaining cooldown
   */
  getCooldown(abilityId) {
    return this.cooldowns[abilityId] || 0;
  }
  
  /**
   * Get ability data
   */
  getAbility(abilityId) {
    return ULTIMATE_ABILITIES[abilityId] || null;
  }
  
  /**
   * Get all abilities
   */
  getAllAbilities() {
    return { ...ULTIMATE_ABILITIES };
  }
  
  /**
   * Get active effects
   */
  getActiveEffects() {
    return this.activeEffects.getActiveEffects();
  }
  
  /**
   * Reset system
   */
  reset() {
    Object.keys(this.cooldowns).forEach(id => {
      this.cooldowns[id] = 0;
    });
    this.activeEffects.clear();
    this.goldMultiplier = 1.0;
    this.goldMultiplierTimer = 0;
  }
}
