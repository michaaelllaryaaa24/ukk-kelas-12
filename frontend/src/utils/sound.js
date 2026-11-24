/**
 * Utilitas Suara Notifikasi (`sound.js`)
 * -------------------------------------
 * Menggunakan Web Audio API bawaan browser (tanpa dependensi eksternal / file MP3)
 * untuk menghasilkan nada notifikasi halus bergaya aplikasi produktivitas modern
 * ketika tugas, sub-tugas, jadwal, atau timer fokus selesai dikerjakan.
 */

const SOUND_STORAGE_KEY = 'taskflow_sound_enabled';
const TIMER_TICK_STORAGE_KEY = 'taskflow_timer_tick_enabled';
let sharedAudioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx) {
    sharedAudioCtx = new AudioCtx();
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

/**
 * Memastikan AudioContext aktif saat pengguna menekan tombol (mengatasi blokir autoplay browser).
 */
export function unlockAudioContext() {
  try {
    getAudioContext();
  } catch {
    // Abaikan jika browser membatasi AudioContext
  }
}

export function isSoundEnabled() {
  try {
    const saved = localStorage.getItem(SOUND_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_STORAGE_KEY, String(Boolean(enabled)));
    window.dispatchEvent(new CustomEvent('taskflow:sound-changed', { detail: Boolean(enabled) }));
  } catch {
    // Abaikan jika storage diblokir browser
  }
}

export function isTimerTickEnabled() {
  try {
    const saved = localStorage.getItem(TIMER_TICK_STORAGE_KEY);
    return saved === null ? true : saved === 'true';
  } catch {
    return true;
  }
}

export function setTimerTickEnabled(enabled) {
  try {
    localStorage.setItem(TIMER_TICK_STORAGE_KEY, String(Boolean(enabled)));
  } catch {
    // Abaikan jika storage diblokir browser
  }
}

function playTone(ctx, freq, startOffset, duration, peakGain = 0.08, type = 'sine') {
  const startTime = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, startTime);

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
}

/**
 * Suara notifikasi saat Tugas atau Agenda Jadwal ditandai Selesai.
 * Nada naik lembut (C5 -> E5 -> G5) yang bersih dan tidak mengagetkan.
 */
export function playCompletionSound(force = false) {
  if (!force && !isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 523.25, 0.0, 0.16, 0.07, 'sine'); // C5
    playTone(ctx, 659.25, 0.08, 0.18, 0.07, 'sine'); // E5
    playTone(ctx, 783.99, 0.16, 0.34, 0.08, 'sine'); // G5
  } catch {
    // Abaikan jika browser membatasi AudioContext
  }
}

/**
 * Suara klik lembut saat satu item Sub-tugas dicentang selesai.
 */
export function playSubtaskSound() {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    playTone(ctx, 880, 0.0, 0.09, 0.045, 'sine'); // A5 singkat
  } catch {
    // Abaikan error audio
  }
}

/**
 * Suara detik jam mekanis halus ("tik-tok") setiap detik saat timer Pomodoro berjalan.
 */
export function playTimerTickSound(isOddSecond = false) {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const t = ctx.currentTime;
    const duration = 0.026;
    const highFreq = isOddSecond ? 840 : 1080;
    const lowFreq = isOddSecond ? 320 : 410;
    const peakGain = isOddSecond ? 0.032 : 0.038;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(highFreq, t);
    osc.frequency.exponentialRampToValueAtTime(lowFreq, t + duration);

    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.linearRampToValueAtTime(peakGain, t + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + duration + 0.01);
  } catch {
    // Abaikan error audio
  }
}

/**
 * Suara alarm bel merdu saat Timer Fokus Pomodoro (25:00 / 05:00) selesai.
 */
export function playTimerCompleteSound(force = false) {
  if (!force && !isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    // Lonceng ganda (D5 -> F#5 -> A5 -> D6, lalu gema lembut A5 -> D6)
    playTone(ctx, 587.33, 0.0, 0.22, 0.085, 'sine'); // D5
    playTone(ctx, 739.99, 0.13, 0.24, 0.085, 'sine'); // F#5
    playTone(ctx, 880.0, 0.26, 0.34, 0.095, 'sine'); // A5
    playTone(ctx, 1174.66, 0.4, 0.52, 0.09, 'sine'); // D6
    playTone(ctx, 880.0, 0.65, 0.28, 0.06, 'sine'); // A5
    playTone(ctx, 1174.66, 0.78, 0.55, 0.075, 'sine'); // D6
  } catch {
    // Abaikan error audio
  }
}

