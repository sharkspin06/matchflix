// Short chat sound effects, synthesised with the Web Audio API (no audio files to load or license).
// Browsers only allow sound after the person has interacted with the page; until then these stay silent.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    // Suspended until a user gesture; resuming inside a tap/keypress unlocks it
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/** One soft tone: quick fade in, smooth fade out, so it never clicks */
function tone(ac: AudioContext, freq: number, start: number, duration: number, volume: number, endFreq?: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, start);
  if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Your message went out: a short rising "pop" */
export function playSendSound() {
  const ac = audio();
  if (!ac || ac.state !== 'running') return;
  tone(ac, 520, ac.currentTime, 0.12, 0.12, 880);
}

/** A message arrived: a gentle two-note chime */
export function playReceiveSound() {
  const ac = audio();
  if (!ac || ac.state !== 'running') return;
  const t = ac.currentTime;
  tone(ac, 880, t, 0.16, 0.1);
  tone(ac, 1320, t + 0.09, 0.22, 0.08);
}

/**
 * Call from any tap/keypress (e.g. on the chat page) so the first received message can
 * make a sound even if the person hasn't sent anything yet.
 */
export function unlockSounds() {
  audio();
}
