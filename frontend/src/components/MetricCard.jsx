import { useEffect, useState } from 'react';
import { FiTrendingUp, FiTrendingDown, FiMinus } from 'react-icons/fi';

/**
 * Animated Metric Card Component
 * 
 * Features:
 * - Animated counter (counts from 0 to value)
 * - Trend indicator (up/down/neutral)
 * - Color themes per metric type
 * - Hover effects
 * 
 * Usage:
 *   <MetricCard
 *     title="Today's Prescriptions"
 *     value={42}
 *     change="+12%"
 *     trend="up"
 *     icon={<FiFileText />}
 *     color="emerald"
 *   />
 */

const MetricCard = ({ 
  title, 
  value, 
  change, 
  trend = 'neutral', 
  icon, 
  color = 'emerald',
  subtitle,
  loading = false
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  
  // Animated counter effect
  useEffect(() => {
    if (loading || !value) return;
    
    let startTimestamp = null;
    const duration = 1000; // 1 second animation
    const startValue = 0;
    const endValue = typeof value === 'number' ? value : parseInt(value) || 0;
    
    const animate = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      // Easing function (ease-out cubic)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = Math.floor(startValue + (endValue - startValue) * easeProgress);
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, loading]);
  
  // Color configurations
  const colorConfig = {
    emerald: {
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      icon: 'bg-emerald-100 text-emerald-600',
      value: 'text-emerald-700',
      trend: {
        up: 'text-emerald-600 bg-emerald-50',
        down: 'text-emerald-600 bg-emerald-50',
        neutral: 'text-slate-500 bg-slate-50'
      },
      border: 'border-emerald-100'
    },
    amber: {
      bg: 'bg-gradient-to-br from-amber-50 to-orange-50',
      icon: 'bg-amber-100 text-amber-600',
      value: 'text-amber-700',
      trend: {
        up: 'text-amber-600 bg-amber-50',
        down: 'text-amber-600 bg-amber-50',
        neutral: 'text-slate-500 bg-slate-50'
      },
      border: 'border-amber-100'
    },
    red: {
      bg: 'bg-gradient-to-br from-red-50 to-pink-50',
      icon: 'bg-red-100 text-red-600',
      value: 'text-red-700',
      trend: {
        up: 'text-red-600 bg-red-50',
        down: 'text-red-600 bg-red-50',
        neutral: 'text-slate-500 bg-slate-50'
      },
      border: 'border-red-100'
    },
    blue: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      icon: 'bg-blue-100 text-blue-600',
      value: 'text-blue-700',
      trend: {
        up: 'text-blue-600 bg-blue-50',
        down: 'text-blue-600 bg-blue-50',
        neutral: 'text-slate-500 bg-slate-50'
      },
      border: 'border-blue-100'
    },
    purple: {
      bg: 'bg-gradient-to-br from-purple-50 to-indigo-50',
      icon: 'bg-purple-100 text-purple-600',
      value: 'text-purple-700',
      trend: {
        up: 'text-purple-600 bg-purple-50',
        down: 'text-purple-600 bg-purple-50',
        neutral: 'text-slate-500 bg-slate-50'
      },
      border: 'border-purple-100'
    }
  };
  
  const colors = colorConfig[color] || colorConfig.emerald;
  
  // Trend icon
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <FiTrendingUp className="w-3 h-3" />;
      case 'down':
        return <FiTrendingDown className="w-3 h-3" />;
      default:
        return <FiMinus className="w-3 h-3" />;
    }
  };
  
  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg ring-1 ring-slate-900/5 p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 bg-slate-200 rounded w-24"></div>
          <div className="w-12 h-12 rounded-xl bg-slate-200"></div>
        </div>
        <div className="h-8 bg-slate-200 rounded w-16 mb-2"></div>
        <div className="h-3 bg-slate-200 rounded w-20"></div>
      </div>
    );
  }
  
  return (
    <div className={`
      bg-white rounded-2xl shadow-lg ring-1 ring-slate-900/5 p-6
      hover:shadow-xl hover:scale-105 transition-all duration-300
      ${colors.border} border
    `}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
          {title}
        </h3>
        <div className={`
          w-12 h-12 rounded-xl flex items-center justify-center
          ${colors.icon}
          transform transition-transform duration-300 hover:scale-110
        `}>
          <div className="text-2xl">
            {icon}
          </div>
        </div>
      </div>
      
      {/* Value */}
      <div className={`text-4xl font-bold mb-2 ${colors.value} tabular-nums`}>
        {typeof displayValue === 'number' ? displayValue.toLocaleString() : displayValue}
      </div>
      
      {/* Trend & Subtitle */}
      <div className="flex items-center justify-between">
        {change && (
          <div className={`
            inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
            ${colors.trend[trend]}
          `}>
            {getTrendIcon()}
            <span>{change}</span>
          </div>
        )}
        
        {subtitle && (
          <span className="text-xs text-slate-500">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};

export default MetricCard;

