'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DollarSign,
  Users,
  FileText,
  AlertTriangle,
  CreditCard,
  Activity,
  BarChart3,
  Zap,
  PieChart,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { DashboardData, ChartData, ApiResponse } from '@/types';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Dashboard] Fetching dashboard data...');
      const response = await fetch('/api/dashboard');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch dashboard data');
      }

      const result: ApiResponse<DashboardData> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'API returned error');
      }

      if (!result.data) {
        throw new Error('No dashboard data received');
      }

      setDashboardData(result.data);
      setRetryCount(0);

      // Cache dashboard data in localStorage for resilience
      try {
        localStorage.setItem('last_dashboard_data', JSON.stringify({
          data: result.data,
          timestamp: new Date().toISOString()
        }));
      } catch (cacheErr) {
        console.warn('[Dashboard] Failed to cache data to localStorage:', cacheErr);
      }

      console.log('[Dashboard] Dashboard data loaded successfully');
    } catch (err: any) {
      console.error('[Dashboard] Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');

      // Try to load cached data if API fails
      try {
        const cachedData = localStorage.getItem('last_dashboard_data');
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const cacheAge = new Date().getTime() - new Date(timestamp).getTime();
          const cacheAgeHours = cacheAge / (1000 * 60 * 60);

          // Use cache if less than 24 hours old
          if (cacheAgeHours < 24) {
            console.log('[Dashboard] Loading cached data from', timestamp);
            setDashboardData(data);
            setError(err.message + ' (Showing cached data from ' + new Date(timestamp).toLocaleString() + ')');
          }
        }
      } catch (cacheErr) {
        console.error('[Dashboard] Failed to load cached data:', cacheErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    if (retryCount < 3) {
      setRetryCount(prev => prev + 1);
      fetchDashboardData();
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="admin" userName="Admin">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <DashboardLayout userType="admin" userName="Admin">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-red-400 font-semibold">Dashboard Error</h3>
          </div>
          <p className="text-red-400 mb-4">{error || 'No data available'}</p>
          <div className="flex space-x-3">
            <button
              onClick={handleRetry}
              disabled={retryCount >= 3}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Retry ({retryCount}/3)
            </button>
            <button
              onClick={() => router.refresh()}
              className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 text-gray-400 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { metrics, recentBills = [], revenueByCategory = {}, monthlyRevenue = [], paymentMethods = {}, billsStatus = {}, connectionTypeDistribution = {} } = dashboardData;

  // Chart data from API - Revenue by Connection Type
  // Filter out categories with zero, null, or very small revenue (< Rs 1)
  const validRevenueEntries = Object.entries(revenueByCategory).filter(([_, value]) => {
    const numValue = typeof value === 'object' && value !== null ? value.total : value;
    const parsedValue = parseFloat(String(numValue || 0));
    return !isNaN(parsedValue) && parsedValue >= 1; // Only show if >= Rs 1
  });

  const categoryLabels = validRevenueEntries.map(([key]) => key);
  const categoryValues = validRevenueEntries.map(([_, value]) => {
    const numValue = typeof value === 'object' && value !== null ? value.total : value;
    return parseFloat(String(numValue || 0));
  });

  const categoryData: ChartData = {
    labels: categoryLabels.map(label => {
      // Capitalize and format labels
      return label.charAt(0).toUpperCase() + label.slice(1);
    }),
    datasets: [
      {
        label: 'Revenue (Rs)',
        data: categoryValues,
        backgroundColor: [
          'rgba(100, 116, 139, 0.85)',   // Industrial - Slate
          'rgba(30, 64, 175, 0.85)',     // Commercial - Navy Blue
          'rgba(21, 128, 61, 0.85)',     // Agricultural - Forest Green
          'rgba(217, 119, 6, 0.85)'      // Residential - Amber
        ],
        borderColor: [
          'rgba(100, 116, 139, 1)',
          'rgba(30, 64, 175, 1)',
          'rgba(21, 128, 61, 1)',
          'rgba(217, 119, 6, 1)'
        ],
        borderWidth: 2
      } as any
    ]
  };

  // Monthly Revenue Trend from actual data
  const revenueData = {
    labels: monthlyRevenue.map((item: any) => {
      // Format: "2025-05" -> "May '25"
      const [year, month] = item.month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month, 10) - 1]} '${year.slice(2)}`;
    }),
    datasets: [
      {
        label: 'Monthly Revenue (Rs)',
        data: monthlyRevenue.map((item: any) => item.revenue / 1000), // Convert to thousands
        borderColor: 'rgba(37, 99, 235, 1)',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgba(37, 99, 235, 1)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ]
  };

  // Payment Methods from actual data
  const paymentMethodLabels = Object.keys(paymentMethods);
  const paymentMethodCounts = paymentMethodLabels.map(method => {
    const data = paymentMethods[method] as any;
    return typeof data === 'object' ? (data.count || 0) : data;
  });

  const paymentMethodsData = {
    labels: paymentMethodLabels.map(method => {
      // Format label: bank_transfer -> Bank Transfer
      return method.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }),
    datasets: [
      {
        label: 'Transactions',
        data: paymentMethodCounts,
        backgroundColor: [
          'rgba(30, 64, 175, 0.8)',     // Navy Blue
          'rgba(67, 56, 202, 0.8)',     // Indigo
          'rgba(21, 128, 61, 0.8)',     // Forest Green
          'rgba(13, 148, 136, 0.8)',    // Teal
          'rgba(217, 119, 6, 0.8)',     // Amber
          'rgba(100, 116, 139, 0.8)',   // Slate
          'rgba(107, 114, 128, 0.8)'    // Gray
        ],
        borderColor: [
          'rgba(30, 64, 175, 1)',
          'rgba(67, 56, 202, 1)',
          'rgba(21, 128, 61, 1)',
          'rgba(13, 148, 136, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(100, 116, 139, 1)',
          'rgba(107, 114, 128, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Bills Status Distribution from actual data
  const billsStatusLabels = Object.keys(billsStatus);
  const billsStatusCounts = billsStatusLabels.map(status => {
    const data = billsStatus[status] as any;
    return typeof data === 'object' ? (data.count || 0) : data;
  });

  const billsStatusData = {
    labels: billsStatusLabels.map(status => status.charAt(0).toUpperCase() + status.slice(1)),
    datasets: [
      {
        label: 'Bills Count',
        data: billsStatusCounts,
        backgroundColor: [
          'rgba(21, 128, 61, 0.85)',    // Paid - Forest Green
          'rgba(217, 119, 6, 0.85)',    // Issued/Pending - Amber
          'rgba(185, 28, 28, 0.85)',    // Overdue - Dark Red
          'rgba(107, 114, 128, 0.85)'   // Other - Gray
        ],
        borderColor: [
          'rgba(21, 128, 61, 1)',
          'rgba(217, 119, 6, 1)',
          'rgba(185, 28, 28, 1)',
          'rgba(107, 114, 128, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Connection Type Distribution from actual data
  const connectionTypeLabels = Object.keys(connectionTypeDistribution);
  const connectionTypeCounts = connectionTypeLabels.map(type => {
    const data = connectionTypeDistribution[type] as any;
    return typeof data === 'object' ? (data.count || 0) : data;
  });

  const connectionTypeData = {
    labels: connectionTypeLabels.map(type => type.charAt(0).toUpperCase() + type.slice(1)),
    datasets: [
      {
        label: 'Customer Count',
        data: connectionTypeCounts,
        backgroundColor: [
          'rgba(100, 116, 139, 0.85)',   // Industrial - Slate
          'rgba(30, 64, 175, 0.85)',     // Commercial - Navy Blue
          'rgba(21, 128, 61, 0.85)',     // Agricultural - Forest Green
          'rgba(217, 119, 6, 0.85)'      // Residential - Amber
        ],
        borderColor: [
          'rgba(100, 116, 139, 1)',
          'rgba(30, 64, 175, 1)',
          'rgba(21, 128, 61, 1)',
          'rgba(217, 119, 6, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              // Value is already in thousands, multiply back for display
              const actualValue = context.parsed.y * 1000;
              label += 'Rs ' + actualValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            }
            return label;
          }
        }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: { color: 'rgba(255, 255, 255, 0.6)' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          callback: function(value: any) {
            // Value is already in thousands, just add K suffix
            return 'Rs ' + value.toFixed(0) + 'K';
          }
        },
        beginAtZero: true
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          font: { size: 12 },
          padding: 15,
          boxWidth: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'pending':
      case 'issued': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/50';
    }
  };

  return (
    <DashboardLayout userType="admin" userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">Comprehensive overview of ElectroLux EMS</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics from API */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-blue-500/20 dark:bg-blue-500/30 border border-blue-500/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Customers</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.totalCustomers || 0}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                Active: {metrics?.activeCustomers || 0}
              </span>
              {(metrics?.suspendedCustomers || 0) > 0 && (
                <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                  Suspended: {metrics?.suspendedCustomers || 0}
                </span>
              )}
              {(metrics?.inactiveCustomers || 0) > 0 && (
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400 rounded">
                  Inactive: {metrics?.inactiveCustomers || 0}
                </span>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-slate-500/20 dark:bg-slate-500/30 border border-slate-500/30 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Employees</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.totalEmployees || 0}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-green-500/20 dark:bg-green-500/30 border border-green-500/30 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Avg Monthly Revenue</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">(Last 6 Months)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              Rs {((metrics?.monthlyRevenue || 0) / 1000).toFixed(1)}K
            </p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-red-500/20 dark:bg-red-500/30 border border-red-500/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Outstanding</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              Rs {((metrics?.outstandingAmount || 0) / 1000).toFixed(1)}K
            </p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-indigo-500/20 dark:bg-indigo-500/30 border border-indigo-500/30 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Active Bills</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{metrics?.activeBills || 0}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-teal-500/20 dark:bg-teal-500/30 border border-teal-500/30 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Collection Rate</p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">(Last 6 Months)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics?.collectionRate || 0}%
            </p>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Trend</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Monthly revenue (6 months)</p>
              </div>
              <Activity className="w-6 h-6 text-green-400" />
            </div>
            <div className="h-64">
              {monthlyRevenue.length > 0 ? (
                <Line data={revenueData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No revenue data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue Distribution - Doughnut Chart */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Revenue Distribution</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Revenue by connection type (%)</p>
              </div>
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div className="h-64">
              {Object.keys(revenueByCategory).length > 0 ? (
                <Doughnut
                  data={{
                    labels: categoryLabels.map(label => label.charAt(0).toUpperCase() + label.slice(1)),
                    datasets: [{
                      data: categoryValues,
                      backgroundColor: [
                        'rgba(239, 68, 68, 0.85)',
                        'rgba(59, 130, 246, 0.85)',
                        'rgba(34, 197, 94, 0.85)',
                        'rgba(250, 204, 21, 0.85)'
                      ],
                      borderColor: [
                        'rgba(239, 68, 68, 1)',
                        'rgba(59, 130, 246, 1)',
                        'rgba(34, 197, 94, 1)',
                        'rgba(250, 204, 21, 1)'
                      ],
                      borderWidth: 2
                    }]
                  }}
                  options={{
                    ...doughnutOptions,
                    plugins: {
                      ...doughnutOptions.plugins,
                      tooltip: {
                        ...doughnutOptions.plugins.tooltip,
                        callbacks: {
                          label: function(context: any) {
                            const label = context.label || '';
                            const value = typeof context.parsed === 'number' ? context.parsed : (context.raw || 0);
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);

                            // Only calculate percentage if value is meaningful
                            if (value < 0.01 || total < 0.01) {
                              return ''; // Return empty string instead of null
                            }

                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: Rs ${value.toLocaleString('en-IN', {minimumFractionDigits: 2})} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No revenue data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Row 2 - Connection Types & Bills Status */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Type Distribution - Bar Chart */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer Distribution</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">By connection type</p>
              </div>
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <div className="h-64">
              {Object.keys(connectionTypeDistribution).length > 0 ? (
                <Bar
                  data={connectionTypeData}
                  options={{
                    ...chartOptions,
                    indexAxis: 'y' as const,
                    plugins: {
                      ...chartOptions.plugins,
                      legend: {
                        display: false
                      },
                      tooltip: {
                        ...chartOptions.plugins.tooltip,
                        callbacks: {
                          label: function(context: any) {
                            const label = context.label || '';
                            const value = context.parsed.x || 0;
                            const typeKey = connectionTypeLabels[context.dataIndex];
                            const activeCount = (connectionTypeDistribution[typeKey] as any)?.activeCount || 0;
                            return [
                              `Total: ${value} customers`,
                              `Active: ${activeCount} customers`
                            ];
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        ...chartOptions.scales.y,
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.6)',
                          callback: function(value: any) {
                            return value;
                          }
                        }
                      },
                      y: {
                        ...chartOptions.scales.x
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No customer data available</p>
                </div>
              )}
            </div>
          </div>

          {/* Bills Status Distribution */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bills Status</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Distribution by bill status</p>
              </div>
              <FileText className="w-6 h-6 text-blue-400" />
            </div>
            <div className="h-64">
              {Object.keys(billsStatus).length > 0 ? (
                <Doughnut
                  data={billsStatusData}
                  options={{
                    ...doughnutOptions,
                    plugins: {
                      ...doughnutOptions.plugins,
                      tooltip: {
                        ...doughnutOptions.plugins.tooltip,
                        callbacks: {
                          label: function(context: any) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            const statusKey = billsStatusLabels[context.dataIndex];
                            const amount = (billsStatus[statusKey] as any)?.amount || 0;
                            return [
                              `${label}: ${value} bills (${percentage}%)`,
                              `Amount: Rs ${amount.toLocaleString('en-IN', {minimumFractionDigits: 2})}`
                            ];
                          }
                        }
                      }
                    }
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <p>No bills data available</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Bills Table */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Bills</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Latest billing activities</p>
              </div>
              <button
                onClick={() => window.location.href = '/admin/bills'}
                className="px-4 py-2 bg-gray-50 dark:bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 transition-all text-sm"
              >
                View All
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Bill No</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {recentBills.length > 0 ? (
                  recentBills.slice(0, 5).map((bill: any) => (
                    <tr key={bill.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white font-medium">{bill.billNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-700 dark:text-gray-300">{bill.customerName}</p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">{bill.accountNumber}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white font-semibold">Rs {Number(bill.totalAmount).toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 dark:text-gray-400">{new Date(bill.dueDate).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No recent bills available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <button
            onClick={() => router.push('/admin/customers')}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl hover:border-red-500/40 transition-all"
          >
            <Users className="w-6 h-6 text-red-500 dark:text-red-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-semibold">Manage Customers</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">View and manage customer accounts</p>
          </button>

          <button
            onClick={() => router.push('/admin/bills')}
            className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl hover:border-green-500/40 transition-all"
          >
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-semibold">Generate Bills</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Create new billing cycles</p>
          </button>


          <button
            onClick={() => router.push('/admin/outages')}
            className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl hover:border-yellow-500/40 transition-all"
          >
            <Zap className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-semibold">Outage Management</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Schedule and manage outages</p>
          </button>

          <button
            onClick={() => router.push('/admin/complaints')}
            className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all"
          >
            <AlertTriangle className="w-6 h-6 text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-semibold">Complaint Management</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Manage customer complaints</p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

