import { useRef, useCallback } from 'react';

export type SoundType = 'move' | 'switch' | 'win' | 'error' | 'collect';

export const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const audioUnlockedRef = useRef(false);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioCtx.current;
  }, []);

  const unlockAudio = useCallback(() => {
    const ctx = ensureAudioContext();
    if (!ctx) return Promise.resolve();

    if (ctx.state === 'suspended') {
      return ctx.resume().then(() => {
        audioUnlockedRef.current = ctx.state === 'running';
      });
    }

    audioUnlockedRef.current = ctx.state === 'running';
    return Promise.resolve();
  }, [ensureAudioContext]);

  const playSound = useCallback((type: SoundType) => {
    const ctx = ensureAudioContext();
    if (!ctx || !audioUnlockedRef.current || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;

    switch (type) {
      case 'move':
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;

      case 'switch':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.15);
        osc.start(now);
        osc.stop(now + 0.15);
        break;

      case 'win':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554, now + 0.1);
        osc.frequency.setValueAtTime(659, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
        break;

      case 'collect':
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.linearRampToValueAtTime(660, now + 0.08);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.02, now + 0.18);
        osc.start(now);
        osc.stop(now + 0.18);
        break;

      case 'error':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(90, now);
        osc.frequency.linearRampToValueAtTime(60, now + 0.15);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.005, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
    }
  }, [ensureAudioContext]);

  return { unlockAudio, playSound };
};
