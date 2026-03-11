import { useState, useEffect, useRef } from 'react';

export function useCountUp(end: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const prevEnd = useRef(0);
  const raf = useRef<number>();

  useEffect(() => {
    const start = prevEnd.current;
    const diff = end - start;
    if (diff === 0) return;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * eased));
      if (progress < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        prevEnd.current = end;
      }
    }

    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [end, duration]);

  return value;
}
