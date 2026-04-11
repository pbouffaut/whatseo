'use client';

import { useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

function getColor(score: number) {
  if (score < 40) return '#e05555';
  if (score < 70) return '#d4952b';
  return '#4aab6a';
}

export default function ScoreGauge({ score }: { score: number }) {
  const [displayed, setDisplayed] = useState(0);
  const mv = useMotionValue(0);
  const strokeDashoffset = useTransform(mv, [0, 100], [440, 440 - 440 * (score / 100)]);
  const color = getColor(score);

  useEffect(() => {
    const controls = animate(mv, score, {
      duration: 1.5,
      ease: 'easeOut',
      onUpdate: (v) => setDisplayed(Math.round(v)),
    });
    return controls.stop;
  }, [score, mv]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r="70" fill="none" stroke="rgba(245,240,232,0.08)" strokeWidth="10" />
          <motion.circle
            cx="80" cy="80" r="70" fill="none"
            stroke={color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray="440"
            style={{ strokeDashoffset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold" style={{ color }}>{displayed}</span>
          <span className="text-xs text-warm-gray-light mt-1">/ 100</span>
        </div>
      </div>
      <p className="text-sm text-warm-gray mt-3">SEO Health Score</p>
    </div>
  );
}
