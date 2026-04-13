'use client';

import { motion } from 'framer-motion';

interface Category {
  name: string;
  score: number;
  weight: number;
}

function getColor(score: number) {
  if (score < 40) return 'bg-error';
  if (score < 70) return 'bg-primary';
  return 'bg-tertiary';
}

export default function ScoreBreakdown({ categories }: { categories: Category[] }) {
  return (
    <div className="space-y-4 w-full max-w-lg">
      {categories.map((cat, i) => (
        <div key={cat.name}>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-medium text-on-surface">{cat.name}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-on-surface-light">{cat.weight}%</span>
              <span className="text-sm font-semibold text-on-surface">{cat.score}/100</span>
            </div>
          </div>
          <div className="h-2 bg-surface-high rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${getColor(cat.score)}`}
              initial={{ width: 0 }}
              animate={{ width: `${cat.score}%` }}
              transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
