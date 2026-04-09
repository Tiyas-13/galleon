'use client';
import { useMemo } from 'react';

// Seeded pseudo-random so values are consistent between renders (no hydration mismatch)
function r(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const EMBERS = Array.from({ length: 150 }, (_, i) => ({
  id:       i,
  left:     `${r(i * 3)     * 96 + 2}%`,
  size:     `${r(i * 3 + 1) * 4  + 3}px`,  // 3–7px
  duration: `${r(i * 3 + 2) * 12 + 14}s`,  // 14–26s, slow and drifty
  delay:    `-${r(i * 7)    * 22}s`,        // stagger across full cycle
  drift:    `${(r(i * 5) - 0.5) * 70}px`,
  opacity:  r(i * 11) * 0.2 + 0.12,        // 0.12–0.32, subtle
}));

export default function Embers() {
  return (
    <div className="embers-container">
      {EMBERS.map(e => (
        <div
          key={e.id}
          className="ember"
          style={{
            left:              e.left,
            width:             e.size,
            height:            e.size,
            animationDuration: e.duration,
            animationDelay:    e.delay,
            opacity:           e.opacity,
            '--drift':         e.drift,
          }}
        />
      ))}
    </div>
  );
}
