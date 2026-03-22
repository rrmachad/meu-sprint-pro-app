const ctx = () => new (window.AudioContext || (window as any).webkitAudioContext)();

export function playSuccessChime() {
  try {
    const ac = ctx();
    const now = ac.currentTime;

    // Two-note ascending chime
    const notes = [523.25, 659.25]; // C5, E5
    notes.forEach((freq, i) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
      osc.connect(gain).connect(ac.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.45);
    });

    // Auto-close context after sound finishes
    setTimeout(() => ac.close(), 800);
  } catch {
    // Silently ignore if audio is unavailable
  }
}
