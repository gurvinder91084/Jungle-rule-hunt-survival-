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
    
    // Start ambient background music on first interaction
    this.startBGM();
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
    if (m) {
      this.startBGM();
    } else {
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
    this.bgmMasterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    this.bgmMasterGain.connect(this.ctx.destination);

    // Pick a random theme each time
    const themes = ['spa', 'meditation', 'morning', 'jungle', 'deep_sleep', 'relax', 'mind_relax'];
    const theme = themes[Math.floor(Math.random() * themes.length)];

    console.log("Playing AI Ambient Theme:", theme);

    // Baseline Noise Buffer for water & wind
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
       output[i] = (Math.random() * 2 - 1) * 0.15; 
    }

    // --- Helper functions for generative elements ---
    const addWater = (filterFreq: number, vol: number) => {
        const waterSrc = this.ctx!.createBufferSource();
        waterSrc.buffer = noiseBuffer;
        waterSrc.loop = true;
        const waterFilter = this.ctx!.createBiquadFilter();
        waterFilter.type = 'lowpass';
        waterFilter.frequency.value = filterFreq;
        const waterGain = this.ctx!.createGain();
        waterGain.gain.value = vol;
        waterSrc.connect(waterFilter);
        waterFilter.connect(waterGain);
        waterGain.connect(this.bgmMasterGain!);
        waterSrc.start();
        this.bgmNodes.push(waterSrc, waterFilter, waterGain);
    };

    const addWind = (centerFreq: number, vol: number) => {
        const breezeSrc = this.ctx!.createBufferSource();
        breezeSrc.buffer = noiseBuffer;
        breezeSrc.loop = true;
        const breezeFilter = this.ctx!.createBiquadFilter();
        breezeFilter.type = 'bandpass';
        breezeFilter.frequency.value = centerFreq; 
        breezeFilter.Q.value = 0.4;
        const breezeLFO = this.ctx!.createOscillator();
        breezeLFO.type = 'sine';
        breezeLFO.frequency.value = 0.05; 
        const breezeLFOGain = this.ctx!.createGain();
        breezeLFOGain.gain.value = centerFreq * 0.5; 
        breezeLFO.connect(breezeLFOGain);
        breezeLFOGain.connect(breezeFilter.frequency);
        const breezeVolGain = this.ctx!.createGain();
        breezeVolGain.gain.value = 0;
        const breezeVolLFO = this.ctx!.createOscillator();
        breezeVolLFO.type = 'sine';
        breezeVolLFO.frequency.value = 0.06; 
        const breezeVolLFOGain = this.ctx!.createGain();
        breezeVolLFOGain.gain.value = vol; 
        breezeVolLFO.connect(breezeVolLFOGain);
        breezeVolLFOGain.connect(breezeVolGain.gain);
        breezeSrc.connect(breezeFilter);
        breezeFilter.connect(breezeVolGain);
        breezeVolGain.connect(this.bgmMasterGain!);
        breezeSrc.start();
        breezeLFO.start();
        breezeVolLFO.start();
        this.bgmNodes.push(breezeSrc, breezeFilter, breezeLFO, breezeLFOGain, breezeVolGain, breezeVolLFO, breezeVolLFOGain);
    };

    const addDrone = (freq: number, vol: number) => {
        const droneOsc = this.ctx!.createOscillator();
        droneOsc.type = 'triangle';
        droneOsc.frequency.value = freq; 
        const dronePitchLFO = this.ctx!.createOscillator();
        dronePitchLFO.type = 'sine';
        dronePitchLFO.frequency.value = 0.02;
        const dronePitchGain = this.ctx!.createGain();
        dronePitchGain.gain.value = 2; 
        dronePitchLFO.connect(dronePitchGain);
        dronePitchGain.connect(droneOsc.frequency);
        const droneFilter = this.ctx!.createBiquadFilter();
        droneFilter.type = 'lowpass';
        droneFilter.frequency.value = freq * 3; 
        const droneGain = this.ctx!.createGain();
        droneGain.gain.value = vol * 0.5; 
        const droneVolLFO = this.ctx!.createOscillator();
        droneVolLFO.type = 'sine';
        droneVolLFO.frequency.value = 0.03; 
        const droneVolGainLFOMultiplier = this.ctx!.createGain();
        droneVolGainLFOMultiplier.gain.value = vol * 0.5; 
        droneVolLFO.connect(droneVolGainLFOMultiplier);
        droneVolGainLFOMultiplier.connect(droneGain.gain);
        droneOsc.connect(droneFilter);
        droneFilter.connect(droneGain);
        droneGain.connect(this.bgmMasterGain!);
        droneOsc.start();
        dronePitchLFO.start();
        droneVolLFO.start();
        this.bgmNodes.push(droneOsc, dronePitchLFO, dronePitchGain, droneFilter, droneGain, droneVolLFO, droneVolGainLFOMultiplier);
    };

    // Very soft sine wave notes fading in and out slowly
    const addChimes = (notes: number[], speed: number) => {
        let noteIdx = 0;
        const playNote = () => {
           if (!this.bgmActive || !this.ctx) return;
           const t = this.ctx.currentTime;
           const freq = notes[noteIdx];
           noteIdx = (Math.floor(Math.random() * notes.length));
           const st = t + 0.1 + (Math.random() * 0.5); 
           const osc = this.ctx.createOscillator();
           osc.type = 'sine'; 
           const gain = this.ctx.createGain();
           gain.gain.setValueAtTime(0, st);
           gain.gain.linearRampToValueAtTime(0.08, st + 2.0); 
           gain.gain.exponentialRampToValueAtTime(0.001, st + 6.0); 
           osc.connect(gain);
           gain.connect(this.bgmMasterGain!);
           osc.start(st);
           osc.stop(st + 6.0);
        };
        playNote();
        this.bgmInterval = setInterval(playNote, speed);
    };

    const addBirds = (freqStart: number, interval: number) => {
        const playBird = () => {
          if (!this.bgmActive || !this.ctx) return;
          const numChirps = Math.floor(Math.random() * 2) + 1;
          let timeOffset = 0;
          for(let i=0; i<numChirps; i++) {
             const t = this.ctx.currentTime + timeOffset;
             const osc = this.ctx.createOscillator();
             osc.type = 'sine';
             const baseFreq = freqStart + Math.random() * 400;
             osc.frequency.setValueAtTime(baseFreq, t);
             osc.frequency.linearRampToValueAtTime(baseFreq + 150, t + 0.1); 
             const gain = this.ctx.createGain();
             gain.gain.setValueAtTime(0, t);
             gain.gain.linearRampToValueAtTime(0.015, t + 0.05); 
             gain.gain.linearRampToValueAtTime(0, t + 0.15);
             osc.connect(gain);
             gain.connect(this.bgmMasterGain!);
             osc.start(t);
             osc.stop(t + 0.15);
             timeOffset += 0.3 + Math.random() * 0.2; 
          }
          this.bgmTimeouts.push(setTimeout(playBird, interval / 2 + Math.random() * interval));
        };
        this.bgmTimeouts.push(setTimeout(playBird, 2000));
    };

    // Route by theme
    if (theme === 'spa') {
       addWater(500, 0.2);
       addDrone(110, 0.15);
       addChimes([261.63, 329.63, 392.00], 6000);
    } else if (theme === 'meditation') {
       addDrone(65.41, 0.2); // deep C2
       addWind(400, 0.1);
       addChimes([130.81, 196.00], 8000);
    } else if (theme === 'morning') {
       addWind(1200, 0.15);
       addBirds(2500, 5000);
       addChimes([523.25, 659.25, 783.99], 4000);
    } else if (theme === 'jungle') {
       addWater(800, 0.3);
       addWind(800, 0.1);
       addBirds(2000, 4000);
    } else if (theme === 'deep_sleep') {
       addDrone(55, 0.2);
       addWater(300, 0.25); // very dark water noise (sounds like rain outside)
    } else if (theme === 'relax') {
       addDrone(130.81, 0.1); // C3
       addWater(600, 0.15);
       addChimes([349.23, 440.00, 523.25], 5000);
       addBirds(2200, 10000); // sparse birds
    } else if (theme === 'mind_relax') {
       addDrone(98.00, 0.15); // G2
       addWind(600, 0.15);
       addChimes([196.00, 293.66, 440.00], 7000);
    }
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

  play(type: 'nom' | 'meow' | 'win' | 'lose' | 'step' | 'heartbeat' | 'caught' | 'trap' | 'ding') {
    if (this.onPlay) this.onPlay(type);
    if (!this.ctx || !this.enabled || this.volume === 0) return;
    if (this.ctx.state !== 'running') return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    if (type === 'ding') {
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
    } else if (type === 'meow') {
      // Soft chime
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(400, t + 0.3);
      gain.gain.setValueAtTime(0.3 * this.volume, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
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
      // Very soft rustle or tap
      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(50, t + 0.05);
      gain.gain.setValueAtTime(0.05 * this.volume, t);
      gain.gain.linearRampToValueAtTime(0.01, t + 0.05);
      osc.connect(gain); gain.connect(this.ctx.destination);
      osc.start(t); osc.stop(t + 0.05);
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

