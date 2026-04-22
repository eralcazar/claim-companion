let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (ctx) return ctx;
  const Ctor = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function beep(ac: AudioContext, freq: number, startOffsetMs: number, durationMs: number) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.frequency.value = freq;
  osc.type = "sine";
  osc.connect(gain);
  gain.connect(ac.destination);

  const start = ac.currentTime + startOffsetMs / 1000;
  const end = start + durationMs / 1000;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.25, start + 0.02);
  gain.gain.linearRampToValueAtTime(0, end);
  osc.start(start);
  osc.stop(end + 0.05);
}

export function playReminderSound() {
  const ac = getCtx();
  if (!ac) return;
  if (ac.state === "suspended") ac.resume().catch(() => {});
  beep(ac, 880, 0, 200);
  beep(ac, 1100, 280, 200);
  beep(ac, 880, 560, 250);
}

export function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission === "default") {
    Notification.requestPermission().catch(() => {});
  }
}