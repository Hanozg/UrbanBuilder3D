import { PlaceableType, RoadStyle, TimeOfDay, VehicleType } from '../types/sandbox';

export type GroundSurfaceKind =
  | 'asphalt'
  | 'sidewalkPath'
  | 'ancientStone'
  | 'cobblestone'
  | 'dirtRoad'
  | 'sand'
  | 'wood'
  | 'water'
  | 'grass';

export interface AmbienceFrameInput {
  dt: number;
  timeOfDay: TimeOfDay;
  seaProximity: number; // 0..1 (1 = right on sea/shore)
  fountainProximity: number; // 0..1 (1 = right next to fountain/pool)
  altitudeM: number; // listener height in meters
  windBoost: number; // 0..1 extra wind when flying/driving fast
}

export interface VehicleAudioInput {
  dt: number;
  type: VehicleType | null;
  speed: number; // m/s signed
  throttle: number; // -1..1
  altitudeM: number;
  handbrake: boolean;
  surface: GroundSurfaceKind;
}

/**
 * 100% Procedural Web Audio API Sound Engine for Agora Studio.
 * Zero external audio files — synthesizes realistic surface footsteps, distinct vehicle engines
 * & hoofbeats, road tire rumble, spatial sea waves, fountain water, birds/crickets, and UI/quest SFX.
 */
export class ProceduralSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;

  private whiteNoiseBuf: AudioBuffer | null = null;
  private pinkNoiseBuf: AudioBuffer | null = null;
  private brownNoiseBuf: AudioBuffer | null = null;

  private muted = false;
  private volume = 0.72;
  private unlocked = false;
  private disposed = false;

  // Persistent Ambient Loops
  private windGain: GainNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private seaGain: GainNode | null = null;
  private seaFilter: BiquadFilterNode | null = null;
  private fountainGain: GainNode | null = null;
  private fountainFilter: BiquadFilterNode | null = null;
  private ambientPhase = 0;
  private wildlifeTimer = 1.6;

  // Persistent Vehicle Continuous Synth Nodes
  private activeVehType: VehicleType | null = null;
  private vehMasterGain: GainNode | null = null;
  private engineOscA: OscillatorNode | null = null;
  private engineOscB: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;
  private propLfo: OscillatorNode | null = null;
  private propLfoGain: GainNode | null = null;
  private tireNoiseGain: GainNode | null = null;
  private tireNoiseFilter: BiquadFilterNode | null = null;
  private skidGain: GainNode | null = null;
  private skidFilter: BiquadFilterNode | null = null;
  private hoofPhase = 0;
  private wheelCreakTimer = 0;

  public isMuted(): boolean {
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setMuted(next: boolean) {
    this.muted = next;
    this.applyMasterGain();
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (!this.muted) {
      this.unlock();
    }
    this.applyMasterGain();
    return this.muted;
  }

  public setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.volume > 0 && this.muted) {
      this.muted = false;
    }
    this.applyMasterGain();
  }

  /**
   * Call inside any pointerdown/keydown gesture to unlock Web Audio safely without browser warnings.
   */
  public unlock() {
    if (this.disposed) return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      try {
        this.ctx = new AudioCtx();
      } catch {
        return;
      }

      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.value = -14;
      this.compressor.knee.value = 18;
      this.compressor.ratio.value = 4;
      this.compressor.attack.value = 0.004;
      this.compressor.release.value = 0.14;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume;

      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.ctx.destination);

      this.buildNoiseBuffers(this.ctx);
      this.startAmbientLoops(this.ctx);
      this.startVehicleSynthBed(this.ctx);
      this.unlocked = true;
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  private applyMasterGain() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const target = this.muted ? 0 : this.volume;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(target, now, 0.04);
  }

  private buildNoiseBuffers(ctx: AudioContext) {
    const length = ctx.sampleRate * 2;

    // White noise
    const white = ctx.createBuffer(1, length, ctx.sampleRate);
    const wData = white.getChannelData(0);
    for (let i = 0; i < length; i++) {
      wData[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuf = white;

    // Pink noise (Voss-McCartney approximation — warm natural rushing sound)
    const pink = ctx.createBuffer(1, length, ctx.sampleRate);
    const pData = pink.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const wn = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + wn * 0.0555179;
      b1 = 0.99332 * b1 + wn * 0.0750759;
      b2 = 0.96900 * b2 + wn * 0.1538520;
      b3 = 0.86650 * b3 + wn * 0.3104856;
      b4 = 0.55000 * b4 + wn * 0.5329522;
      b5 = -0.7616 * b5 - wn * 0.0168980;
      pData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + wn * 0.5362) * 0.11;
      b6 = wn * 0.115926;
    }
    this.pinkNoiseBuf = pink;

    // Brown noise (deep warm surf, wind & road rumble)
    const brown = ctx.createBuffer(1, length, ctx.sampleRate);
    const brData = brown.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const wn = Math.random() * 2 - 1;
      lastOut = (lastOut + 0.02 * wn) / 1.02;
      brData[i] = lastOut * 3.2;
    }
    this.brownNoiseBuf = brown;
  }

  private createLoopingNoise(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start(0, Math.random() * 1.5);
    return src;
  }

  private startAmbientLoops(ctx: AudioContext) {
    if (!this.masterGain || !this.pinkNoiseBuf || !this.brownNoiseBuf || !this.whiteNoiseBuf) return;

    // 1. Mediterranean outdoor breeze / altitude wind
    const windSrc = this.createLoopingNoise(ctx, this.pinkNoiseBuf);
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.value = 340;
    this.windFilter.Q.value = 0.85;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0.0;
    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);

    // 2. Ocean waves & coastal surf (deep rolling brown/pink filtered surf)
    const seaSrc = this.createLoopingNoise(ctx, this.brownNoiseBuf);
    this.seaFilter = ctx.createBiquadFilter();
    this.seaFilter.type = 'lowpass';
    this.seaFilter.frequency.value = 520;
    this.seaFilter.Q.value = 0.7;
    this.seaGain = ctx.createGain();
    this.seaGain.gain.value = 0.0;
    seaSrc.connect(this.seaFilter);
    this.seaFilter.connect(this.seaGain);
    this.seaGain.connect(this.masterGain);

    // 3. Plaza fountain & swimming pool sparkling water cascade
    const fSrc = this.createLoopingNoise(ctx, this.pinkNoiseBuf);
    this.fountainFilter = ctx.createBiquadFilter();
    this.fountainFilter.type = 'bandpass';
    this.fountainFilter.frequency.value = 1850;
    this.fountainFilter.Q.value = 0.9;
    this.fountainGain = ctx.createGain();
    this.fountainGain.gain.value = 0.0;
    fSrc.connect(this.fountainFilter);
    this.fountainFilter.connect(this.fountainGain);
    this.fountainGain.connect(this.masterGain);
  }

  private startVehicleSynthBed(ctx: AudioContext) {
    if (!this.masterGain || !this.pinkNoiseBuf || !this.brownNoiseBuf) return;

    this.vehMasterGain = ctx.createGain();
    this.vehMasterGain.gain.value = 0.0;
    this.vehMasterGain.connect(this.masterGain);

    // Dual detuned main engine oscillators + sub harmonic through resonant low-pass filter
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 260;
    this.engineFilter.Q.value = 2.0;

    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0.0;

    this.engineOscA = ctx.createOscillator();
    this.engineOscA.type = 'sawtooth';
    this.engineOscA.frequency.value = 54;

    this.engineOscB = ctx.createOscillator();
    this.engineOscB.type = 'triangle';
    this.engineOscB.frequency.value = 108;

    this.engineSubOsc = ctx.createOscillator();
    this.engineSubOsc.type = 'sine';
    this.engineSubOsc.frequency.value = 27;

    const oscBGain = ctx.createGain();
    oscBGain.gain.value = 0.45;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.5;

    this.engineOscA.connect(this.engineFilter);
    this.engineOscB.connect(oscBGain);
    oscBGain.connect(this.engineFilter);
    this.engineSubOsc.connect(subGain);
    subGain.connect(this.engineFilter);

    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.vehMasterGain);

    // Propeller chop / rhythmic LFO modulating engine gain
    this.propLfo = ctx.createOscillator();
    this.propLfo.type = 'sine';
    this.propLfo.frequency.value = 14;
    this.propLfoGain = ctx.createGain();
    this.propLfoGain.gain.value = 0.0;
    this.propLfo.connect(this.propLfoGain);
    this.propLfoGain.connect(this.engineGain.gain);

    this.engineOscA.start();
    this.engineOscB.start();
    this.engineSubOsc.start();
    this.propLfo.start();

    // Road tire / gravel / stone wheel roll layer
    const tireSrc = this.createLoopingNoise(ctx, this.brownNoiseBuf);
    this.tireNoiseFilter = ctx.createBiquadFilter();
    this.tireNoiseFilter.type = 'bandpass';
    this.tireNoiseFilter.frequency.value = 220;
    this.tireNoiseFilter.Q.value = 0.9;
    this.tireNoiseGain = ctx.createGain();
    this.tireNoiseGain.gain.value = 0.0;
    tireSrc.connect(this.tireNoiseFilter);
    this.tireNoiseFilter.connect(this.tireNoiseGain);
    this.tireNoiseGain.connect(this.vehMasterGain);

    // Handbrake tire screech layer
    const skidSrc = this.createLoopingNoise(ctx, this.pinkNoiseBuf);
    this.skidFilter = ctx.createBiquadFilter();
    this.skidFilter.type = 'bandpass';
    this.skidFilter.frequency.value = 1650;
    this.skidFilter.Q.value = 7.5;
    this.skidGain = ctx.createGain();
    this.skidGain.gain.value = 0.0;
    skidSrc.connect(this.skidFilter);
    this.skidFilter.connect(this.skidGain);
    this.skidGain.connect(this.vehMasterGain);
  }

  // ==================== CONTINUOUS WORLD AMBIENCE UPDATE ====================

  public updateAmbience(input: AmbienceFrameInput) {
    if (!this.ctx || !this.unlocked || this.disposed) return;
    const now = this.ctx.currentTime;
    this.ambientPhase += input.dt;

    // 1. Breeze & high-altitude wind
    if (this.windGain && this.windFilter) {
      const altFactor = Math.min(1, Math.max(0, input.altitudeM - 2) / 28);
      const gust = 0.78 + 0.22 * Math.sin(this.ambientPhase * 0.42) * Math.cos(this.ambientPhase * 0.19);
      const targetWind = (0.022 + altFactor * 0.11 + input.windBoost * 0.12) * gust;
      const targetFreq = 280 + altFactor * 520 + input.windBoost * 460 + Math.sin(this.ambientPhase * 0.5) * 65;
      this.windGain.gain.setTargetAtTime(targetWind, now, 0.15);
      this.windFilter.frequency.setTargetAtTime(targetFreq, now, 0.15);
    }

    // 2. Spatial Ocean Waves (rhythmic swell + foaming crest)
    if (this.seaGain && this.seaFilter) {
      const prox = Math.max(0, Math.min(1, input.seaProximity));
      const waveCycle = 0.5 + 0.5 * Math.sin(this.ambientPhase * 0.85);
      const secondaryWave = 0.5 + 0.5 * Math.sin(this.ambientPhase * 0.47 + 1.4);
      const swell = 0.55 + 0.45 * (waveCycle * 0.7 + secondaryWave * 0.3);
      const targetSea = prox * prox * 0.24 * swell;
      const targetFreq = 260 + waveCycle * 640 * prox;
      this.seaGain.gain.setTargetAtTime(targetSea, now, 0.12);
      this.seaFilter.frequency.setTargetAtTime(targetFreq, now, 0.12);
    }

    // 3. Spatial Fountain / Pool Water Cascade
    if (this.fountainGain && this.fountainFilter) {
      const fProx = Math.max(0, Math.min(1, input.fountainProximity));
      const shimmer = 0.85 + 0.15 * Math.sin(this.ambientPhase * 3.1);
      this.fountainGain.gain.setTargetAtTime(fProx * fProx * 0.11 * shimmer, now, 0.1);
      this.fountainFilter.frequency.setTargetAtTime(
        1550 + Math.sin(this.ambientPhase * 2.2) * 320,
        now,
        0.12
      );
    }

    // 4. Subtle Time-of-Day Wildlife (Mediterranean daytime birds / coastal gull / night crickets)
    this.wildlifeTimer -= input.dt;
    if (this.wildlifeTimer <= 0 && !this.muted) {
      if (input.timeOfDay === 'night') {
        this.playCricketChirp();
        this.wildlifeTimer = 2.4 + Math.random() * 3.2;
      } else if (input.seaProximity > 0.35 && Math.random() < 0.45) {
        this.playCoastalGull(input.seaProximity);
        this.wildlifeTimer = 5.5 + Math.random() * 6.5;
      } else {
        this.playSongbirdChirp();
        this.wildlifeTimer = 3.8 + Math.random() * 5.2;
      }
    }
  }

  private playSongbirdChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const baseFreq = 2400 + Math.random() * 1400;
    const notes = Math.random() < 0.5 ? 2 : 3;

    for (let i = 0; i < notes; i++) {
      const start = now + i * 0.11;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, start);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * (1.18 + Math.random() * 0.15), start + 0.045);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.94, start + 0.085);

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.018, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.095);
    }
  }

  private playCoastalGull(proximity: number) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    const f0 = 1350 + Math.random() * 280;
    osc.frequency.setValueAtTime(f0 * 0.9, now);
    osc.frequency.linearRampToValueAtTime(f0 * 1.18, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.72, now + 0.42);

    filter.type = 'bandpass';
    filter.frequency.value = f0;
    filter.Q.value = 3.2;

    const peak = 0.022 * proximity;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.07);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.44);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  private playCricketChirp() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const freq = 4150 + Math.random() * 350;
    for (let i = 0; i < 4; i++) {
      const start = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(0.009, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.042);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.045);
    }
  }

  // ==================== CONTINUOUS VEHICLE ENGINE & SURFACE AUDIO ====================

  public updateVehicleAudio(input: VehicleAudioInput) {
    if (
      !this.ctx ||
      !this.unlocked ||
      this.disposed ||
      !this.vehMasterGain ||
      !this.engineOscA ||
      !this.engineOscB ||
      !this.engineSubOsc ||
      !this.engineFilter ||
      !this.engineGain ||
      !this.propLfo ||
      !this.propLfoGain ||
      !this.tireNoiseGain ||
      !this.tireNoiseFilter ||
      !this.skidGain ||
      !this.skidFilter
    ) {
      return;
    }

    const now = this.ctx.currentTime;
    if (!input.type) {
      this.activeVehType = null;
      this.vehMasterGain.gain.setTargetAtTime(0.0, now, 0.08);
      this.tireNoiseGain.gain.setTargetAtTime(0.0, now, 0.06);
      this.skidGain.gain.setTargetAtTime(0.0, now, 0.05);
      return;
    }

    if (this.activeVehType !== input.type) {
      this.activeVehType = input.type;
      if (input.type === 'skySkiff') {
        this.engineOscA.type = 'sine';
        this.engineOscB.type = 'triangle';
      } else if (input.type === 'zeppelin') {
        this.engineOscA.type = 'triangle';
        this.engineOscB.type = 'sawtooth';
      } else if (input.type === 'sportCoupe') {
        this.engineOscA.type = 'sawtooth';
        this.engineOscB.type = 'sawtooth';
      } else {
        this.engineOscA.type = 'sawtooth';
        this.engineOscB.type = 'triangle';
      }
    }

    this.vehMasterGain.gain.setTargetAtTime(1.0, now, 0.08);
    const absSpeed = Math.abs(input.speed);
    const throttleBoost = Math.abs(input.throttle);

    // 1. Vehicle-specific propulsion synthesis
    if (input.type === 'classicCar') {
      const rpmNorm = Math.min(1.5, absSpeed / 20 + throttleBoost * 0.25);
      const f0 = 46 + rpmNorm * 82;
      this.engineOscA.frequency.setTargetAtTime(f0, now, 0.06);
      this.engineOscB.frequency.setTargetAtTime(f0 * 2.01, now, 0.06);
      this.engineSubOsc.frequency.setTargetAtTime(f0 * 0.5, now, 0.06);
      this.engineFilter.frequency.setTargetAtTime(185 + rpmNorm * 360 + throttleBoost * 120, now, 0.06);
      this.engineGain.gain.setTargetAtTime(0.085 + throttleBoost * 0.045 + Math.min(0.05, absSpeed * 0.002), now, 0.06);
      this.propLfoGain.gain.setTargetAtTime(0.0, now, 0.06);
    } else if (input.type === 'sportCoupe') {
      const rpmNorm = Math.min(1.8, absSpeed / 22 + throttleBoost * 0.35);
      const f0 = 62 + rpmNorm * 125;
      this.engineOscA.frequency.setTargetAtTime(f0, now, 0.045);
      this.engineOscB.frequency.setTargetAtTime(f0 * 1.5, now, 0.045); // rich V6 fifth harmonic
      this.engineSubOsc.frequency.setTargetAtTime(f0 * 0.5, now, 0.045);
      this.engineFilter.frequency.setTargetAtTime(280 + rpmNorm * 620 + throttleBoost * 240, now, 0.045);
      this.engineGain.gain.setTargetAtTime(0.095 + throttleBoost * 0.06 + Math.min(0.06, absSpeed * 0.0025), now, 0.05);
      this.propLfoGain.gain.setTargetAtTime(0.0, now, 0.05);
    } else if (input.type === 'zeppelin') {
      const power = Math.min(1.4, absSpeed / 14 + throttleBoost * 0.35 + (input.altitudeM > 2 ? 0.15 : 0));
      const f0 = 38 + power * 34;
      this.engineOscA.frequency.setTargetAtTime(f0, now, 0.1);
      this.engineOscB.frequency.setTargetAtTime(f0 * 1.5, now, 0.1);
      this.engineSubOsc.frequency.setTargetAtTime(f0 * 0.5, now, 0.1);
      this.engineFilter.frequency.setTargetAtTime(160 + power * 240, now, 0.1);
      this.engineGain.gain.setTargetAtTime(0.09 + power * 0.045, now, 0.1);
      // Distinct twin-propeller airship chop
      this.propLfo.frequency.setTargetAtTime(9.5 + power * 13.5, now, 0.1);
      this.propLfoGain.gain.setTargetAtTime(0.032 + power * 0.025, now, 0.1);
    } else if (input.type === 'skySkiff') {
      const power = Math.min(1.4, absSpeed / 18 + throttleBoost * 0.25 + input.altitudeM * 0.015);
      const f0 = 196 + power * 92; // ethereal G3 -> D4 shimmer
      this.engineOscA.frequency.setTargetAtTime(f0, now, 0.12);
      this.engineOscB.frequency.setTargetAtTime(f0 * 1.498, now, 0.12); // celestial fifth
      this.engineSubOsc.frequency.setTargetAtTime(f0 * 0.5, now, 0.12);
      this.engineFilter.frequency.setTargetAtTime(620 + power * 780, now, 0.12);
      this.engineGain.gain.setTargetAtTime(0.055 + power * 0.038, now, 0.12);
      this.propLfo.frequency.setTargetAtTime(3.2 + power * 3.0, now, 0.12);
      this.propLfoGain.gain.setTargetAtTime(0.014, now, 0.12);
    } else {
      // medievalCarriage & warChariot — no motor hum, instead rhythmic horse hoofbeats & wooden wheel rumble!
      this.engineGain.gain.setTargetAtTime(0.0, now, 0.08);
      this.propLfoGain.gain.setTargetAtTime(0.0, now, 0.08);

      if (absSpeed > 0.6) {
        const isChariot = input.type === 'warChariot';
        const cadence = (isChariot ? 1.55 : 1.15) + absSpeed * (isChariot ? 0.52 : 0.42);
        this.hoofPhase += input.dt * cadence;
        if (this.hoofPhase >= 1) {
          this.hoofPhase -= 1;
          this.playHoofbeat(input.surface, absSpeed, isChariot);
        }

        this.wheelCreakTimer -= input.dt;
        if (this.wheelCreakTimer <= 0) {
          this.playWoodWheelCreak(absSpeed, isChariot);
          this.wheelCreakTimer = 0.85 + Math.random() * 1.1;
        }
      }
    }

    // 2. Road-Surface Rolling Noise (Ground vehicles only)
    const isFlying = input.type === 'zeppelin' || input.type === 'skySkiff';
    if (!isFlying && absSpeed > 0.4) {
      const speedNorm = Math.min(1, absSpeed / 22);
      let freq = 230;
      let q = 0.9;
      let gainScale = 0.085;

      if (input.surface === 'cobblestone' || input.surface === 'ancientStone') {
        freq = 320 + Math.sin(this.ambientPhase * (16 + absSpeed * 2.2)) * 90;
        q = 1.6;
        gainScale = 0.135;
      } else if (input.surface === 'dirtRoad' || input.surface === 'sand') {
        freq = 560;
        q = 0.7;
        gainScale = 0.11;
      } else if (input.surface === 'water') {
        freq = 920;
        q = 0.65;
        gainScale = 0.16;
      } else if (input.surface === 'wood') {
        freq = 185;
        q = 2.4;
        gainScale = 0.12;
      }

      this.tireNoiseFilter.frequency.setTargetAtTime(freq, now, 0.06);
      this.tireNoiseFilter.Q.setTargetAtTime(q, now, 0.06);
      this.tireNoiseGain.gain.setTargetAtTime(speedNorm * gainScale, now, 0.06);
    } else {
      this.tireNoiseGain.gain.setTargetAtTime(0.0, now, 0.06);
    }

    // 3. Handbrake Tire Screech (Cars only when braking at speed on hard surfaces)
    const isCar = input.type === 'classicCar' || input.type === 'sportCoupe';
    if (isCar && input.handbrake && absSpeed > 4.2 && input.surface !== 'water') {
      const skidIntensity = Math.min(1, (absSpeed - 4.0) / 14);
      this.skidFilter.frequency.setTargetAtTime(
        input.surface === 'dirtRoad' || input.surface === 'sand' ? 780 : 1750 + skidIntensity * 380,
        now,
        0.04
      );
      this.skidGain.gain.setTargetAtTime(skidIntensity * 0.095, now, 0.04);
    } else {
      this.skidGain.gain.setTargetAtTime(0.0, now, 0.05);
    }
  }

  private playHoofbeat(surface: GroundSurfaceKind, speed: number, isChariot: boolean) {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuf) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.16, 0.055 + speed * 0.008) * (isChariot ? 1.18 : 0.92);

    // Clip-clop double tap for horse hooves
    const taps = isChariot ? [0, 0.055] : [0, 0.075];
    for (let i = 0; i < taps.length; i++) {
      const t = now + taps[i];
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const isHard =
        surface === 'asphalt' ||
        surface === 'ancientStone' ||
        surface === 'cobblestone' ||
        surface === 'sidewalkPath';

      osc.type = 'triangle';
      const baseF = isHard ? (i === 0 ? 440 : 520) : surface === 'wood' ? 190 : 155;
      osc.frequency.setValueAtTime(baseF * (0.94 + Math.random() * 0.12), t);
      osc.frequency.exponentialRampToValueAtTime(75, t + 0.045);

      gain.gain.setValueAtTime(vol * (i === 0 ? 1.0 : 0.8), t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.052);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t);
      osc.stop(t + 0.055);
    }

    if (surface === 'water') {
      this.playWaterSplash(0.35);
    }
  }

  private playWoodWheelCreak(speed: number, isChariot: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    const f0 = isChariot ? 210 + Math.random() * 80 : 320 + Math.random() * 110;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.linearRampToValueAtTime(f0 * 0.82, now + 0.14);

    filter.type = 'bandpass';
    filter.frequency.value = f0 * 1.4;
    filter.Q.value = 5.5;

    const peak = Math.min(0.032, 0.012 + speed * 0.002);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  // ==================== SURFACE-AWARE FOOTSTEPS & JUMP/LAND ====================

  public playFootstep(surface: GroundSurfaceKind, isRunning: boolean) {
    if (!this.ctx || !this.masterGain || !this.whiteNoiseBuf || !this.pinkNoiseBuf) return;
    const now = this.ctx.currentTime;
    const jitter = 0.9 + Math.random() * 0.2;
    const intensity = isRunning ? 1.25 : 0.85;

    if (surface === 'water') {
      this.playWaterSplash(isRunning ? 0.55 : 0.36);
      return;
    }

    // 1. Noise burst shaped per ground material
    const noiseSrc = this.ctx.createBufferSource();
    noiseSrc.buffer = surface === 'sand' || surface === 'grass' ? this.pinkNoiseBuf : this.whiteNoiseBuf;
    const filter = this.ctx.createBiquadFilter();
    const nGain = this.ctx.createGain();

    let dur = 0.075;
    let peak = 0.09 * intensity;

    switch (surface) {
      case 'asphalt':
      case 'sidewalkPath':
        filter.type = 'bandpass';
        filter.frequency.value = 1150 * jitter;
        filter.Q.value = 1.4;
        dur = 0.055;
        peak = 0.075 * intensity;
        break;
      case 'ancientStone':
      case 'cobblestone':
        filter.type = 'bandpass';
        filter.frequency.value = 1650 * jitter;
        filter.Q.value = 2.6;
        dur = 0.062;
        peak = 0.095 * intensity;
        break;
      case 'dirtRoad':
        filter.type = 'bandpass';
        filter.frequency.value = 820 * jitter;
        filter.Q.value = 0.8;
        dur = 0.095;
        peak = 0.11 * intensity;
        break;
      case 'sand':
        filter.type = 'highpass';
        filter.frequency.value = 1400 * jitter;
        filter.Q.value = 0.6;
        dur = 0.115;
        peak = 0.08 * intensity;
        break;
      case 'wood':
        filter.type = 'bandpass';
        filter.frequency.value = 460 * jitter;
        filter.Q.value = 2.2;
        dur = 0.085;
        peak = 0.1 * intensity;
        break;
      default: // grass
        filter.type = 'bandpass';
        filter.frequency.value = 680 * jitter;
        filter.Q.value = 0.9;
        dur = 0.085;
        peak = 0.075 * intensity;
        break;
    }

    nGain.gain.setValueAtTime(0.0001, now);
    nGain.gain.linearRampToValueAtTime(peak, now + 0.008);
    nGain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noiseSrc.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noiseSrc.start(now, Math.random() * 1.4, dur + 0.02);

    // 2. Subtle body heel thump / hollow wood / stone resonance
    const thump = this.ctx.createOscillator();
    const tGain = this.ctx.createGain();
    thump.type = 'sine';
    const startF =
      surface === 'wood'
        ? 168 * jitter
        : surface === 'ancientStone' || surface === 'cobblestone'
          ? 240 * jitter
          : 118 * jitter;
    thump.frequency.setValueAtTime(startF, now);
    thump.frequency.exponentialRampToValueAtTime(46, now + 0.055);

    const thumpVol =
      surface === 'wood' ? 0.14 * intensity : surface === 'sand' ? 0.03 * intensity : 0.07 * intensity;
    tGain.gain.setValueAtTime(thumpVol, now);
    tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);

    thump.connect(tGain);
    tGain.connect(this.masterGain);
    thump.start(now);
    thump.stop(now + 0.065);
  }

  public playJump() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(145, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.15);
  }

  public playLand(surface: GroundSurfaceKind) {
    if (!this.ctx || !this.masterGain) return;
    if (surface === 'water') {
      this.playWaterSplash(0.85);
      return;
    }
    this.playFootstep(surface, true);
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(surface === 'wood' ? 135 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.11);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playWaterSplash(strength = 0.6) {
    if (!this.ctx || !this.masterGain || !this.pinkNoiseBuf) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.pinkNoiseBuf;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1350, now);
    filter.frequency.exponentialRampToValueAtTime(420, now + 0.24);
    filter.Q.value = 0.85;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18 * strength, now + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    src.start(now, Math.random() * 1.2, 0.28);

    // Sparkling water droplet bloop
    const drop = this.ctx.createOscillator();
    const dGain = this.ctx.createGain();
    drop.type = 'sine';
    const f0 = 420 + Math.random() * 260;
    drop.frequency.setValueAtTime(f0, now + 0.04);
    drop.frequency.exponentialRampToValueAtTime(f0 * 2.1, now + 0.12);
    dGain.gain.setValueAtTime(0.0001, now + 0.04);
    dGain.gain.linearRampToValueAtTime(0.045 * strength, now + 0.055);
    dGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    drop.connect(dGain);
    dGain.connect(this.masterGain);
    drop.start(now + 0.04);
    drop.stop(now + 0.14);
  }

  // ==================== VEHICLE ACTIONS & HORN ====================

  public playVehicleEnter(type: VehicleType) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (type === 'classicCar' || type === 'sportCoupe') {
      // Crisp door shut + starter crank rev
      const thud = this.ctx.createOscillator();
      const tGain = this.ctx.createGain();
      thud.type = 'triangle';
      thud.frequency.setValueAtTime(125, now);
      thud.frequency.exponentialRampToValueAtTime(42, now + 0.09);
      tGain.gain.setValueAtTime(0.18, now);
      tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      thud.connect(tGain);
      tGain.connect(this.masterGain);
      thud.start(now);
      thud.stop(now + 0.11);

      const rev = this.ctx.createOscillator();
      const rFilter = this.ctx.createBiquadFilter();
      const rGain = this.ctx.createGain();
      rev.type = 'sawtooth';
      rev.frequency.setValueAtTime(52, now + 0.08);
      rev.frequency.exponentialRampToValueAtTime(type === 'sportCoupe' ? 175 : 125, now + 0.28);
      rev.frequency.exponentialRampToValueAtTime(64, now + 0.52);
      rFilter.type = 'lowpass';
      rFilter.frequency.value = type === 'sportCoupe' ? 680 : 420;
      rGain.gain.setValueAtTime(0.0001, now + 0.08);
      rGain.gain.linearRampToValueAtTime(0.14, now + 0.18);
      rGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
      rev.connect(rFilter);
      rFilter.connect(rGain);
      rGain.connect(this.masterGain);
      rev.start(now + 0.08);
      rev.stop(now + 0.58);
    } else if (type === 'zeppelin' || type === 'skySkiff') {
      // Rising harmonic lift chime / airship valve hiss
      const notes = type === 'skySkiff' ? [392, 587.3, 784] : [146.8, 220, 293.6];
      notes.forEach((f, i) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type === 'skySkiff' ? 'sine' : 'triangle';
        const st = now + i * 0.07;
        osc.frequency.setValueAtTime(f, st);
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.08, st + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.32);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(st);
        osc.stop(st + 0.34);
      });
    } else {
      // Horse carriage / chariot mount + gentle harness jingle
      this.playWoodWheelCreak(4, type === 'warChariot');
    }
  }

  public playVehicleExit() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(58, now + 0.11);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(g);
    g.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  public playVehicleHorn(type: VehicleType) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;

    if (type === 'zeppelin') {
      // Deep brass airship foghorn
      for (const freq of [110, 164.8]) {
        const osc = this.ctx.createOscillator();
        const flt = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        flt.type = 'lowpass';
        flt.frequency.value = 460;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.095, now + 0.06);
        g.gain.setValueAtTime(0.09, now + 0.42);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.62);
        osc.connect(flt);
        flt.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.65);
      }
    } else if (type === 'skySkiff') {
      // Elven silver bell chime
      for (const freq of [659.25, 987.77, 1318.5]) {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.065, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.55);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.58);
      }
    } else if (type === 'medievalCarriage' || type === 'warChariot') {
      // Brass carriage bell / war horn
      const freqs = type === 'warChariot' ? [196, 293.66] : [880, 1320];
      freqs.forEach((f, idx) => {
        if (!this.ctx || !this.masterGain) return;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = type === 'warChariot' ? 'sawtooth' : 'triangle';
        const st = now + idx * 0.04;
        osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, st);
        g.gain.linearRampToValueAtTime(0.08, st + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.34);
        osc.connect(g);
        g.connect(this.masterGain);
        osc.start(st);
        osc.stop(st + 0.36);
      });
    } else {
      // Dual-tone classic/sport car horn
      const pair = type === 'sportCoupe' ? [440, 554.37] : [370, 466.16];
      for (const freq of pair) {
        const osc = this.ctx.createOscillator();
        const flt = this.ctx.createBiquadFilter();
        const g = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        flt.type = 'bandpass';
        flt.frequency.value = freq * 1.8;
        flt.Q.value = 1.6;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.08, now + 0.02);
        g.gain.setValueAtTime(0.075, now + 0.24);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
        osc.connect(flt);
        flt.connect(g);
        g.connect(this.masterGain);
        osc.start(now);
        osc.stop(now + 0.36);
      }
    }
  }

  // ==================== BUILD, ROAD, NPC & QUEST SFX ====================

  public playPlaceObject(type?: PlaceableType) {
    if (!this.ctx || !this.masterGain) return;
    if (
      type === 'seaWaterPatch' ||
      type === 'swimmingPool' ||
      type === 'fountain' ||
      type === 'sailboatDocked'
    ) {
      this.playWaterSplash(0.75);
      return;
    }

    const now = this.ctx.currentTime;
    const isWood =
      type === 'woodenPier' ||
      type === 'beachBarTiki' ||
      type === 'beachCabanaSet' ||
      type === 'lifeguardTower' ||
      type === 'bazaarStall' ||
      type === 'bench';

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(isWood ? 195 : 148, now);
    osc.frequency.exponentialRampToValueAtTime(isWood ? 88 : 54, now + 0.1);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.13);

    // Subtle crisp confirmation ping
    const ping = this.ctx.createOscillator();
    const pGain = this.ctx.createGain();
    ping.type = 'sine';
    ping.frequency.value = isWood ? 523.25 : 440;
    pGain.gain.setValueAtTime(0.0001, now + 0.02);
    pGain.gain.linearRampToValueAtTime(0.055, now + 0.035);
    pGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.17);
    ping.connect(pGain);
    pGain.connect(this.masterGain);
    ping.start(now + 0.02);
    ping.stop(now + 0.18);
  }

  public playRoadNode(style: RoadStyle) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    const f0 = style === 'ancientStone' || style === 'cobblestone' ? 320 : style === 'dirtRoad' ? 190 : 250;
    osc.frequency.setValueAtTime(f0, now);
    osc.frequency.exponentialRampToValueAtTime(f0 * 0.55, now + 0.065);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playRoadCommit() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [330, 440, 554.37].forEach((freq, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const st = now + i * 0.045;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, st);
      gain.gain.linearRampToValueAtTime(0.065, st + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(st);
      osc.stop(st + 0.24);
    });
  }

  public playDelete() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.exponentialRampToValueAtTime(86, now + 0.14);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playUiTick(pitch = 620) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = pitch;
    gain.gain.setValueAtTime(0.035, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.045);
  }

  public playModeSwitch(toPlay: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = toPlay ? [330, 493.88] : [493.88, 330];
    notes.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      const st = now + i * 0.055;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, st);
      gain.gain.linearRampToValueAtTime(0.06, st + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.19);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(st);
      osc.stop(st + 0.21);
    });
  }

  public playNpcGreet() {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25].forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const st = now + i * 0.065;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, st);
      gain.gain.linearRampToValueAtTime(0.075, st + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + 0.22);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(st);
      osc.stop(st + 0.24);
    });
  }

  public playQuestFanfare(isReward: boolean) {
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    const notes = isReward
      ? [523.25, 659.25, 783.99, 1046.5]
      : [440, 554.37, 659.25];
    notes.forEach((f, i) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      const st = now + i * 0.08;
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0.0001, st);
      gain.gain.linearRampToValueAtTime(0.09, st + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, st + (i === notes.length - 1 ? 0.5 : 0.26));
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(st);
      osc.stop(st + 0.55);
    });
  }

  public dispose() {
    this.disposed = true;
    try {
      this.engineOscA?.stop();
      this.engineOscB?.stop();
      this.engineSubOsc?.stop();
      this.propLfo?.stop();
    } catch {
      // already stopped
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
