'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { safeNumber, formatCurrency } from '@/lib/utils/dataHandlers';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Users,
  Zap,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Globe,
  Cpu,
  Database,
  Shield,
  Loader2
} from 'lucide-react';
import { Line, Bar, Doughnut, Radar, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
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
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AdminAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedMetric, setSelectedMetric] = useState('revenue');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch real data from dashboard API with period filtering
  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]); // Re-fetch when period changes

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[Admin Analytics] Fetching data for period:', selectedPeriod);

      const response = await fetch(`/api/dashboard?period=${selectedPeriod}`);

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();

      if (result.success) {
        setAnalyticsData(result.data);
        console.log('[Analytics] Dashboard data loaded:', result.data);
      } else {
        throw new Error(result.error || 'Failed to load data');
      }
    } catch (err: any) {
      console.error('[Analytics] Error:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalyticsData().finally(() => {
      setTimeout(() => setRefreshing(false), 500);
    });
  };

  const handleExportAnalytics = () => {
    if (!analyticsData) {
      setError('No data available to export');
      return;
    }

    const metrics = analyticsData.metrics || {};
    const topCustomers = analyticsData.topConsumingCustomers || [];
    const collectionTrend = analyticsData.collectionRateTrend || [];

    // Create comprehensive analytics CSV with unique data
    let csvRows = [
      '=== ANALYTICS SUMMARY ===',
      'Metric,Value',
      `"Collection Rate","${safeNumber(metrics.collectionRate, 0).toFixed(1)}%"`,
      `"Total Customers","${safeNumber(metrics.totalCustomers, 0)}"`,
      `"Average Bill Amount","${formatCurrency(safeNumber(metrics.averageBillAmount, 0))}"`,
      `"Active Connections","${safeNumber(metrics.activeCustomers, 0)}"`,
      `"Total Bills","${safeNumber(metrics.totalBills, 0)}"`,
      `"Paid Bills","${safeNumber(metrics.paidBills, 0)}"`,
      '',
      '=== TOP 10 HIGH-CONSUMING CUSTOMERS ===',
      'Customer Name,Account Number,Total Consumption (kWh),Avg Monthly (kWh),Bill Count,Connection Type'
    ];

    topCustomers.forEach((customer: any) => {
      csvRows.push(
        `"${customer.customerName}","${customer.accountNumber}","${customer.totalConsumption}","${customer.avgConsumption.toFixed(0)}","${customer.billCount}","${customer.connectionType}"`
      );
    });

    csvRows.push('');
    csvRows.push('=== MONTHLY COLLECTION RATE TREND ===');
    csvRows.push('Month,Total Bills,Paid Bills,Collection Rate (%),Total Amount,Paid Amount');

    collectionTrend.forEach((item: any) => {
      csvRows.push(
        `"${item.month}","${item.totalBills}","${item.paidBills}","${item.collectionRate}","${item.totalAmount}","${item.paidAmount}"`
      );
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics_report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <DashboardLayout userType="admin" userName="Admin User">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !analyticsData) {
    return (
      <DashboardLayout userType="admin" userName="Admin User">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Error Loading Analytics</h3>
          </div>
          <p className="text-red-300 mb-4">{error || 'No data available'}</p>
          <button
            onClick={fetchAnalyticsData}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Extract real data from Dashboard API
  const collectionRateTrend = analyticsData.collectionRateTrend || [];
  const topConsumingCustomers = analyticsData.topConsumingCustomers || [];
  const workOrderStats = analyticsData.workOrderStats || {};
  const billsStatus = analyticsData.billsStatus || {};
  const metrics = analyticsData.metrics || {};

  // Build KPIs from metrics data with REAL trends
  const trends = metrics.trends || {};

  const formatTrend = (trendData: any) => {
    if (!trendData) return { trend: 'neutral', change: 'N/A' };
    const { change, direction } = trendData;
    const sign = change > 0 ? '+' : '';
    return {
      trend: direction,
      change: `${sign}${change}%`
    };
  };

  const kpis = {
    collectionRate: {
      value: `${safeNumber(metrics.collectionRate, 0).toFixed(1)}%`,
      ...formatTrend(trends.collectionRate)
    },
    totalCustomers: {
      value: safeNumber(metrics.totalCustomers, 0).toLocaleString(),
      ...formatTrend(trends.totalCustomers)
    },
    avgBillAmount: {
      value: formatCurrency(safeNumber(metrics.averageBillAmount, 0)),
      ...formatTrend(trends.averageBillAmount)
    },
    activeConnections: {
      value: safeNumber(metrics.activeCustomers, 0).toLocaleString(),
      ...formatTrend(trends.activeCustomers)
    }
  };

  // 1. COLLECTION RATE TREND - Line Chart (UNIQUE TO ANALYTICS)
  const collectionRateData = {
    labels: collectionRateTrend.map((item: any) => {
      const [year, month] = item.month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month, 10) - 1]} '${year.slice(2)}`;
    }),
    datasets: [{
      label: 'Collection Rate (%)',
      data: collectionRateTrend.map((item: any) => safeNumber(item.collectionRate, 0)),
      borderColor: 'rgb(59, 130, 246)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      tension: 0.4,
      fill: true
    }]
  };

  // 2. TOP 10 HIGH-CONSUMING CUSTOMERS - Horizontal Bar Chart (UNIQUE TO ANALYTICS)
  const topConsumerLabels = topConsumingCustomers.map((c: any) =>
    `${c.customerName.substring(0, 15)}${c.customerName.length > 15 ? '...' : ''}`
  );
  const topConsumerValues = topConsumingCustomers.map((c: any) =>
    safeNumber(c.totalConsumption, 0)
  );

  const topConsumersData = {
    labels: topConsumerLabels,
    datasets: [{
      label: 'Total Consumption (kWh)',
      data: topConsumerValues,
      backgroundColor: [
        'rgba(239, 68, 68, 0.85)',
        'rgba(249, 115, 22, 0.85)',
        'rgba(251, 191, 36, 0.85)',
        'rgba(34, 197, 94, 0.85)',
        'rgba(6, 182, 212, 0.85)',
        'rgba(59, 130, 246, 0.85)',
        'rgba(99, 102, 241, 0.85)',
        'rgba(168, 85, 247, 0.85)',
        'rgba(236, 72, 153, 0.85)',
        'rgba(244, 63, 94, 0.85)'
      ],
      borderColor: [
        'rgba(239, 68, 68, 1)',
        'rgba(249, 115, 22, 1)',
        'rgba(251, 191, 36, 1)',
        'rgba(34, 197, 94, 1)',
        'rgba(6, 182, 212, 1)',
        'rgba(59, 130, 246, 1)',
        'rgba(99, 102, 241, 1)',
        'rgba(168, 85, 247, 1)',
        'rgba(236, 72, 153, 1)',
        'rgba(244, 63, 94, 1)'
      ],
      borderWidth: 2
    }]
  };

  // 3. BILLS STATUS - Doughnut Chart
  const billsStatusLabels = Object.keys(billsStatus);
  const billsStatusCounts = billsStatusLabels.map((status: string) => {
    const data = billsStatus[status];
    return typeof data === 'object' ? (data.count || 0) : data;
  });

  const billsStatusData = {
    labels: billsStatusLabels.map(status => status.charAt(0).toUpperCase() + status.slice(1)),
    datasets: [{
      data: billsStatusCounts,
      backgroundColor: [
        'rgba(34, 197, 94, 0.85)',
        'rgba(250, 204, 21, 0.85)',
        'rgba(239, 68, 68, 0.85)',
        'rgba(148, 163, 184, 0.85)'
      ]
    }]
  };

  // 4. WORK ORDERS - Doughnut Chart
  const workOrderLabels = Object.keys(workOrderStats);
  const workOrderCounts = workOrderLabels.map((status: string) =>
    safeNumber(workOrderStats[status], 0)
  );

  const workOrderData = {
    labels: workOrderLabels.map(status =>
      status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())
    ),
    datasets: [{
      data: workOrderCounts,
      backgroundColor: [
        'rgba(250, 204, 21, 0.8)',
        'rgba(59, 130, 246, 0.8)',
        'rgba(34, 197, 94, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ]
    }]
  };

  return (
    <DashboardLayout userType="admin" userName="Admin User">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Analytics & Insights</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Real-time analytics from database • All data from actual bills, payments & customers
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400 font-medium transition-colors"
              >
                <option value="month" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">This Month</option>
                <option value="lastMonth" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Last Month</option>
                <option value="3months" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Last 3 Months</option>
                <option value="6months" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Last 6 Months</option>
                <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">All Time</option>
              </select>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`px-4 py-2 bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center space-x-2 ${
                  refreshing ? 'opacity-70' : ''
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={handleExportAnalytics}
                disabled={!analyticsData || loading}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/50 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* KPI Cards - Real DB data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(kpis).map(([key, data]) => (
            <div key={key} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-1">
                <p className="text-gray-600 dark:text-gray-400 text-sm capitalize">{key.replace('avg', 'Avg ')}</p>
                <Database className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.value}</p>
              <div className={`flex items-center space-x-1 text-sm ${
                data.trend === 'up' ? 'text-green-400' : data.trend === 'down' ? 'text-red-400' : 'text-gray-400'
              }`}>
                {data.trend === 'up' ? <ArrowUp className="w-4 h-4" /> : data.trend === 'down' ? <ArrowDown className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
                <span>{data.change}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Main Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Collection Rate Trend */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Collection Rate Trend</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                  <Database className="w-3 h-3 mr-1 text-green-400" />
                  CASE WHEN aggregation + percentage calculation
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div className="h-64">
              {collectionRateTrend.length > 0 ? (
                <Line
                  data={collectionRateData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: 'white',
                        bodyColor: 'white',
                        callbacks: {
                          label: function(context: any) {
                            const index = context.dataIndex;
                            const item = collectionRateTrend[index];
                            return [
                              `Collection Rate: ${context.parsed.y.toFixed(1)}%`,
                              `Paid Bills: ${item.paidBills}/${item.totalBills}`,
                              `Amount Collected: Rs ${(item.paidAmount / 1000).toFixed(1)}K`
                            ];
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
                            return value + '%';
                          }
                        },
                        min: 0,
                        max: 100
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No collection data available
                </div>
              )}
            </div>
          </div>

          {/* Top 10 High-Consuming Customers */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Top 10 High Consumers</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                  <Database className="w-3 h-3 mr-1 text-green-400" />
                  JOIN + ORDER BY + LIMIT (Top-N query)
                </p>
              </div>
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="h-64">
              {topConsumingCustomers.length > 0 ? (
                <Bar
                  data={topConsumersData}
                  options={{
                    indexAxis: 'y' as const,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        titleColor: 'white',
                        bodyColor: 'white',
                        callbacks: {
                          title: function(context: any) {
                            const index = context[0].dataIndex;
                            const customer = topConsumingCustomers[index];
                            return `${customer.customerName} (${customer.accountNumber})`;
                          },
                          label: function(context: any) {
                            const index = context.dataIndex;
                            const customer = topConsumingCustomers[index];
                            return [
                              `Total Consumption: ${safeNumber(customer.totalConsumption, 0).toLocaleString()} kWh`,
                              `Avg/Month: ${safeNumber(customer.avgConsumption, 0).toFixed(0)} kWh`,
                              `Bill Count: ${customer.billCount}`,
                              `Type: ${customer.connectionType.charAt(0).toUpperCase() + customer.connectionType.slice(1)}`
                            ];
                          }
                        }
                      }
                    },
                    scales: {
                      x: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                          color: 'rgba(255, 255, 255, 0.6)',
                          callback: function(value: any) {
                            return value >= 1000 ? (value / 1000) + 'K' : value;
                          }
                        }
                      },
                      y: {
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.6)', font: { size: 10 } }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No consumption data available
                </div>
              )}
            </div>
          </div>

          {/* Bills Status Distribution */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Bills Status Distribution</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                  <Database className="w-3 h-3 mr-1 text-green-400" />
                  GROUP BY status aggregation
                </p>
              </div>
            </div>
            <div className="h-64">
              {billsStatusLabels.length > 0 ? (
                <Doughnut
                  data={billsStatusData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: 'rgba(255, 255, 255, 0.6)' }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No bills data available
                </div>
              )}
            </div>
          </div>

          {/* Work Orders Status */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Work Order Status</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center mt-1">
                  <Database className="w-3 h-3 mr-1 text-green-400" />
                  GROUP BY status from work_orders
                </p>
              </div>
            </div>
            <div className="h-64">
              {workOrderLabels.length > 0 ? (
                <Doughnut
                  data={workOrderData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        position: 'bottom',
                        labels: { color: 'rgba(255, 255, 255, 0.6)' }
                      }
                    }
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No work order data available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Data Source Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Award className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-400 mb-1">Unique Analytics with Advanced DBMS Concepts</h4>
              <p className="text-sm text-blue-300">
                This analytics page features <strong>unique charts distinct from the dashboard</strong>, demonstrating advanced SQL:
                <span className="block mt-2">
                  • <strong>Collection Rate Trend:</strong> CASE WHEN for conditional aggregation + percentage calculations<br/>
                  • <strong>Top 10 High Consumers:</strong> JOIN + GROUP BY + ORDER BY + LIMIT (Top-N query pattern)<br/>
                  • <strong>Bills & Work Orders Status:</strong> Status-based aggregations with GROUP BY
                </span>
              </p>
              <p className="text-sm text-blue-300 mt-2">
                Data sourced from: bills, customers, and work_orders tables with complex aggregations showing collection efficiency,
                consumption patterns, and operational status.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

