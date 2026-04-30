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
 * System Metrics Component
 * Displays key operational metrics in a 2x2 grid
 * - Bills Processed
 * - Zones Covered
 * - Payment Success Rate
 * - Total Operations
 *
 * Features animated counters and scroll-triggered animations
 */
export default function SystemMetrics() {
  const [stats, setStats] = useState<HomepageStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        console.log('[SystemMetrics] Fetching stats...');
        const response = await fetch('/api/homepage-stats');
        const result = await response.json();

        if (result.success && result.data) {
          console.log('[SystemMetrics] Stats loaded:', result.data);
          setStats(result.data);
        }
      } catch (err) {
        console.error('[SystemMetrics] Error fetching stats:', err);
        // Fallback stats
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

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10 animate-pulse">
            <div className="h-12 w-24 bg-white/10 rounded mx-auto mb-2"></div>
            <div className="h-4 w-32 bg-white/5 rounded mx-auto"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const metrics = [
    {
      value: stats.billsProcessed,
      label: 'Bills Processed',
      suffix: '+',
      gradient: 'from-yellow-400 to-orange-500'
    },
    {
      value: stats.zonesCovered,
      label: 'Zones Covered',
      suffix: '+',
      gradient: 'from-blue-400 to-cyan-500'
    },
    {
      value: stats.paymentSuccessRate,
      label: 'Payment Success',
      suffix: '%',
      decimals: 1,
      gradient: 'from-green-400 to-emerald-500'
    },
    {
      value: stats.totalCustomers + stats.paymentsCompleted,
      label: 'Total Operations',
      suffix: '+',
      gradient: 'from-purple-400 to-pink-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 gap-4">
      {metrics.map((metric, index) => (
        <motion.div
          key={index}
          className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/10"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{
            duration: 0.5,
            delay: index * 0.1,
            ease: 'easeOut'
          }}
        >
          <div className={`text-3xl font-bold bg-gradient-to-r ${metric.gradient} bg-clip-text text-transparent pb-1`}>
            <CountUp
              start={0}
              end={metric.value}
              decimals={metric.decimals ?? 0}
              duration={2}
              separator=","
              suffix={metric.suffix}
            />
          </div>
          <div className="text-gray-400 mt-2 text-sm">{metric.label}</div>
        </motion.div>
      ))}
    </div>
  );
}
