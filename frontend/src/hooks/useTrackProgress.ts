import { useEffect, useRef, useState, type MutableRefObject, type RefObject } from 'react';

/**
 * Smooth 0..1 progress through a tall sticky track.
 *
 * - progressRef updates every animation frame (for the 3D rig — zero React cost)
 * - progress state throttles to ~30fps so chapter UI stays smooth without
 *   re-rendering the whole hangar 60×/sec
 */
export function useTrackProgress(trackRef: RefObject<HTMLElement | null>): {
  progress: number;
  progressRef: MutableRefObject<number>;
} {
  const [progress, setProgress] = useState(0);
  const progressRef = useRef(0);
  const rawRef = useRef(0);
  const smoothRef = useRef(0);
  const lastEmittedRef = useRef(0);
  const lastEmitAt = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    const readRaw = () => {
      const el = trackRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      const total = el.offsetHeight - window.innerHeight;
      const traveled = -rect.top;
      if (total <= 0) return 0;
      return Math.min(1, Math.max(0, traveled / total));
    };

    const onScroll = () => {
      rawRef.current = readRaw();
    };

    const tick = (now: number) => {
      const next = smoothRef.current + (rawRef.current - smoothRef.current) * 0.14;
      if (Math.abs(next - smoothRef.current) > 0.00005) {
        smoothRef.current = next;
      } else if (Math.abs(rawRef.current - smoothRef.current) > 0.00002) {
        smoothRef.current = rawRef.current;
      }

      progressRef.current = smoothRef.current;

      const settled = Math.abs(rawRef.current - smoothRef.current) < 0.0003;
      if ((now - lastEmitAt.current > 33 || settled) && Math.abs(smoothRef.current - lastEmittedRef.current) > 0.00025) {
        lastEmitAt.current = now;
        lastEmittedRef.current = smoothRef.current;
        setProgress(smoothRef.current);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rawRef.current = readRaw();
    smoothRef.current = rawRef.current;
    progressRef.current = rawRef.current;
    lastEmittedRef.current = rawRef.current;
    setProgress(rawRef.current);
    lastEmitAt.current = performance.now();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(rafRef.current);
    };
  }, [trackRef]);

  return { progress, progressRef };
}
