import React from 'react';
import { motion } from 'framer-motion';
import type { DroneSpecs } from '@/shared/types';

interface SpecsDisplayProps {
  specs: DroneSpecs;
  isAnimating?: boolean;
}

const specItems = [
  { key: 'totalWeight', label: 'Total Weight', unit: 'g', icon: '⚖️', color: '#60a5fa' },
  { key: 'maxThrust', label: 'Max Thrust', unit: 'g', icon: '⬆️', color: '#34d399' },
  { key: 'thrustToWeight', label: 'T/W Ratio', unit: '×', icon: '📊', color: '#a78bfa' },
  { key: 'estimatedFlightTime', label: 'Flight Time', unit: 'min', icon: '⏱️', color: '#fbbf24' },
  { key: 'maxSpeed', label: 'Max Speed', unit: 'km/h', icon: '🚀', color: '#f87171' },
  { key: 'hoverCurrent', label: 'Hover Draw', unit: 'A', icon: '🔌', color: '#22d3ee' },
  { key: 'hoverThrottle', label: 'Hover Throttle', unit: '%', icon: '🎚️', color: '#f472b6' },
  { key: 'buildCost', label: 'Build Cost', unit: '₹', icon: '💰', color: '#4ade80', prefix: '₹', noUnit: true },
] as const;

export const SpecsDisplay: React.FC<SpecsDisplayProps> = ({ specs, isAnimating = false }) => {
  return (
    <motion.div
      className="rounded-2xl border border-blue-900/30 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, rgba(10,20,50,0.8), rgba(15,30,70,0.6))' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="px-5 py-3 border-b border-blue-900/30 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ boxShadow: '0 0 8px #4ade80' }} />
        <h2 className="text-sm font-bold text-blue-200 tracking-wider uppercase">Live Specs</h2>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4">
        {specItems.map((spec, index) => {
          const raw = specs[spec.key as keyof DroneSpecs] ?? 0;
          const display = spec.key === 'buildCost' ? `₹${raw}` : `${raw}${spec.unit}`;

          return (
            <motion.div
              key={spec.key}
              className="rounded-xl p-3 border border-white/5 relative overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.03)' }}
              animate={isAnimating ? { scale: [1, 1.06, 1] } : {}}
              transition={isAnimating ? { duration: 0.5, delay: index * 0.08 } : {}}
              whileHover={{ scale: 1.03 }}
            >
              <div className="absolute inset-0 opacity-5 rounded-xl" style={{ background: `radial-gradient(circle at 30% 30%, ${spec.color}, transparent)` }} />
              <div className="text-xl mb-1">{spec.icon}</div>
              <div className="text-xs text-slate-500 font-medium">{spec.label}</div>
              <div className="text-lg font-black mt-0.5" style={{ color: spec.color, textShadow: `0 0 12px ${spec.color}66` }}>
                {display}
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};
