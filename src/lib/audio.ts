export class AudioEngine {
  ctx: AudioContext | null = null;
  enabled: boolean = false;
  volume: number = parseInt(localStorage.getItem('maze_volume') ?? '50') / 100;
  haptics: boolean = localStorage.getItem('maze_haptics') !== 'false';
  music: boolean = localStorage.getItem('maze_music') !== 'false';
  
  bgmActive: boolean = false;
  bgmInterval: any = null;
  bgmNodes: any[] = [];
  bgmMasterGain: GainNode | null = null;

  init() {
    if (!this.ctx) {
      try {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        this.enabled = true;
      } catch (e) {
        console.warn("Web Audio API not supported", e);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(v: number) {
    this.volume = Math.max(0, Math.min(1, v));
    localStorage.setItem('maze_volume', Math.floor(this.volume * 100).toString());
    if (this.bgmMasterGain) {
      this.bgmMasterGain.gain.setTargetAtTime(this.volume, this.ctx?.currentTime || 0, 0.1);
    }
  }

  setMusic(m: boolean) {
    this.music = m;
    localStorage.setItem('maze_music', m ? 'true' : 'false');
    if (!m) {
      this.stopBGM();
    }
  }

  setHaptics(h: boolean) {
    this.haptics = h;
    localStorage.setItem('maze_haptics', h ? 'true' : 'false');
  }

  vibrate(ms: number | number[]) {
    if (this.haptics && navigator.vibrate) {
       navigator.vibrate(ms);
    }
  }

  onPlay?: (type: string) => void;

  bgmTimeouts: any[] = [];

  startBGM() {
    if (!this.music || !this.ctx || this.volume === 0) return;
    if (this.bgmActive) return;
    this.bgmActive = true;

    this.bgmMasterGain = this.ctx.createGain();
    this.bgmMasterGain.gain.setValueAtTime(this.volume * 0.4, this.ctx.currentTime);
    this.bgmMasterGain.connect(this.ctx.destination);

    // Jungle Morning: Layered birds, soft morning breeze, and warm rising sun pad
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       output[i] = (Math.random() * 2 - 1) * 0.15; 
    }

    const addNaturalWind = (centerFreq: number, vol: number) => {
        const breezeSrc = this.ctx!.createBufferSource();
        breezeSrc.buffer = noiseBuffer;
        breezeSrc.loop = true;
        const breezeFilter = this.ctx!.createBiquadFilter();
        breezeFilter.type = 'bandpass';
        breezeFilter.frequency.value = centerFreq; 
        breezeFilter.Q.value = 0.5;
        const breezeLFO = this.ctx!.createOscillator();
        breezeLFO.frequency.value = 0.03; 
        const breezeLFOGain = this.ctx!.createGain();
        breezeLFOGain.gain.value = centerFreq * 0.4; 
        breezeLFO.connect(breezeLFOGain);
        breezeLFOGain.connect(breezeFilter.frequency);
        const breezeVolGain = this.ctx!.createGain();
        breezeVolGain.gain.value = vol;
        breezeSrc.connect(breezeFilter);
        breezeFilter.connect(breezeVolGain);
        breezeVolGain.connect(this.bgmMasterGain!);
        breezeSrc.start();
        breezeLFO.start();
        this.bgmNodes.push(breezeSrc, breezeFilter, breezeLFO, breezeLFOGain, breezeVolGain);
    };

    const addMorningBirds = (vol: number) => {
        const playBird = () => {
          if (!this.bgmActive || !this.ctx) return;
          const t = this.ctx.currentTime;
          const birdType = Math.random();
          
          if (birdType < 0.3) {
            // Jungle Whistle (Slide)
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            const freq = 1800 + Math.random() * 800;
            osc.frequency.setValueAtTime(freq, t);
            osc.frequency.exponentialRampToValueAtTime(freq + 400, t + 0.15);
            osc.frequency.exponentialRampToValueAtTime(freq - 200, t + 0.4);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol * 1.5, t + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
            osc.connect(gain); gain.connect(this.bgmMasterGain!);
            osc.start(t); osc.stop(t + 0.4);
          } else if (birdType < 0.7) {
             // Tropical Chirps
             const num = 2 + Math.floor(Math.random() * 3);
             for(let i=0; i<num; i++) {
                const pt = t + i * 0.12;
                const osc = this.ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(3500 + Math.random() * 1500, pt);
                osc.frequency.exponentialRampToValueAtTime(2500, pt + 0.08);
                const gain = this.ctx.createGain();
                gain.gain.setValueAtTime(0, pt);
                gain.gain.linearRampToValueAtTime(vol, pt + 0.01);
                gain.gain.linearRampToValueAtTime(0, pt + 0.08);
                osc.connect(gain); gain.connect(this.bgmMasterGain!);
                osc.start(pt); osc.stop(pt + 0.08);
             }
          } else {
            // Distant exotic call
            const osc = this.ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800 + Math.random() * 200, t);
            osc.frequency.exponentialRampToValueAtTime(1000 + Math.random() * 200, t + 0.3);
            const gain = this.ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol * 0.8, t + 0.1);
            gain.gain.linearRampToValueAtTime(0, t + 0.6);
            osc.connect(gain); gain.connect(this.bgmMasterGain!);
            osc.start(t); osc.stop(t + 0.6);
          }
          
          this.bgmTimeouts.push(setTimeout(playBird, 1500 + Math.random() * 4000));
        };
        playBird();
        // Add a second bird layer for density
        this.bgmTimeouts.push(setTimeout(playBird, 3000));
    };

    const addMorningPad = (vol: number) => {
        // Morning Sun Pad: Low, warm, breathing synth chords
        const playPad = () => {
          if (!this.bgmActive || !this.ctx) return;
          const t = this.ctx.currentTime;
          const freqs = [110, 164.81, 220, 293.66]; // A2, E3, A3, D4 (warmer morning feel)
          
          freqs.forEach((f, i) => {
            const osc = this.ctx!.createOscillator();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(f + Math.random() * 2, t);
            
            const gain = this.ctx!.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(vol / freqs.length, t + 4.0);
            gain.gain.linearRampToValueAtTime(vol / (freqs.length * 2), t + 8.0);
            gain.gain.linearRampToValueAtTime(0, t + 12.0);
            
            osc.connect(gain); gain.connect(this.bgmMasterGain!);
            osc.start(t); osc.stop(t + 12.0);
            this.bgmNodes.push(osc);
          });
          
          this.bgmTimeouts.push(setTimeout(playPad, 10000));
        };
        playPad();
    };

    // Layer the Jungle Morning soundscape
    addNaturalWind(400, 0.04); // low jungle hum
    addNaturalWind(1200, 0.02); // leaves rustling in morning breeze
    addMorningBirds(0.015);
    addMorningPad(0.025);
  }
  
  stopBGM() {
     this.bgmActive = false;
     this.bgmNodes.forEach(n => {
         try { n.stop(); n.disconnect(); } catch(e){}
     });
     this.bgmNodes = [];
     if (this.bgmInterval) {
         clearInterval(this.bgmInterval);
         this.bgmInterval = null;
     }
     if (this.bgmTimeouts) {
         this.bgmTimeouts.forEach(t => clearTimeout(t));
         this.bgmTimeouts = [];
     }
     if (this.bgmMasterGain) {
         this.bgmMasterGain.disconnect();
         this.bgmMasterGain = null;
     }
  }

  play(type: 'nom' | 'meow' | 'win' | 'lose' | 'step' | 'heartbeat' | 'caught' | 'trap' | 'ding' | 'croak' | 'squeak' | 'bark' | 'roar' | 'howl') {
    if (this.onPlay) this.onPlay(type);
    if (!this.ctx || !this.enabled || this.volume === 0) return;
    if (this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    if (type === 'croak') {
      // Frog Croak: Deep, pulsed triangle wave
      const numPulses = 2;
      for (let i = 0; i < numPulses; i++) {
        const pt = t + i * 0.12;
        const pOsc = this.ctx.createOscillator();
        const pGain = this.ctx.createGain();
        pOsc.type = 'triangle';
        pOsc.frequency.setValueAtTime(70 + Math.random() * 10, pt);
        pOsc.frequency.exponentialRampToValueAtTime(30, pt + 0.1);
        pGain.gain.setValueAtTime(0, pt);
        pGain.gain.linearRampToValueAtTime(0.15 * this.volume, pt + 0.04);
        pGain.gain.exponentialRampToValueAtTime(0.01, pt + 0.1);
        pOsc.connect(pGain);
        pGain.connect(this.ctx.destination);
        pOsc.start(pt);
        pOsc.stop(pt + 0.1);
      }
    } else if (type === 'squeak') {
      // Rat Squeak: Short high tweet
      osc.type = 'sine';
      osc.frequency.setValueAtTime(3500, t);
      osc.frequency.exponentialRampToValueAtTime(2500, t + 0.05);
      gain.gain.setValueAtTime(0.12 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.05);
    } else if (type === 'bark') {
      // Small Dog Bark
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(150, t + 0.1);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2 * this.volume, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.1);
    } else if (type === 'roar' || type === 'howl') {
      // Low growl/roar for bigger animals
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.3);
      const lowFilter = this.ctx.createBiquadFilter();
      lowFilter.type = 'lowpass';
      lowFilter.frequency.value = 400;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25 * this.volume, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(lowFilter); lowFilter.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
    } else if (type === 'meow') {
      // Soft Cat Meow
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(500, t);
      osc.frequency.exponentialRampToValueAtTime(700, t + 0.1);
      osc.frequency.exponentialRampToValueAtTime(450, t + 0.35);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.18 * this.volume, t + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.35);
    } else if (type === 'ding') {
      // Shimmering Ding
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, t);
      osc.frequency.exponentialRampToValueAtTime(1500, t + 0.1);
      
      const gain2 = this.ctx.createGain();
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(2400, t);
      osc2.frequency.exponentialRampToValueAtTime(800, t + 0.4);
      
      gain.gain.setValueAtTime(0.5 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      
      gain2.gain.setValueAtTime(0.2 * this.volume, t);
      gain2.gain.exponentialRampToValueAtTime(0.01, t + 0.4);
      
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc2.connect(gain2); gain2.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.4);
      osc2.start(t); osc2.stop(t + 0.4);
    } else if (type === 'trap') {
      // Gentle wooden block sound
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.1);
      gain.gain.setValueAtTime(0.4 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.1);
    } else if (type === 'nom') {
      // Pleasant chime pop
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(1200, t + 0.15);
      gain.gain.setValueAtTime(0.5 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.15);
    } else if (type === 'win') {
      // Uplifting ethereal arpeggio
      osc.type = 'sine';
      osc.frequency.setValueAtTime(544.4, t);
      osc.frequency.setValueAtTime(686.6, t + 0.15); 
      osc.frequency.setValueAtTime(816.6, t + 0.3); 
      osc.frequency.setValueAtTime(1088.8, t + 0.45); 
      gain.gain.setValueAtTime(0.4 * this.volume, t);
      gain.gain.linearRampToValueAtTime(0, t + 1.2);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 1.2);
    } else if (type === 'step') {
      // Extremely subtle tap
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.04);
      gain.gain.setValueAtTime(0.02 * this.volume, t);
      gain.gain.linearRampToValueAtTime(0.005, t + 0.04);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.04);
    } else if (type === 'heartbeat') {
      // Soft muffled thud (anxiety release heartbeat)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.2);
      gain.gain.setValueAtTime(0.6 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.2);
    } else if (type === 'caught') {
      // Soft gentle descending tone (not harsh)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, t);
      osc.frequency.exponentialRampToValueAtTime(100, t + 0.6);
      gain.gain.setValueAtTime(0.4 * this.volume, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.6);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.6);
    } else if (type === 'lose') {
      // Gentle long descending meditation tone
      osc.type = 'sine';
      osc.frequency.setValueAtTime(272.2, t);
      osc.frequency.setValueAtTime(204.15, t + 0.4); 
      osc.frequency.setValueAtTime(136.1, t + 0.8); 
      gain.gain.setValueAtTime(0.5 * this.volume, t);
      gain.gain.linearRampToValueAtTime(0, t + 2.0);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 2.0);
    }
  }
}
export const audio = new AudioEngine();

