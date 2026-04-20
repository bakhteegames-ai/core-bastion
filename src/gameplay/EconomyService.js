/**
 * EconomyService
 * Manages gold tracking for the run.
 * Task 2.1: Economy Baseline
 * Updated: Support for gold multiplier from Ultimate Ability System
 */
export class EconomyService {
  /**
   * @param {number} startingGold - Initial gold amount (default: 100 per §17.4)
   */
  constructor(startingGold = 100, options = {}) {
    this._gold = startingGold;
    this._startingGold = startingGold;
    this._goldMultiplier = 1.0;
    this.onGoldMultiplierChange = options.onGoldMultiplierChange || null;
  }

  /**
   * Get current gold amount.
   * @returns {number}
   */
  get gold() {
    return this._gold;
  }

  /**
   * Get starting gold amount.
   * @returns {number}
   */
  get startingGold() {
    return this._startingGold;
  }

  /**
   * Get current gold multiplier.
   * @returns {number}
   */
  get goldMultiplier() {
    return this._goldMultiplier;
  }

  /**
   * Set gold multiplier (from ultimate abilities).
   * @param {number} multiplier
   */
  setGoldMultiplier(multiplier) {
    const oldMultiplier = this._goldMultiplier;
    this._goldMultiplier = multiplier;
    
    if (oldMultiplier !== multiplier && this.onGoldMultiplierChange) {
      this.onGoldMultiplierChange(multiplier);
    }
    
    console.log(`[EconomyService] Gold multiplier set to ${multiplier}x`);
  }

  /**
   * Check if player can afford a cost.
   * @param {number} amount
   * @returns {boolean}
   */
  canAfford(amount) {
    return this._gold >= amount;
  }

  /**
   * Add gold to the current amount (with multiplier applied).
   * @param {number} amount - Base amount before multiplier
   * @param {boolean} applyMultiplier - Whether to apply gold multiplier
   */
  addGold(amount, applyMultiplier = true) {
    if (amount < 0) {
      console.warn('[EconomyService] Cannot add negative gold');
      return;
    }
    
    const finalAmount = applyMultiplier ? Math.floor(amount * this._goldMultiplier) : amount;
    this._gold += finalAmount;
    
    if (this._goldMultiplier !== 1.0) {
      console.log(`[EconomyService] Added ${amount}g ×${this._goldMultiplier} = ${finalAmount}g, total: ${this._gold}`);
    } else {
      console.log(`[EconomyService] Added ${finalAmount} gold, total: ${this._gold}`);
    }
  }

  /**
   * Attempt to spend gold.
   * Returns true if successful, false if insufficient funds.
   * @param {number} amount
   * @returns {boolean}
   */
  spendGold(amount) {
    if (amount < 0) {
      console.warn('[EconomyService] Cannot spend negative gold');
      return false;
    }

    if (!this.canAfford(amount)) {
      console.warn(`[EconomyService] Insufficient gold: have ${this._gold}, need ${amount}`);
      return false;
    }

    this._gold -= amount;
    console.log(`[EconomyService] Spent ${amount} gold, remaining: ${this._gold}`);
    return true;
  }

  /**
   * Reset gold to starting amount or a new amount.
   * @param {number} [newStartingGold] - Optional new starting gold
   */
  reset(newStartingGold) {
    if (newStartingGold !== undefined) {
      this._startingGold = newStartingGold;
    }
    this._gold = this._startingGold;
    this._goldMultiplier = 1.0;
    console.log(`[EconomyService] Reset to ${this._gold}`);
  }

  /**
   * Set gold to a specific amount.
   * @param {number} amount
   */
  setGold(amount) {
    this._gold = Math.max(0, amount);
  }
}
