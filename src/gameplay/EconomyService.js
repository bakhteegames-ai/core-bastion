/**
 * EconomyService
 * Manages gold tracking for the run.
 * Task 2.1: Economy Baseline
 */
export class EconomyService {
  /**
   * @param {number} startingGold - Initial gold amount (default: 100 per §17.4)
   */
  constructor(startingGold = 100) {
    this._gold = startingGold;
    this._startingGold = startingGold;
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
   * Check if player can afford a cost.
   * @param {number} amount
   * @returns {boolean}
   */
  canAfford(amount) {
    return this._gold >= amount;
  }

  /**
   * Add gold to the current amount.
   * @param {number} amount
   */
  addGold(amount) {
    if (amount < 0) {
      console.warn('[EconomyService] Cannot add negative gold');
      return;
    }
    this._gold += amount;
    console.log(`[EconomyService] Added ${amount} gold, total: ${this._gold}`);
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
