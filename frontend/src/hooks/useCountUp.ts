import { useEffect, useState } from 'react';

export function useCountUp(target: number, duration = 700) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }

    const startedAt = performance.now();
    let frame = 0;

    const updateValue = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setValue(Math.round(target * easedProgress));

      if (progress < 1) {
        frame = window.requestAnimationFrame(updateValue);
      }
    };

    frame = window.requestAnimationFrame(updateValue);

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [duration, target]);

  return value;
}
