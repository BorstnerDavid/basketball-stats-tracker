import { useEffect, useState } from 'react';
import { clockRemaining, fmtClock } from '../lib/live.js';

// Renders the game clock and ticks locally while it's running -
// no database traffic needed to animate it.
export default function Clock({ clock, style }) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!clock?.running) return;
    const t = setInterval(() => force((x) => x + 1), 250);
    return () => clearInterval(t);
  }, [clock?.running, clock?.updatedAt]);

  return (
    <span className="display num" style={{ fontSize: '1.4rem', ...style }}>
      {fmtClock(clockRemaining(clock))}
    </span>
  );
}
