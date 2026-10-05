'use strict';
// ===== サウンド（WebAudio 合成：効果音 + ステージ BGM） =====
const Sound = (() => {
  let ctx = null, master = null, sfxBus = null, bgmBus = null, noiseBuf = null;
  let muted = false;
  let lastShoot = 0, lastPop = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = 0.55; master.connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
      bgmBus = ctx.createGain(); bgmBus.gain.value = 0.32; bgmBus.connect(master);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { return false; }
    return true;
  }
  function resume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }
  function now() { return ctx ? ctx.currentTime : 0; }

  function tone(o) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(Math.max(1, o.freq), t0);
    if (o.freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t0 + o.dur);
    const g = ctx.createGain();
    const vol = o.vol === undefined ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (o.attack || 0.005));
    if (o.hold) g.gain.setValueAtTime(vol, t0 + o.hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + o.dur + 0.03);
  }
  function noise(o) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1000, t0);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t0 + o.dur);
    f.Q.value = o.q || 1;
    const g = ctx.createGain();
    const vol = o.vol === undefined ? 0.2 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + (o.attack || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
    src.connect(f); f.connect(g); g.connect(o.bus || sfxBus);
    src.start(t0); src.stop(t0 + o.dur + 0.03);
  }

  const sfx = {
    shoot(idx = 0) {
      const t = performance.now(); if (t - lastShoot < 45) return; lastShoot = t;
      const base = [760, 320, 620, 540, 480, 700, 580, 900, 420, 660][idx % 10];
      tone({ type: idx === 1 ? 'triangle' : 'square', freq: base, freqEnd: base * 0.55, dur: 0.07, vol: 0.06 });
    },
    pop(chain = 0) {
      const t = performance.now(); if (t - lastPop < 25 && chain === 0) return; lastPop = t;
      const f = 420 * Math.pow(1.12, Math.min(chain, 14));
      tone({ type: 'sine', freq: f, freqEnd: f * 2.2, dur: 0.12, vol: 0.22 });
      noise({ filter: 'bandpass', freq: 1800 + chain * 150, freqEnd: 3500, q: 2, dur: 0.08, vol: 0.12 });
      if (chain >= 2) tone({ type: 'triangle', freq: f * 1.5, freqEnd: f * 3, dur: 0.16, vol: 0.12, delay: 0.03 });
    },
    optionShot() { const t = performance.now(); if (t - lastShoot < 40) return; tone({ type: 'sine', freq: 1200, freqEnd: 700, dur: 0.06, vol: 0.04 }); },
    hit() { tone({ type: 'square', freq: 220, freqEnd: 180, dur: 0.03, vol: 0.03 }); },
    explode(size = 1) {
      noise({ freq: 900 * size, freqEnd: 80, dur: 0.35 + 0.2 * size, vol: 0.3 });
      tone({ type: 'sine', freq: 140, freqEnd: 35, dur: 0.4, vol: 0.3 });
    },
    item() { [660, 880, 1320].forEach((f, i) => tone({ type: 'triangle', freq: f, dur: 0.12, vol: 0.16, delay: i * 0.06 })); },
    powerup() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'square', freq: f, dur: 0.14, vol: 0.12, delay: i * 0.07 })); },
    weapon() { [392, 523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', freq: f, dur: 0.16, vol: 0.14, delay: i * 0.05 })); },
    heal() { [784, 988, 1175].forEach((f, i) => tone({ type: 'sine', freq: f, dur: 0.2, vol: 0.14, delay: i * 0.08 })); },
    hurt() { tone({ type: 'sawtooth', freq: 220, freqEnd: 50, dur: 0.3, vol: 0.25 }); noise({ freq: 2000, freqEnd: 200, dur: 0.25, vol: 0.2 }); },
    shieldHit() { tone({ type: 'triangle', freq: 900, freqEnd: 400, dur: 0.15, vol: 0.2 }); },
    death() {
      noise({ freq: 3000, freqEnd: 60, dur: 1.0, vol: 0.4 });
      [440, 392, 330, 262].forEach((f, i) => tone({ type: 'square', freq: f, freqEnd: f * 0.5, dur: 0.3, vol: 0.15, delay: i * 0.15 }));
    },
    bomb() {
      noise({ freq: 400, freqEnd: 40, dur: 1.2, vol: 0.4 });
      tone({ type: 'sawtooth', freq: 60, freqEnd: 20, dur: 1.0, vol: 0.35 });
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone({ type: 'square', freq: f, dur: 0.18, vol: 0.14, delay: 0.5 + i * 0.07 }));
    },
    charge(level) { tone({ type: 'sine', freq: 300 + level * 500, freqEnd: 350 + level * 500, dur: 0.06, vol: 0.05 }); },
    chargeReady() { [880, 1320, 1760].forEach((f, i) => tone({ type: 'sine', freq: f, dur: 0.1, vol: 0.12, delay: i * 0.04 })); },
    chargeShot() { tone({ type: 'sawtooth', freq: 90, freqEnd: 500, dur: 0.4, vol: 0.3 }); noise({ freq: 600, freqEnd: 3000, dur: 0.3, vol: 0.15, filter: 'bandpass' }); },
    bounce() { tone({ type: 'square', freq: 1200, freqEnd: 1800, dur: 0.05, vol: 0.05 }); },
    warning() { for (let i = 0; i < 3; i++) { tone({ type: 'square', freq: 520, dur: 0.25, vol: 0.14, delay: i * 0.55 }); tone({ type: 'square', freq: 390, dur: 0.25, vol: 0.14, delay: i * 0.55 + 0.27 }); } },
    bossHit() { tone({ type: 'square', freq: 160, freqEnd: 120, dur: 0.05, vol: 0.05 }); },
    bossDie() {
      for (let i = 0; i < 8; i++) { noise({ freq: 1500, freqEnd: 60, dur: 0.5, vol: 0.3, delay: i * 0.22 }); tone({ type: 'sine', freq: 120 + i * 30, freqEnd: 30, dur: 0.5, vol: 0.25, delay: i * 0.22 }); }
    },
    clear() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone({ type: 'square', freq: f, dur: i === 6 ? 0.6 : 0.16, vol: 0.14, delay: i * 0.13 })); },
    select() { tone({ type: 'square', freq: 880, freqEnd: 1100, dur: 0.06, vol: 0.1 }); },
    start() { [523, 659, 784, 1046].forEach((f, i) => tone({ type: 'triangle', freq: f, dur: 0.2, vol: 0.16, delay: i * 0.08 })); },
    fever() { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone({ type: 'sawtooth', freq: f, dur: 0.14, vol: 0.12, delay: i * 0.06 })); },
    oneup() { [659, 784, 1318, 1046, 1175, 1568].forEach((f, i) => tone({ type: 'square', freq: f, dur: 0.14, vol: 0.14, delay: i * 0.09 })); },
    chainText(n) { tone({ type: 'triangle', freq: 600 + n * 90, freqEnd: 900 + n * 120, dur: 0.15, vol: 0.14 }); },
    enemyShot() { tone({ type: 'sine', freq: 500, freqEnd: 300, dur: 0.05, vol: 0.04 }); },
    switchWeapon() { tone({ type: 'square', freq: 700, freqEnd: 1000, dur: 0.07, vol: 0.08 }); tone({ type: 'square', freq: 1000, freqEnd: 1300, dur: 0.07, vol: 0.08, delay: 0.06 }); },
  };

  // ===== BGM シーケンサー =====
  const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], PENTA = [0, 2, 4, 7, 9], DORIAN = [0, 2, 3, 5, 7, 9, 10], PHRYG = [0, 1, 4, 5, 7, 8, 10];
  const SONGS = {
    title: { bpm: 104, root: 60, scale: MAJOR, lead: 'triangle', bass: 'triangle', seed: 7, drums: false, chords: [0, 3, 5, 4], arp: true },
    stage: [
      { bpm: 132, root: 60, scale: MAJOR, lead: 'square', bass: 'triangle', seed: 11, drums: true, chords: [0, 5, 3, 4], arp: false },
      { bpm: 122, root: 62, scale: PENTA, lead: 'triangle', bass: 'sine', seed: 23, drums: true, chords: [0, 3, 4, 3], arp: true },
      { bpm: 144, root: 57, scale: MINOR, lead: 'sawtooth', bass: 'square', seed: 37, drums: true, chords: [0, 5, 2, 4], arp: true },
      { bpm: 112, root: 55, scale: DORIAN, lead: 'sine', bass: 'triangle', seed: 41, drums: true, chords: [0, 2, 3, 6], arp: false },
      { bpm: 156, root: 52, scale: PHRYG, lead: 'square', bass: 'sawtooth', seed: 59, drums: true, chords: [0, 1, 0, 4], arp: true },
      { bpm: 118, root: 64, scale: [0, 2, 4, 7, 9], lead: 'triangle', bass: 'triangle', seed: 71, drums: true, chords: [0, 4, 5, 3], arp: true },
      { bpm: 148, root: 55, scale: MINOR, lead: 'sawtooth', bass: 'square', seed: 83, drums: true, chords: [0, 3, 5, 4], arp: false },
      { bpm: 108, root: 67, scale: MAJOR, lead: 'sine', bass: 'triangle', seed: 97, drums: true, chords: [0, 5, 3, 4], arp: true },
    ],
    boss: [
      { bpm: 150, root: 57, scale: MINOR, lead: 'square', bass: 'sawtooth', seed: 101, drums: true, chords: [0, 0, 5, 4], arp: true },
      { bpm: 146, root: 55, scale: MINOR, lead: 'sawtooth', bass: 'square', seed: 103, drums: true, chords: [0, 3, 0, 6], arp: true },
      { bpm: 160, root: 52, scale: PHRYG, lead: 'square', bass: 'sawtooth', seed: 107, drums: true, chords: [0, 1, 0, 1], arp: true },
      { bpm: 140, root: 50, scale: MINOR, lead: 'sawtooth', bass: 'triangle', seed: 109, drums: true, chords: [0, 5, 3, 4], arp: true },
      { bpm: 172, root: 48, scale: PHRYG, lead: 'sawtooth', bass: 'square', seed: 113, drums: true, chords: [0, 1, 5, 4], arp: true },
      { bpm: 152, root: 59, scale: MINOR, lead: 'square', bass: 'sawtooth', seed: 127, drums: true, chords: [0, 5, 3, 4], arp: true },
      { bpm: 164, root: 50, scale: PHRYG, lead: 'sawtooth', bass: 'square', seed: 131, drums: true, chords: [0, 1, 0, 5], arp: true },
      { bpm: 144, root: 62, scale: MINOR, lead: 'square', bass: 'triangle', seed: 137, drums: true, chords: [0, 3, 6, 4], arp: true },
    ],
  };
  const bgm = { song: null, pattern: null, step: 0, nextTime: 0, timer: null, key: '' };
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function buildPattern(song) {
    const rng = mulberry32(song.seed);
    const steps = 64;
    const lead = new Array(steps).fill(null), bass = new Array(steps).fill(null), arp = new Array(steps).fill(null);
    let idx = 7;
    for (let s = 0; s < steps; s++) {
      const bar = Math.floor(s / 16), chordDeg = song.chords[bar % song.chords.length];
      const inBar = s % 16;
      // bass
      if (inBar % 4 === 0 || (inBar % 8 === 6 && rng() < 0.6)) {
        const deg = inBar % 8 === 4 ? chordDeg + 4 : chordDeg;
        bass[s] = song.root - 24 + song.scale[((deg % song.scale.length) + song.scale.length) % song.scale.length] + 12 * Math.floor(deg / song.scale.length);
      }
      // lead: random walk mostly on chord tones
      if (rng() < (inBar % 2 === 0 ? 0.8 : 0.35)) {
        idx += Math.round((rng() - 0.5) * 4);
        idx = clamp(idx, 2, 13);
        let deg = idx;
        if (rng() < 0.5) { const ct = [chordDeg, chordDeg + 2, chordDeg + 4]; deg = ct[Math.floor(rng() * 3)] + 7 * Math.floor(idx / 7); }
        const oct = Math.floor(deg / song.scale.length), si = ((deg % song.scale.length) + song.scale.length) % song.scale.length;
        lead[s] = { n: song.root + song.scale[si] + 12 * oct, len: rng() < 0.3 ? 2 : 1 };
      }
      // arpeggio
      if (song.arp) {
        const ct = [chordDeg, chordDeg + 2, chordDeg + 4, chordDeg + 7];
        const deg = ct[inBar % 4];
        const oct = Math.floor(deg / song.scale.length), si = ((deg % song.scale.length) + song.scale.length) % song.scale.length;
        arp[s] = song.root + 12 + song.scale[si] + 12 * oct;
      }
    }
    return { lead, bass, arp, steps };
  }
  function note(freq, t, dur, type, vol) {
    const osc = ctx.createOscillator(); osc.type = type; osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + dur * 0.6); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(bgmBus); osc.start(t); osc.stop(t + dur + 0.02);
  }
  function drum(kind, t) {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); const g = ctx.createGain();
    if (kind === 'kick') {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
      const og = ctx.createGain(); og.gain.setValueAtTime(0.5, t); og.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      o.connect(og); og.connect(bgmBus); o.start(t); o.stop(t + 0.16); return;
    }
    if (kind === 'hat') { f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04); }
    else { f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7; g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12); }
    src.connect(f); f.connect(g); g.connect(bgmBus); src.start(t); src.stop(t + 0.15);
  }
  function schedule() {
    if (!bgm.song || !ctx) return;
    const song = bgm.song, pat = bgm.pattern, stepDur = 60 / song.bpm / 4;
    while (bgm.nextTime < ctx.currentTime + 0.15) {
      const s = bgm.step % pat.steps, t = bgm.nextTime;
      if (!muted) {
        const l = pat.lead[s]; if (l) note(midi(l.n), t, stepDur * l.len * 0.9, song.lead, 0.11);
        const b = pat.bass[s]; if (b !== null) note(midi(b), t, stepDur * 1.8, song.bass, 0.16);
        const a = pat.arp[s]; if (a !== null && s % 2 === 1) note(midi(a), t, stepDur * 0.8, 'triangle', 0.05);
        if (song.drums) {
          if (s % 8 === 0 || s % 16 === 10) drum('kick', t);
          if (s % 8 === 4) drum('snare', t);
          if (s % 2 === 1) drum('hat', t);
        }
      }
      bgm.nextTime += stepDur; bgm.step++;
    }
  }
  function play(key) {
    if (!ensure()) return;
    if (bgm.key === key) return;
    stop();
    let song = null;
    if (key === 'title') song = SONGS.title;
    else if (key.startsWith('stage')) song = SONGS.stage[parseInt(key.slice(5)) % SONGS.stage.length];
    else if (key.startsWith('boss')) song = SONGS.boss[parseInt(key.slice(4)) % SONGS.boss.length];
    if (!song) return;
    bgm.song = song; bgm.pattern = buildPattern(song); bgm.step = 0; bgm.key = key;
    bgm.nextTime = ctx.currentTime + 0.05;
    bgm.timer = setInterval(schedule, 40);
  }
  function stop() { if (bgm.timer) clearInterval(bgm.timer); bgm.timer = null; bgm.song = null; bgm.key = ''; }
  function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.55; return muted; }
  function isMuted() { return muted; }
  return { ensure, resume, sfx, play, stop, toggleMute, isMuted, now };
})();
