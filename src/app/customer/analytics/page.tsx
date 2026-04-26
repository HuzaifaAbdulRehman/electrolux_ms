'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import DashboardLayout from '@/components/DashboardLayout';
import { safeNumber, formatCurrency, safeDate, formatUnits } from '@/lib/utils/dataHandlers';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Zap,
  Lightbulb,
  ThermometerSun,
  Wind,
  Clock
} from 'lucide-react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function UsageAnalytics() {
  const { data: session } = useSession();

  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [compareMode, setCompareMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);

  // Fetch real analytics data from database
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        console.log('[Analytics] Fetching data for period:', selectedPeriod);

        const response = await fetch(`/api/customer/dashboard?period=${selectedPeriod}`);
        const data = await response.json();

        console.log('[Analytics] API Response:', data);

        if (data.success) {
          setAnalyticsData(data);
        } else {
          throw new Error(data.error || 'Failed to fetch analytics');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
        // Fallback to basic data
        setAnalyticsData({
          success: true,
          data: {
            currentBill: null,
            recentBills: [],
            consumptionHistory: [],
            avgConsumption: 0
          }
        });
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedPeriod]); // Re-fetch when period changes

  if (loading) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600 dark:text-gray-400">Loading analytics...</div>
        </div>
      </DashboardLayout>
    );
  }

  // Extract real data from dashboard API response
  const consumptionHistory = analyticsData?.data?.consumptionHistory || [];
  const extendedConsumptionHistory = analyticsData?.data?.extendedConsumptionHistory || [];
  const recentBills = analyticsData?.data?.recentBills || [];
  const latestMeterReading = analyticsData?.data?.latestMeterReading || null;
  // Exclude installation/connection fee (zero-unit) entries from analytics visuals
  const consumptionHistoryFiltered = (consumptionHistory || []).filter((item: any) => safeNumber(item?.unitsConsumed, 0) > 0);
  const extendedConsumptionHistoryFiltered = (extendedConsumptionHistory || []).filter((item: any) => safeNumber(item?.unitsConsumed, 0) > 0);
  const billsWithConsumption = (recentBills || []).filter((bill: any) => safeNumber(bill?.unitsConsumed, 0) > 0);
  const currentBill = analyticsData?.data?.currentBill || null;
  const avgConsumptionFromAPI = analyticsData?.data?.avgConsumption || 0;

  // Calculate metrics from real data
  // Check if the most recent bill is actually from the current month
  const currentDate = new Date();
  const currentMonth = currentDate.toISOString().substring(0, 7); // e.g., "2025-10"

  const mostRecentBill = consumptionHistoryFiltered.length > 0
    ? consumptionHistoryFiltered[consumptionHistoryFiltered.length - 1]
    : null;

  const mostRecentBillMonth = mostRecentBill
    ? new Date(mostRecentBill.billingPeriod).toISOString().substring(0, 7)
    : null;

  // Only show as "current month" if the most recent bill is actually from current month
  const isCurrentMonthBill = mostRecentBillMonth === currentMonth;

  const currentMonthUsage = isCurrentMonthBill && mostRecentBill
    ? safeNumber(mostRecentBill.unitsConsumed, 0)
    : 0;

  const lastMonthUsage = consumptionHistoryFiltered.length > 0
    ? safeNumber(consumptionHistoryFiltered[consumptionHistoryFiltered.length - 1]?.unitsConsumed, 0)
    : 0;

  const avgConsumption = analyticsData?.data?.avgConsumption || 0;
  const avgDailyUsage = avgConsumption > 0 ? Math.round(avgConsumption / 30) : 0;

  const estimatedBill = currentBill
    ? safeNumber(currentBill.totalAmount, 0)
    : 0;

  const monthlyChange = lastMonthUsage > 0
    ? ((currentMonthUsage - lastMonthUsage) / lastMonthUsage * 100).toFixed(1)
    : '0';

  // Monthly Usage Trend - Use real consumptionHistory from database
  const monthlyUsageTrendData = {
    labels: consumptionHistoryFiltered.map((item: any) => {
      const date = new Date(item.billingPeriod);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }).reverse().slice(0, 6),
    datasets: [
      {
        label: 'Monthly Usage (kWh)',
        data: consumptionHistoryFiltered.map((item: any) => safeNumber(item.unitsConsumed, 0)).reverse().slice(0, 6),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: 'rgb(251, 146, 60)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  // Cost Breakdown (Vertical Bar Chart) - Use real bill data
  const costBreakdownData = {
    labels: consumptionHistoryFiltered.map((item: any) => {
      const date = new Date(item.billingPeriod);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }).reverse().slice(0, 6),
    datasets: [
      {
        label: 'Total Amount (Rs.)',
        data: consumptionHistoryFiltered.map((item: any) => item.totalAmount).reverse().slice(0, 6),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
        borderRadius: 4,
      }
    ]
  };

  // Bill Components Breakdown (Stacked Bar Chart) - Real data
  const billComponentsData = {
    labels: extendedConsumptionHistoryFiltered.map((item: any) => {
      const date = new Date(item.billingPeriod);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }).slice(-6),
    datasets: [
      {
        label: 'Energy Charges',
        data: extendedConsumptionHistoryFiltered.map((item: any) => safeNumber(item.baseAmount, 0)).slice(-6),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
      {
        label: 'Fixed Charges',
        data: extendedConsumptionHistoryFiltered.map((item: any) => safeNumber(item.fixedCharges, 0)).slice(-6),
        backgroundColor: 'rgba(251, 146, 60, 0.8)',
      },
      {
        label: 'Electricity Duty',
        data: extendedConsumptionHistoryFiltered.map((item: any) => safeNumber(item.electricityDuty, 0)).slice(-6),
        backgroundColor: 'rgba(239, 68, 68, 0.8)',
      },
      {
        label: 'GST',
        data: extendedConsumptionHistoryFiltered.map((item: any) => safeNumber(item.gstAmount, 0)).slice(-6),
        backgroundColor: 'rgba(34, 197, 94, 0.8)',
      }
    ]
  };

  // Cumulative Consumption Chart (NEW - RECOMMENDED) - Shows running total like meter reading
  const cumulativeConsumptionData = {
    labels: consumptionHistoryFiltered.map((item: any) => {
      const date = new Date(item.billingPeriod);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }),
    datasets: [
      {
        label: 'Cumulative Consumption (kWh)',
        data: consumptionHistoryFiltered.reduce((acc: number[], item: any, index: number) => {
          const cumulative = index === 0
            ? safeNumber(item.unitsConsumed, 0)
            : acc[index - 1] + safeNumber(item.unitsConsumed, 0);
          return [...acc, cumulative];
        }, []),
        borderColor: 'rgb(139, 92, 246)',
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 3,
        pointBackgroundColor: 'rgb(139, 92, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7
      }
    ]
  };

  const cumulativeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(156, 163, 175, 0.8)',
          padding: 15,
          font: { size: 11 },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 1,
        callbacks: {
          label: function(context: any) {
            return 'Total Consumption: ' + context.parsed.y + ' kWh';
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: {
          color: 'rgba(156, 163, 175, 0.6)',
          font: { size: 10 },
          callback: function(value: any) {
            return value + ' kWh';
          }
        }
      },
      x: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 10 } }
      }
    }
  };


  const savingsTips = [
    { icon: ThermometerSun, tip: 'Set AC to 24°C to save up to 15% on cooling costs', savings: 'Rs. 300/month', priority: 'high' },
    { icon: Lightbulb, tip: 'Switch to LED bulbs for 75% less energy consumption', savings: 'Rs. 150/month', priority: 'medium' },
    { icon: Clock, tip: 'Run appliances during off-peak hours (10 PM - 6 AM)', savings: 'Rs. 250/month', priority: 'high' },
    { icon: Wind, tip: 'Use ceiling fans to reduce AC usage by 40%', savings: 'Rs. 200/month', priority: 'medium' }
  ];

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(156, 163, 175, 0.8)',
          padding: 15,
          font: { size: 11 },
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderColor: 'rgba(251, 146, 60, 0.5)',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 10 } }
      },
      x: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 10 } }
      }
    }
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(156, 163, 175, 0.8)',
          padding: 15,
          font: { size: 11 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        padding: 12,
        borderColor: 'rgba(251, 146, 60, 0.5)',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 10 } }
      },
      x: {
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 10 } }
      }
    }
  };

  const stackedBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { color: 'rgba(156, 163, 175, 0.8)', padding: 10, font: { size: 10 } }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        padding: 10,
        callbacks: {
          label: function(context: any) {
            return context.dataset.label + ': Rs ' + context.parsed.y.toFixed(2);
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 10 } }
      },
      y: {
        stacked: true,
        beginAtZero: true,
        grid: { color: 'rgba(156, 163, 175, 0.1)' },
        ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 10 } }
      }
    }
  };

  // Check if no data for ANY period (brand-new customer with no bills ever)
  const hasNoDataAtAll = consumptionHistoryFiltered.length === 0 && billsWithConsumption.length === 0;

  return (
    <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Usage Analytics</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Deep insights into your electricity consumption patterns</p>
            </div>
            <div className="mt-3 sm:mt-0">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400 transition-colors [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
              >
                <option value="month" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">This Month</option>
                <option value="6months" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Last 6 Months</option>
                <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">All Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {hasNoDataAtAll ? (
            /* Empty state for brand-new customers - but dropdown remains visible above */
            <div className="max-w-4xl mx-auto py-10">
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-10 border border-gray-200 dark:border-white/10 text-center">
                <Activity className="w-12 h-12 text-purple-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No analytics yet</h2>
                <p className="text-gray-600 dark:text-gray-400">Analytics will appear after your first meter reading and bill.</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-3">Try changing the time period above to see if you have data for other months.</p>
              </div>
            </div>
          ) : (
          <div className="space-y-4">

            {/* Key Metrics - Real Data from Database */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-3 border border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  {isCurrentMonthBill ? (
                    <span className={`text-xs flex items-center ${parseFloat(monthlyChange) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {parseFloat(monthlyChange) > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                      {Math.abs(parseFloat(monthlyChange))}%
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">No bill yet</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {isCurrentMonthBill ? 'This Month Usage' : 'This Month (No Bill)'}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {isCurrentMonthBill ? formatUnits(currentMonthUsage) : '0 kWh'}
                </p>
              </div>

              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-3 border border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-gray-400">Daily</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Avg. Daily Usage</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatUnits(avgDailyUsage)}</p>
              </div>

              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-3 border border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-xs text-green-400">Est.</span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">Current Bill</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(estimatedBill, 'Rs.')}</p>
              </div>
            </div>

            {/* Monthly Usage Trend - Real Data from Database */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                    6-Month Usage Trend
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Track your electricity consumption patterns</p>
                </div>
              </div>
              <div className="h-80">
                <Line data={monthlyUsageTrendData} options={lineChartOptions} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Highest</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatUnits(Math.max(...consumptionHistory.map((item: any) => safeNumber(item.unitsConsumed, 0))))}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Last 6 months</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Lowest</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatUnits(consumptionHistory.length > 0 ? Math.min(...consumptionHistory.map((item: any) => safeNumber(item.unitsConsumed, 0))) : 0)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">Last 6 months</p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Average</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatUnits(avgConsumption)}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">6 months</p>
                </div>
              </div>
            </div>

            {/* Cumulative Consumption Trend (NEW - RECOMMENDED) */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Activity className="w-5 h-5 mr-2 text-purple-500" />
                    Cumulative Consumption Trend
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Total billed consumption growth over time (like meter odometer)
                  </p>
                </div>
                <div className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <p className="text-xs text-purple-600 dark:text-purple-400">💡 Shows running total</p>
                </div>
              </div>
              <div className="h-80">
                {consumptionHistoryFiltered.length > 0 ? (
                  <Line data={cumulativeConsumptionData} options={cumulativeChartOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    <p>No data available</p>
                  </div>
                )}
              </div>
              {consumptionHistoryFiltered.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Billed Consumption</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatUnits(consumptionHistoryFiltered.reduce((sum: number, item: any) => sum + safeNumber(item.unitsConsumed, 0), 0))}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">From bills</p>
                  </div>
                  <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Current Meter Reading</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {latestMeterReading ? formatUnits(latestMeterReading.currentReading) : '0 kWh'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Cumulative meter value</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Billing Months</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {consumptionHistoryFiltered.length}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">Total bills generated</p>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Analytics - Professional 2-Column Grid (Larger Charts) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Cost Breakdown */}
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                  Monthly Cost Trend
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Last 6 months billing amounts</p>
                <div className="h-80">
                  <Bar
                    data={costBreakdownData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: {
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          titleColor: '#fff',
                          bodyColor: '#fff',
                          padding: 10,
                          callbacks: {
                            label: function(context: any) {
                              return `Rs. ${context.parsed.y}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          grid: { color: 'rgba(156, 163, 175, 0.1)' },
                          ticks: {
                            color: 'rgba(156, 163, 175, 0.6)',
                            font: { size: 11 },
                            callback: function(value: any) {
                              return 'Rs. ' + value;
                            }
                          }
                        },
                        x: {
                          grid: { display: false },
                          ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 11 } }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Bill Components Breakdown */}
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 text-blue-500" />
                  Bill Components Breakdown
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Detailed charges by category</p>
                <div className="h-80">
                  {extendedConsumptionHistory.length > 0 ? (
                    <Bar data={billComponentsData} options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: 'rgba(156, 163, 175, 0.8)', padding: 12, font: { size: 11 } }
                        },
                        tooltip: {
                          backgroundColor: 'rgba(17, 24, 39, 0.95)',
                          padding: 12,
                          callbacks: {
                            label: function(context: any) {
                              return context.dataset.label + ': Rs ' + context.parsed.y.toFixed(0);
                            }
                          }
                        }
                      },
                      scales: {
                        x: {
                          stacked: true,
                          grid: { color: 'rgba(156, 163, 175, 0.1)' },
                          ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 11 } }
                        },
                        y: {
                          stacked: true,
                          beginAtZero: true,
                          grid: { color: 'rgba(156, 163, 175, 0.1)' },
                          ticks: { color: 'rgba(156, 163, 175, 0.6)', font: { size: 11 } }
                        }
                      }
                    }} />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                      <p>No data available</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Usage Insights - Based on Real Data */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Month-over-Month Analysis */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/20">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Monthly Analysis</h3>
                    {isCurrentMonthBill ? (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          Your usage {parseFloat(monthlyChange) > 0 ? 'increased' : 'decreased'} by {Math.abs(parseFloat(monthlyChange))}% compared to last month.
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          Current: {formatUnits(currentMonthUsage)} | Last: {formatUnits(lastMonthUsage)}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                          No bill generated for current month yet. Your last recorded usage was {formatUnits(lastMonthUsage)}.
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                          Last Bill: {formatUnits(lastMonthUsage)} | Current: Not yet billed
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Savings Opportunity */}
              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-5 border border-green-500/20">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Save Energy</h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Reducing consumption by 10% can save approximately {formatCurrency(estimatedBill * 0.1, 'Rs.')}/month.
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold">
                      Target: {formatUnits(Math.round(currentMonthUsage * 0.9))} next month
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Personalized Savings Tips */}
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-5 border border-green-500/20">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                <Lightbulb className="w-6 h-6 mr-2 text-green-500" />
                Personalized Energy Saving Tips
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {savingsTips.map((tip, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 bg-white dark:bg-white/5 rounded-xl border border-green-200 dark:border-white/10 hover:border-green-400 dark:hover:border-green-500 transition-all">
                    <div className={`w-10 h-10 ${tip.priority === 'high' ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                      <tip.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold px-2 py-1 rounded ${tip.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'}`}>
                          {tip.priority === 'high' ? 'High Impact' : 'Medium Impact'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white mb-1">{tip.tip}</p>
                      <p className="text-sm text-green-600 dark:text-green-400 font-semibold">💰 Save {tip.savings}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-5 text-center p-4 bg-white dark:bg-white/5 rounded-xl border border-green-200 dark:border-white/10">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Total Savings Potential</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">Rs. 900/month</p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">or Rs. 10,800/year if you implement all tips</p>
              </div>
            </div>

          </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

