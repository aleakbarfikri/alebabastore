import React from 'react';
import { motion } from 'framer-motion';

const StatisticsCard = ({ title, value, icon: Icon, colorClass, bgClass, delay = 0 }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card-surface rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 group"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2 tracking-wide uppercase">
            {title}
          </h3>
          <p className="text-4xl md:text-5xl font-extrabold text-foreground tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {value}
          </p>
        </div>
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 ${bgClass} ${colorClass}`}>
          <Icon className="w-8 h-8" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatisticsCard;