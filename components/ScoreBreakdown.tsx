'use client';

import { motion } from 'framer-motion';

interface Category {
  name: string;
  score: number;
  weight: number;
}

function getColor(score: number) {
  if (score < 40) return 'bg-[#e05555]';
  if (score < 70) return 'bg-[#d4952b]';
  return 'bg-[#4aab6a]';
}

export default function ScoreBreakdown({ categories }: { categories: Category[] }) {
  return (
    <div className="space-y-4 w-full max-w-lg">
      {categories.map((cat, i) => (
        <div key={cat.name}>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-sm font-medium text-warm-white">{cat.name}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-warm-gray-light">{cat.weight}%</span>
              <span className="text-sm font-semibold text-warm-white">{cat.score}/100</span>
            </div>
          </div>
          <div className="h-2 bg-warm-white/8 rounded-full overflow-hidden">
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
