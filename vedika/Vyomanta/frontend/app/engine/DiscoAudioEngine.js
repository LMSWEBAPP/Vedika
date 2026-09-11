/**
 * DiscoAudioEngine.js
 * 
 * Procedural 70s-80s Funky Ambient Groove Synthesizer (Web Audio API).
 * Zero external mp3 dependencies — 100% reliable, instant, and self-contained.
 * Plays warm Rhodes electric piano chords, a funky syncopated bassline,
 * a classic 4-on-the-floor disco kick & hi-hats, and lush ambient string sweeps.
 */

export class DiscoAudioEngine {
  constructor() {
    this.ctx = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.masterGain = null;
    this.timerId = null;
    this.currentStep = 0;
    this.bpm = 114;
    this.stepInterval = (60 / this.bpm) / 4; // 16th notes
    this.nextNoteTime = 0;
    
    // Funky ambient chord progression (Dm9 -> G13 -> Cmaj9 -> A7#9)
    this.chords = [
      [293.66, 349.23, 440.00, 523.25, 659.25], // Dm9 (D4, F4, A4, C5, E5)
      [246.94, 329.63, 392.00, 440.00, 587.33], // G13 (B3, E4, G4, A4, D5)
      [261.63, 329.63, 392.00, 493.88, 587.33], // Cmaj9 (C4, E4, G4, B4, D5)
      [220.00, 277.18, 329.63, 392.00, 622.25], // A7#9 (A3, C#4, E4, G4, D#5)
    ];

    // Funky bass notes matching chords
    this.basslines = [
      [73.42, 0, 73.42, 146.83, 0, 110.00, 0, 130.81, 73.42, 0, 73.42, 0, 146.83, 130.81, 110.00, 0], // D bass
      [98.00, 0, 98.00, 196.00, 0, 146.83, 0, 164.81, 98.00, 0, 98.00, 0, 196.00, 164.81, 146.83, 0], // G bass
      [65.41, 0, 65.41, 130.81, 0, 98.00, 0, 123.47, 65.41, 0, 65.41, 0, 130.81, 123.47, 98.00, 0],   // C bass
      [55.00, 0, 55.00, 110.00, 0, 82.41, 0, 103.83, 55.00, 0, 55.00, 0, 110.00, 103.83, 82.41, 0],   // A bass
    ];
  }

  _initContext() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.42, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  start() {
    this._initContext();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.nextNoteTime = this.ctx.currentTime + 0.05;
    this.currentStep = 0;
    this._scheduleLoop();
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.42, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  _scheduleLoop() {
    if (!this.isPlaying || !this.ctx) return;

    // Safety guard: if currentTime jumped ahead (e.g. suspended context or tab blur),
    // clamp nextNoteTime so it never plays an unbounded storm of catch-up notes!
    if (this.nextNoteTime < this.ctx.currentTime) {
      this.nextNoteTime = this.ctx.currentTime + 0.02;
    }

    // Schedule maximum 4 steps per loop iteration to completely prevent main thread freezes
    let stepsScheduled = 0;
    while (this.nextNoteTime < this.ctx.currentTime + 0.12 && stepsScheduled < 4) {
      this._playStep(this.currentStep, this.nextNoteTime);
      this.nextNoteTime += this.stepInterval;
      this.currentStep = (this.currentStep + 1) % 64; // 4 bars loop
      stepsScheduled++;
    }

    this.timerId = setTimeout(() => this._scheduleLoop(), 35);
  }


  _playStep(step, time) {
    const bar = Math.floor(step / 16);
    const stepInBar = step % 16;
    const currentChord = this.chords[bar];
    const currentBassSeq = this.basslines[bar];

    // 1. Kick Drum: Classic 4-on-the-floor (steps 0, 4, 8, 12)
    if (stepInBar % 4 === 0) {
      this._playKick(time);
    }

    // 2. Hi-Hats: Open hat on the off-beat (steps 2, 6, 10, 14), closed on others
    if (stepInBar % 2 === 0) {
      const isOpen = (stepInBar % 4 === 2);
      this._playHiHat(time, isOpen);
    }

    // 3. Funky Bassline Note
    const bassFreq = currentBassSeq[stepInBar];
    if (bassFreq > 0) {
      this._playBass(bassFreq, time);
    }

    // 4. Shimmering Rhodes Chords (played on syncopated rhythmic beats)
    if (stepInBar === 0 || stepInBar === 3 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14) {
      this._playRhodesChord(currentChord, time);
    }

    // 5. Ambient String Pad sweep at start of each bar
    if (stepInBar === 0) {
      this._playAmbientStringSweep(currentChord, time);
    }
  }

  _playKick(time) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    
    // Pitch envelope dropping from 140Hz to 38Hz punch
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

    gain.gain.setValueAtTime(0.75, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.28);
  }

  _playHiHat(time, isOpen) {
    const dur = isOpen ? 0.22 : 0.045;
    // White noise generator
    const bufferSize = this.ctx.sampleRate * dur;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Highpass filter for crisp disco sizzle
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(isOpen ? 0.24 : 0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
  }

  _playBass(freq, time) {
    const osc = this.ctx.createOscillator();
    const subOsc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(freq * 0.5, time);

    // Warm disco funk filter envelope
    filter.type = 'lowpass';
    filter.Q.value = 4.5;
    filter.frequency.setValueAtTime(1400, time);
    filter.frequency.exponentialRampToValueAtTime(180, time + 0.16);

    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(filter);
    subOsc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    subOsc.start(time);
    osc.stop(time + 0.24);
    subOsc.stop(time + 0.24);
  }

  _playRhodesChord(chordFreqs, time) {
    chordFreqs.forEach((f, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const pan = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, time);

      // Gentle bell transient
      const dur = 0.38;
      gain.gain.setValueAtTime(0.065, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      if (pan) {
        pan.pan.value = (idx / (chordFreqs.length - 1) - 0.5) * 0.7;
        osc.connect(gain);
        gain.connect(pan);
        pan.connect(this.masterGain);
      } else {
        osc.connect(gain);
        gain.connect(this.masterGain);
      }

      osc.start(time);
      osc.stop(time + dur);
    });
  }

  _playAmbientStringSweep(chordFreqs, time) {
    const dur = 1.95;
    chordFreqs.slice(0, 3).forEach((f) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(f * 2, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      filter.frequency.exponentialRampToValueAtTime(2200, time + dur * 0.5);
      filter.frequency.exponentialRampToValueAtTime(500, time + dur);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.045, time + dur * 0.4);
      gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(time);
      osc.stop(time + dur);
    });
  }

  destroy() {
    this.stop();
    if (this.ctx) {
      try {
        this.ctx.close();
      } catch (e) {}
      this.ctx = null;
    }
  }
}
