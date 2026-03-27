/**
 * AudioService
 * Manages game audio playback using Web Audio API synthesized sounds.
 * All sounds are procedurally generated - no external audio files required.
 * 
 * License: CC0 (code-generated sounds)
 */

export class AudioService {
  constructor() {
    this._enabled = true;
    this._volume = 1.0;
    this._muted = false;
    this._previousVolume = 1.0;
    this._audioContext = null;
    this._masterGain = null;

    // Sound effect definitions
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

    console.log('[AudioService] Initialized (synthesized audio mode)');
  }

  /**
   * Initialize audio context (call after user interaction).
   */
  initContext() {
    if (this._audioContext) return;

    try {
      this._audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this._masterGain = this._audioContext.createGain();
      this._masterGain.connect(this._audioContext.destination);
      this._masterGain.gain.value = this._volume;
      console.log('[AudioService] Audio context initialized');
    } catch (e) {
      console.warn('[AudioService] Failed to initialize audio context:', e);
    }
  }

  /**
   * Play a synthesized sound effect.
   * @param {string} soundName - Name of the sound to play
   * @param {object} options - Optional parameters (volume, pitch, etc.)
   */
  play(soundName, options = {}) {
    if (!this._enabled || this._muted || !this._audioContext) return;

    const volume = (options.volume ?? 1.0) * this._volume;
    
    try {
      switch (soundName) {
        case this.SOUNDS.TOWER_FIRE:
          this._playTowerFire(volume, options.pitch);
          break;
        case this.SOUNDS.ENEMY_HIT:
          this._playEnemyHit(volume);
          break;
        case this.SOUNDS.ENEMY_DEATH:
          this._playEnemyDeath(volume);
          break;
        case this.SOUNDS.ENEMY_LEAK:
          this._playEnemyLeak(volume);
          break;
        case this.SOUNDS.WAVE_START:
          this._playWaveStart(volume);
          break;
        case this.SOUNDS.WAVE_COMPLETE:
          this._playWaveComplete(volume);
          break;
        case this.SOUNDS.BUILD_TOWER:
          this._playBuildTower(volume);
          break;
        case this.SOUNDS.DEFEAT:
          this._playDefeat(volume);
          break;
        case this.SOUNDS.BUTTON_CLICK:
          this._playButtonClick(volume);
          break;
        default:
          console.log(`[AudioService] Unknown sound: ${soundName}`);
      }
    } catch (e) {
      console.warn(`[AudioService] Error playing ${soundName}:`, e);
    }
  }

  /**
   * Tower fire - short laser/plasma shot
   */
  _playTowerFire(volume, pitch = 1.0) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    // Oscillator for the zap
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.setValueAtTime(880 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(220 * pitch, now + 0.1);
    
    // Gain envelope
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    // Filter for less harsh sound
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2000;
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
  }

  /**
   * Enemy hit - quick impact sound
   */
  _playEnemyHit(volume) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    // Noise burst
    const bufferSize = ctx.sampleRate * 0.05;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1500;
    filter.Q.value = 1;
    
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    
    noise.start(now);
  }

  /**
   * Enemy death - descending zap
   */
  _playEnemyDeath(volume) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.3);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this._masterGain);
    
    osc.start(now);
    osc.stop(now + 0.3);
  }

  /**
   * Enemy leak - base damage alarm
   */
  _playEnemyLeak(volume) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    // Two-tone alarm
    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = i === 0 ? 400 : 300;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.15);
      
      osc.connect(gain);
      gain.connect(this._masterGain);
      
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.15);
    }
  }

  /**
   * Wave start - ascending fanfare
   */
  _playWaveStart(volume) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    const notes = [440, 554, 659, 880]; // A4, C#5, E5, A5
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(volume * 0.3, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.08 + 0.2);
      
      osc.connect(gain);
      gain.connect(this._masterGain);
      
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.2);
    });
  }

  /**
   * Wave complete - victory chime
   */
  _playWaveComplete(volume) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6 - C major chord spread
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.05);
      gain.gain.linearRampToValueAtTime(volume * 0.25, now + i * 0.05 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.05 + 0.4);
      
      osc.connect(gain);
      gain.connect(this._masterGain);
      
      osc.start(now + i * 0.05);
      osc.stop(now + i * 0.05 + 0.4);
    });
  }

  /**
   * Build tower - mechanical placement
   */
  _playBuildTower(volume) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    // Click/thud
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    osc.connect(gain);
    gain.connect(this._masterGain);
    
    osc.start(now);
    osc.stop(now + 0.1);
    
    // Add a higher click
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.value = 1000;
    
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(volume * 0.2, now);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.02);
    
    osc2.connect(gain2);
    gain2.connect(this._masterGain);
    
    osc2.start(now);
    osc2.stop(now + 0.02);
  }

  /**
   * Defeat - descending sad trombone effect
   */
  _playDefeat(volume) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    // Descending notes
    const notes = [392, 349, 330, 294, 262]; // G4, F4, E4, D4, C4
    
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(volume * 0.4, now + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
      
      osc.connect(gain);
      gain.connect(this._masterGain);
      
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  }

  /**
   * Button click - UI feedback
   */
  _playButtonClick(volume) {
    const ctx = this._audioContext;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;
    
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
    
    osc.connect(gain);
    gain.connect(this._masterGain);
    
    osc.start(now);
    osc.stop(now + 0.05);
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
   */
  mute() {
    if (!this._muted) {
      this._previousVolume = this._volume;
      this._muted = true;
      if (this._masterGain) {
        this._masterGain.gain.value = 0;
      }
      console.log('[AudioService] Audio muted');
    }
  }

  /**
   * Unmute audio (after ad playback).
   */
  unmute() {
    if (this._muted) {
      this._muted = false;
      this._volume = this._previousVolume;
      if (this._masterGain) {
        this._masterGain.gain.value = this._volume;
      }
      console.log('[AudioService] Audio unmuted');
    }
  }

  /**
   * Check if audio is muted.
   */
  get isMuted() {
    return this._muted;
  }

  /**
   * Set master volume.
   */
  setVolume(volume) {
    this._volume = Math.max(0, Math.min(1, volume));
    if (this._masterGain && !this._muted) {
      this._masterGain.gain.value = this._volume;
    }
    console.log(`[AudioService] Volume set to: ${this._volume.toFixed(2)}`);
  }

  /**
   * Get master volume.
   */
  get volume() {
    return this._volume;
  }

  /**
   * Enable or disable audio.
   */
  setEnabled(enabled) {
    this._enabled = enabled;
    console.log(`[AudioService] Audio ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Check if audio is enabled.
   */
  get enabled() {
    return this._enabled;
  }

  /**
   * Stop all sounds.
   */
  stopAll() {
    console.log('[AudioService] Stopping all sounds');
    // Synthesized sounds stop automatically
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
      this._masterGain = null;
    }
    console.log('[AudioService] Destroyed');
  }
}
