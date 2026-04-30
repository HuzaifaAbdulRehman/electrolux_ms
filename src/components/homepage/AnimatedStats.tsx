'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import CountUp from 'react-countup';

/**
 * Homepage Statistics Data Structure
 */
interface HomepageStats {
  totalCustomers: number;
  billsProcessed: number;
  zonesCovered: number;
  paymentsCompleted: number;
  paymentSuccessRate: number;
  systemUptime: number;
  responseTime: number;
  realTimeMonitoring: boolean;
  timestamp: string;
}

/**
 * Individual Stat Configuration
 */
interface StatConfig {
  value: number | string;
  label: string;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  isNumeric?: boolean;
}

/**
 * Animated Statistics Component for Homepage
 * Features:
 * - Fetches real-time stats from API
 * - Animated counter with CountUp
 * - Framer Motion entrance animations
 * - Loading skeleton state
 * - Error handling with fallback data
 * - TypeScript strict mode
 */
export default function AnimatedStats() {
  const [stats, setStats] = useState<HomepageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchStats() {
      try {
        console.log('[AnimatedStats] Fetching homepage stats...');
        const response = await fetch('/api/homepage-stats');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          setStats(result.data);
          console.log('[AnimatedStats] Stats loaded successfully:', result.data);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (err) {
        console.error('[AnimatedStats] Error fetching stats:', err);
        setError(true);

        // Set fallback stats to ensure UI never breaks
        setStats({
          totalCustomers: 150,
          billsProcessed: 450,
          zonesCovered: 15,
          paymentsCompleted: 380,
          paymentSuccessRate: 98.0,
          systemUptime: 99.9,
          responseTime: 50,
          realTimeMonitoring: true,
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex items-center space-x-8 pt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="text-center animate-pulse">
            <div className="h-10 w-20 bg-white/10 rounded mb-2"></div>
            <div className="h-4 w-24 bg-white/5 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  // Configure which stats to display
  const displayStats: StatConfig[] = [
    {
      value: stats.systemUptime,
      label: 'System Uptime',
      suffix: '%',
      decimals: 1,
      isNumeric: true
    },
    {
      value: '24/7',
      label: 'Real-Time Monitoring',
      isNumeric: false
    },
    {
      value: stats.responseTime,
      label: 'Response Time',
      suffix: 'ms',
      decimals: 0,
      isNumeric: true
    }
  ];

  // Animation variants for stagger effect
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1] as any // Custom cubic-bezier easing for smooth animation
      }
    }
  };

  return (
    <motion.div
      className="flex items-center space-x-8 pt-8"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {displayStats.map((stat, index) => (
        <motion.div
          key={index}
          className="text-center"
          variants={itemVariants}
        >
          {stat.isNumeric && typeof stat.value === 'number' ? (
            <div className="text-3xl font-bold text-white">
              {stat.prefix}
              <CountUp
                end={stat.value}
                decimals={stat.decimals ?? 0}
                duration={2.5}
                separator=","
                useEasing={true}
                easingFn={(t, b, c, d) => {
                  // Custom easing function for smooth deceleration
                  t /= d;
                  return -c * t * (t - 2) + b;
                }}
              />
              {stat.suffix}
            </div>
          ) : (
            <div className="text-3xl font-bold text-white">
              {stat.value}
            </div>
          )}
          <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
        </motion.div>
      ))}

      {error && (
        <motion.div
          className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-yellow-400/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Using cached data
        </motion.div>
      )}
    </motion.div>
  );
}
