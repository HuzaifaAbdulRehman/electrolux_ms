'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import { safeNumber, formatCurrency, safeDate, formatUnits } from '@/lib/utils/dataHandlers';
import {
  Zap,
  DollarSign,
  Activity,
  CreditCard,
  TrendingUp,
  TrendingDown,
  ArrowUp,
  ArrowDown,
  Clock,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
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

// Register Chart.js components
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

export default function CustomerDashboard() {
  const router = useRouter();
  const { data: session } = useSession();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/customer/dashboard');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error || 'No data available'}</p>
          <button
            onClick={fetchDashboardData}
            className="mt-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const {
    accountNumber = 'N/A',
    currentBill = {},
    recentBills = [],
    recentPayments = [],
    monthlyPayments = [],
    consumptionHistory = [],
    outstandingBalance = '0',
    avgConsumption = 0,
    avgMonthlyCost = 0,
    consumptionTrend = 'stable',
    trendPercentage = 0,
    totalPaid = '0',
    latestMeterReading = null,
    customer = {}
  } = dashboardData;

  const handlePayNow = () => {
    router.push('/customer/payment');
  };

  // Filter out connection charges (bills with 0 units) for display
  const currentBillWithConsumption = currentBill && safeNumber(currentBill.unitsConsumed, 0) > 0 ? currentBill : null;
  const billsWithConsumption = recentBills.filter((bill: any) => safeNumber(bill.unitsConsumed, 0) > 0);

  // Calculate summary cards from real data
  const lastPayment = recentPayments[0];

  const summaryCards = [
    {
      title: 'Outstanding Balance',
      value: formatCurrency(outstandingBalance, 'Rs.'),
      change: safeNumber(outstandingBalance) > 0 ? 'Unpaid Bills' : 'All Paid',
      trend: safeNumber(outstandingBalance) > 0 ? 'up' : 'neutral',
      icon: DollarSign,
      color: safeNumber(outstandingBalance) > 0 ? 'from-red-500 to-rose-500' : 'from-green-500 to-emerald-500',
      description: safeNumber(outstandingBalance) > 0 ? 'Amount due for payment' : 'No pending payments'
    },
    {
      title: 'Current Bill',
      value: currentBillWithConsumption ? formatCurrency(currentBillWithConsumption.totalAmount, 'Rs.') : formatCurrency(0, 'Rs.'),
      change: currentBillWithConsumption?.dueDate ? `Due: ${safeDate(currentBillWithConsumption.dueDate)}` : 'No bill',
      trend: 'neutral',
      icon: FileText,
      color: 'from-yellow-400 to-orange-500',
      description: currentBillWithConsumption ? 'Latest billing cycle' : 'Awaiting bill generation'
    },
    {
      title: 'Total Paid',
      value: formatCurrency(totalPaid, 'Rs.'),
      change: recentPayments.length > 0 ? `${recentPayments.length} payments` : 'No payments',
      trend: 'neutral',
      icon: CheckCircle,
      color: 'from-green-500 to-emerald-500',
      description: 'Lifetime payments made'
    },
    {
      title: 'Avg Monthly Usage',
      value: formatUnits(avgConsumption),
      change: consumptionTrend === 'increasing'
        ? `↑ ${Math.abs(trendPercentage)}% vs last month`
        : consumptionTrend === 'decreasing'
        ? `↓ ${Math.abs(trendPercentage)}% vs last month`
        : 'Stable',
      trend: consumptionTrend === 'increasing' ? 'up' : consumptionTrend === 'decreasing' ? 'down' : 'neutral',
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      description: 'Based on last 6 months'
    }
  ];

  // Usage Trend Chart Data from real consumption history
  const usageTrendData = {
    labels: consumptionHistory.map((item: any) => {
      const date = new Date(item.billingPeriod);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }).slice(-6),
    datasets: [
      {
        label: 'Consumption (kWh)',
        data: consumptionHistory.map((item: any) => safeNumber(item.unitsConsumed, 0)).slice(-6),
        borderColor: 'rgb(251, 146, 60)',
        backgroundColor: 'rgba(251, 146, 60, 0.1)',
        tension: 0.4,
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: 'rgb(251, 146, 60)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 8
      }
    ]
  };

  // Monthly Consumption Bar Chart Data (NEW)
  const monthlyConsumptionData = {
    labels: consumptionHistory.map((item: any) => {
      const date = new Date(item.billingPeriod);
      return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    }).slice(-6),
    datasets: [{
      label: 'Consumption (kWh)',
      data: consumptionHistory.map((item: any) => safeNumber(item.unitsConsumed, 0)).slice(-6),
      backgroundColor: 'rgba(251, 146, 60, 0.8)',
      borderColor: 'rgba(251, 146, 60, 1)',
      borderWidth: 2,
      borderRadius: 6
    }]
  };

  const consumptionBarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            return 'Consumption: ' + context.parsed.y + ' kWh';
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.6)' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          callback: function(value: any) {
            return value + ' kWh';
          }
        }
      }
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleColor: 'rgb(255, 255, 255)',
        bodyColor: 'rgb(255, 255, 255)',
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)'
        }
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          callback: function(value: any) {
            return value + ' kWh';
          }
        }
      }
    }
  };

  // Payment History Chart Data (NEW)
  const paymentHistoryData = {
    labels: monthlyPayments.map((item: any) => {
      const [year, month] = item.month.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${monthNames[parseInt(month, 10) - 1]} '${year.slice(2)}`;
    }).reverse(),
    datasets: [{
      label: 'Payments (Rs)',
      data: monthlyPayments.map((item: any) => safeNumber(item.totalPaid, 0) / 1000).reverse(),
      backgroundColor: 'rgba(34, 197, 94, 0.8)',
      borderColor: 'rgba(34, 197, 94, 1)',
      borderWidth: 2,
      borderRadius: 6
    }]
  };

  // Bill Comparison Chart Data (NEW) - Uses filtered bills (no connection charges)
  const billComparisonData = {
    labels: billsWithConsumption.map((bill: any) => {
      const date = new Date(bill.billingMonth);
      return date.toLocaleDateString('en-US', { month: 'short' });
    }).reverse().slice(0, 6),
    datasets: [{
      label: 'Bill Amount (Rs)',
      data: billsWithConsumption.map((bill: any) => safeNumber(bill.totalAmount, 0) / 1000).reverse().slice(0, 6),
      backgroundColor: 'rgba(59, 130, 246, 0.8)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 2,
      borderRadius: 6
    }]
  };

  // Cost Breakdown Chart Data (NEW) - Uses filtered current bill (no connection charges)
  const costBreakdownData = {
    labels: ['Energy Charges', 'Fixed Charges', 'Electricity Duty', 'GST'],
    datasets: [{
      data: currentBillWithConsumption ? [
        safeNumber(currentBillWithConsumption.baseAmount, 0),
        safeNumber(currentBillWithConsumption.fixedCharges, 0),
        safeNumber(currentBillWithConsumption.electricityDuty, 0),
        safeNumber(currentBillWithConsumption.gstAmount, 0)
      ] : [0, 0, 0, 0],
      backgroundColor: [
        'rgba(59, 130, 246, 0.8)',  // Blue
        'rgba(251, 146, 60, 0.8)',  // Orange
        'rgba(239, 68, 68, 0.8)',   // Red
        'rgba(34, 197, 94, 0.8)'    // Green
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(251, 146, 60, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(34, 197, 94, 1)'
      ],
      borderWidth: 2
    }]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(255, 255, 255, 0.6)' }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        ticks: {
          color: 'rgba(255, 255, 255, 0.6)',
          callback: function(value: any) {
            return 'Rs ' + value + 'K';
          }
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            return context.label + ': Rs ' + context.parsed.toFixed(2);
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

  const getPaymentStatusColor = (method: string) => {
    const colors: { [key: string]: string } = {
      'online': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      'card': 'bg-purple-500/20 text-purple-400 border-purple-500/50',
      'cash': 'bg-green-500/20 text-green-400 border-green-500/50',
      'bank': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50'
    };
    return colors[method?.toLowerCase()] || 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/50';
  };

  // Check if customer is new (active but no actual consumption - only connection charges bill with 0 units)
  const totalConsumption = consumptionHistory.reduce((sum: number, item: any) => sum + safeNumber(item.unitsConsumed, 0), 0);
  const isNewCustomer = dashboardData?.customer?.status === 'active' && totalConsumption === 0;

  return (
    <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
      <div className="space-y-4">
        {/* Status-based Welcome Header */}
        {dashboardData?.customer?.status === 'pending_installation' ? (
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 backdrop-blur-xl rounded-2xl p-6 border border-yellow-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Installation Pending
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Your meter has been assigned and installation is in progress.
                </p>
                <div className="bg-white/10 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Meter Number:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{dashboardData.customer.meterNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{dashboardData.customer.accountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium">
                      Pending Installation
                    </span>
                  </div>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  ⚠️ Limited access until installation is complete. An employee will contact you soon.
                </p>
              </div>
            </div>
          </div>
        ) : isNewCustomer ? (
          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-6 border border-green-500/20">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome to Electrolux EMS, {session?.user?.name || 'Customer'}!
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-3">
                  Your meter has been successfully installed and your account is now active.
                </p>
                <div className="bg-white/10 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Meter Number:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{dashboardData.customer.meterNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Account Number:</span>
                    <span className="font-mono text-gray-900 dark:text-white">{dashboardData.customer.accountNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Connection Date:</span>
                    <span className="text-gray-900 dark:text-white">{safeDate(dashboardData.customer.connectionDate)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                      Active
                    </span>
                  </div>
                </div>
                <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-gray-900 dark:text-white font-semibold mb-1">Awaiting First Meter Reading</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Your usage data, consumption statistics, and billing information will be available once our team records your first meter reading and generates your initial bill. This typically happens within the first billing cycle.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Welcome back, {session?.user?.name || 'Customer'}!
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {accountNumber} • {customer?.connectionType || 'Residential'}
                </p>
              </div>
              <div className="mt-3 sm:mt-0 flex items-center space-x-2">
                <button
                  onClick={fetchDashboardData}
                  className="px-3 py-2 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center space-x-2 text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
                {parseFloat(outstandingBalance) > 0 && (
                  <button
                    onClick={handlePayNow}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all font-semibold text-sm"
                  >
                    Pay Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards - Simplified */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {summaryCards.map((card, index) => (
            <div key={index} className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 bg-gradient-to-r ${card.color} rounded-lg flex items-center justify-center`}>
                  <card.icon className="w-5 h-5 text-white" />
                </div>
                {card.trend === 'up' && <ArrowUp className="w-4 h-4 text-red-400" />}
                {card.trend === 'down' && <ArrowDown className="w-4 h-4 text-green-400" />}
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{card.title}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{card.change}</p>
            </div>
          ))}
        </div>

        {/* Meter Reading Info - Compact */}
        {latestMeterReading && dashboardData?.customer?.status === 'active' && (
          <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center">
                <Activity className="w-4 h-4 mr-2 text-cyan-500" />
                Meter Reading Summary
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Last: {safeDate(latestMeterReading.readingDate)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Meter Reading</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {formatUnits(latestMeterReading.currentReading)}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">This Month's Usage</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {currentBillWithConsumption ? formatUnits(currentBillWithConsumption.unitsConsumed) : '0 kWh'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Charts Grid - Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Consumption Trend Chart */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Consumption Trend</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your energy usage over time</p>
              </div>
              <Activity className="w-6 h-6 text-orange-400" />
            </div>
            <div className="h-64">
              {consumptionHistory.length > 0 ? (
                <Line data={usageTrendData} options={chartOptions} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Activity className="w-12 h-12 text-gray-500 dark:text-gray-600 mb-3 opacity-50" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No consumption data yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Data will appear after your first meter reading</p>
                </div>
              )}
            </div>
          </div>

          {/* Monthly Consumption Bar Chart (NEW - RECOMMENDED) */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Monthly Consumption</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Compare usage across months</p>
              </div>
              <Zap className="w-6 h-6 text-orange-400" />
            </div>
            <div className="h-64">
              {consumptionHistory.length > 0 ? (
                <Bar data={monthlyConsumptionData} options={consumptionBarOptions} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Zap className="w-12 h-12 text-gray-500 dark:text-gray-600 mb-3 opacity-50" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No consumption data yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Data will appear after your first meter reading</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Grid - Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment History Chart */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment History</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your monthly payments</p>
              </div>
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div className="h-64">
              {monthlyPayments.length > 0 ? (
                <Bar data={paymentHistoryData} options={barChartOptions} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <DollarSign className="w-12 h-12 text-gray-500 dark:text-gray-600 mb-3 opacity-50" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No payment history yet</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Payment data will appear once you receive and pay bills</p>
                </div>
              )}
            </div>
          </div>

          {/* Cost Breakdown Chart */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cost Breakdown</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Current bill components</p>
              </div>
              <Zap className="w-6 h-6 text-yellow-400" />
            </div>
            <div className="h-64">
              {currentBillWithConsumption ? (
                <Doughnut data={costBreakdownData} options={doughnutOptions} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <Zap className="w-12 h-12 text-gray-500 dark:text-gray-600 mb-3 opacity-50" />
                  <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No current bill</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500">Cost breakdown will appear once your first bill is generated</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Bills */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Bills</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your billing history</p>
              </div>
              <button
                onClick={() => router.push('/customer/view-bills')}
                className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-semibold"
              >
                View All →
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Bill No</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Period</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Units</th>
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
                        <p className="text-gray-700 dark:text-gray-300">{bill.billingMonth ? new Date(bill.billingMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-700 dark:text-gray-300">{formatUnits(bill.unitsConsumed)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white font-semibold">{formatCurrency(bill.totalAmount, 'Rs.')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 dark:text-gray-400">{safeDate(bill.dueDate)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(bill.status)}`}>
                          {bill.status === 'paid' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {bill.status === 'overdue' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {bill.status === 'issued' && <Clock className="w-3 h-3 mr-1" />}
                          {bill.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <FileText className="w-12 h-12 text-gray-500 dark:text-gray-600 mb-3 opacity-50" />
                        <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No bills available yet</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">Your bills will appear here after meter readings are recorded</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Payments</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your payment history</p>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Payment ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Method</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Receipt No</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {recentPayments.length > 0 ? (
                  recentPayments.slice(0, 5).map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white font-medium">PAY-{payment.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-700 dark:text-gray-300">{safeDate(payment.paymentDate)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900 dark:text-white font-semibold">{formatCurrency(payment.paymentAmount, 'Rs.')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border capitalize ${getPaymentStatusColor(payment.paymentMethod)}`}>
                          {payment.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600 dark:text-gray-400">{payment.receiptNumber || 'N/A'}</p>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center">
                        <CreditCard className="w-12 h-12 text-gray-500 dark:text-gray-600 mb-3 opacity-50" />
                        <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">No payment history yet</p>
                        <p className="text-sm text-gray-500 dark:text-gray-500">Your payment records will appear here once you make payments</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <button
            onClick={() => router.push('/customer/bills')}
            className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all"
          >
            <FileText className="w-6 h-6 text-blue-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-semibold">View Bills</p>
          </button>

          <button
            onClick={() => router.push('/customer/payment')}
            className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl hover:border-green-500/40 transition-all"
          >
            <CreditCard className="w-6 h-6 text-green-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-semibold">Make Payment</p>
          </button>

          <button
            onClick={() => router.push('/customer/analytics')}
            className="p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl hover:border-purple-500/40 transition-all"
          >
            <Activity className="w-6 h-6 text-purple-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-semibold">Usage Analytics</p>
          </button>

          <button
            onClick={() => router.push('/customer/profile')}
            className="p-4 bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl hover:border-orange-500/40 transition-all"
          >
            <Zap className="w-6 h-6 text-orange-400 mb-2" />
            <p className="text-gray-900 dark:text-white font-semibold">My Profile</p>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

