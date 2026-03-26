/**
 * AudioService
 * Manages game audio playback.
 * Task 5.2: Audio Placeholders
 * 
 * Note: This is a stub implementation for MVP.
 * Audio files are not included - only the service structure.
 */

export class AudioService {
  constructor() {
    this._enabled = true;
    this._volume = 1.0;
    this._muted = false;
    this._previousVolume = 1.0;
    this._audioContext = null;

    // Sound effect names
    this.SOUNDS = {
      TOWER_FIRE: 'tower_fire',
      ENEMY_HIT: 'enemy_hit',
      ENEMY_DEATH: 'enemy_death',
      ENEMY_LEAK: 'enemy_leak',
      WAVE_START: 'wave_start',
      WAVE_COMPLETE: 'wave_complete',
      BUILD_TOWER: 'build_tower',
      DEFEAT: 'defeat',
      UPGRADE: 'upgrade',
      BUTTON_CLICK: 'button_click'
    };

    console.log('[AudioService] Initialized (stub mode)');
  }

  /**
   * Initialize audio context (call after user interaction).
   */
  initContext() {
    if (this._audioContext) return;

    try {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('[AudioService] Audio context initialized');
    } catch (e) {
      console.warn('[AudioService] Failed to initialize audio context:', e);
    }
  }

  /**
   * Play a sound effect.
   * @param {string} soundName - Name of the sound to play
   * @param {object} options - Optional parameters (volume, pitch, etc.)
   */
  play(soundName, options = {}) {
    if (!this._enabled || this._muted) return;

    // Stub: just log the sound play
    const volume = options.volume ?? 1.0;
    console.log(`[AudioService] Playing: ${soundName} (volume: ${volume.toFixed(2)})`);

    // In a real implementation, this would:
    // 1. Load the audio file
    // 2. Create an audio buffer source
    // 3. Connect to gain node
    // 4. Start playback
  }

  /**
   * Play tower fire sound.
   */
  playTowerFire() {
    this.play(this.SOUNDS.TOWER_FIRE, { volume: 0.3 });
  }

  /**
   * Play enemy hit sound.
   */
  playEnemyHit() {
    this.play(this.SOUNDS.ENEMY_HIT, { volume: 0.4 });
  }

  /**
   * Play enemy death sound.
   */
  playEnemyDeath() {
    this.play(this.SOUNDS.ENEMY_DEATH, { volume: 0.5 });
  }

  /**
   * Play enemy leak (base damage) sound.
   */
  playEnemyLeak() {
    this.play(this.SOUNDS.ENEMY_LEAK, { volume: 0.6 });
  }

  /**
   * Play wave start sound.
   */
  playWaveStart() {
    this.play(this.SOUNDS.WAVE_START, { volume: 0.7 });
  }

  /**
   * Play wave complete sound.
   */
  playWaveComplete() {
    this.play(this.SOUNDS.WAVE_COMPLETE, { volume: 0.6 });
  }

  /**
   * Play tower build sound.
   */
  playBuildTower() {
    this.play(this.SOUNDS.BUILD_TOWER, { volume: 0.5 });
  }

  /**
   * Play defeat sound.
   */
  playDefeat() {
    this.play(this.SOUNDS.DEFEAT, { volume: 0.8 });
  }

  /**
   * Play button click sound.
   */
  playButtonClick() {
    this.play(this.SOUNDS.BUTTON_CLICK, { volume: 0.3 });
  }

  /**
   * Mute all audio (for ad playback).
   * Saves current volume for restoration.
   */
  mute() {
    if (!this._muted) {
      this._previousVolume = this._volume;
      this._muted = true;
      console.log('[AudioService] Audio muted');
    }
  }

  /**
   * Unmute audio (after ad playback).
   * Restores previous volume.
   */
  unmute() {
    if (this._muted) {
      this._muted = false;
      this._volume = this._previousVolume;
      console.log('[AudioService] Audio unmuted');
    }
  }

  /**
   * Check if audio is muted.
   * @returns {boolean}
   */
  get isMuted() {
    return this._muted;
  }

  /**
   * Set master volume.
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    this._volume = Math.max(0, Math.min(1, volume));
    console.log(`[AudioService] Volume set to: ${this._volume.toFixed(2)}`);
  }

  /**
   * Get master volume.
   * @returns {number}
   */
  get volume() {
    return this._volume;
  }

  /**
   * Enable or disable audio.
   * @param {boolean} enabled
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    console.log(`[AudioService] Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if audio is enabled.
   * @returns {boolean}
   */
  get enabled() {
    return this._enabled;
  }

  /**
   * Stop all sounds.
   */
  stopAll() {
    console.log('[AudioService] Stopping all sounds');
    // Stub: no-op
  }

  /**
   * Pause audio context (for ad playback).
   */
  pause() {
    if (this._audioContext && this._audioContext.state === 'running') {
      this._audioContext.suspend();
      console.log('[AudioService] Audio context paused');
    }
  }

  /**
   * Resume audio context (after ad playback).
   */
  resume() {
    if (this._audioContext && this._audioContext.state === 'suspended') {
      this._audioContext.resume();
      console.log('[AudioService] Audio context resumed');
    }
  }

  /**
   * Cleanup audio resources.
   */
  destroy() {
    if (this._audioContext) {
      this._audioContext.close();
      this._audioContext = null;
    }
    console.log('[AudioService] Destroyed');
  }
}
