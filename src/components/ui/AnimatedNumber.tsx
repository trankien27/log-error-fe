import { useEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';

type AnimatedNumberProps = {
  value: number;
  /** Seconds; Material "medium4" (0.4s) fits a count-up of this size. */
  duration?: number;
  className?: string;
};

/** Counts from the previously shown value to `value` using the Material standard-decelerate curve. */
export default function AnimatedNumber({ value, duration = 0.4, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const previous = useRef(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduceMotion) {
      node.textContent = String(value);
      previous.current = value;
      return;
    }
    const controls = animate(previous.current, value, {
      duration,
      ease: [0, 0, 0, 1],
      onUpdate: latest => {
        node.textContent = String(Math.round(latest));
      },
    });
    previous.current = value;
    return () => controls.stop();
  }, [value, duration, reduceMotion]);

  return <span ref={ref} className={className}>{value}</span>;
}
