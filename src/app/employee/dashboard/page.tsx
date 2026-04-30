'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  Gauge,
  Users,
  ClipboardCheck,
  Award,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  ArrowRight,
  Loader2,
  RefreshCw,
  TrendingUp
} from 'lucide-react';

export default function EmployeeDashboard() {
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
      setError(null);
      const response = await fetch('/api/employee/dashboard');

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !dashboardData) {
    return (
      <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Failed to Load Dashboard
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error || 'No data available'}</p>
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { metrics = {}, recentWorkOrders = [] } = dashboardData;
  const { assignedOrders = 0, completedOrders = 0, readingsToday = 0 } = metrics;

  // Calculate statistics from real data
  const pendingOrders = assignedOrders - completedOrders;
  const completionRate = assignedOrders > 0 ? Math.round((completedOrders / assignedOrders) * 100) : 0;
  const performanceScore = Math.min(Math.round((readingsToday / 30) * 50 + completionRate / 2), 100);

  const stats = [
    {
      title: 'Meter Readings Today',
      value: readingsToday.toString(),
      target: '30',
      icon: Gauge,
      color: 'from-blue-700 to-blue-600',
      progress: Math.min((readingsToday / 30) * 100, 100),
      bgGlow: 'bg-blue-600/20'
    },
    {
      title: 'Assigned Work Orders',
      value: assignedOrders.toString(),
      status: `${pendingOrders} Pending`,
      icon: ClipboardCheck,
      color: 'from-green-700 to-green-600',
      progress: assignedOrders > 0 ? (completedOrders / assignedOrders) * 100 : 0,
      bgGlow: 'bg-green-600/20'
    },
    {
      title: 'Completed Today',
      value: completedOrders.toString(),
      change: `${completionRate}% Complete`,
      icon: CheckCircle,
      color: 'from-indigo-700 to-indigo-600',
      progress: completionRate,
      bgGlow: 'bg-indigo-600/20'
    },
    {
      title: 'Performance Score',
      value: `${performanceScore}%`,
      rating: performanceScore >= 80 ? 'Excellent' : performanceScore >= 60 ? 'Good' : 'Fair',
      icon: Award,
      color: 'from-amber-600 to-amber-700',
      progress: performanceScore,
      bgGlow: 'bg-amber-600/20'
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'assigned':
      case 'pending': return <AlertCircle className="w-4 h-4 text-blue-400" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'assigned':
      case 'pending': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400 border-gray-500/50';
    }
  };

  return (
    <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Employee Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your daily tasks and track your performance</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={fetchDashboardData}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Today's Date</p>
                <p className="text-gray-900 dark:text-white font-semibold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <div key={index} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              <div className="mt-2">
                {stat.change && (
                  <span className="text-green-600 dark:text-green-400 text-xs font-medium">{stat.change}</span>
                )}
                {stat.status && (
                  <span className="text-gray-500 dark:text-gray-400 text-xs">{stat.status}</span>
                )}
                {stat.rating && (
                  <span className="text-amber-600 dark:text-amber-400 text-xs font-medium">{stat.rating}</span>
                )}
                {stat.target && (
                  <span className="text-gray-500 dark:text-gray-400 text-xs"> / {stat.target}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Work Orders Table */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Work Orders</h2>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Your assigned tasks and their current status</p>
              </div>
              <button
                onClick={() => router.push('/employee/work-orders')}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all text-sm flex items-center space-x-2"
              >
                <span>View All</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {recentWorkOrders.length > 0 ? (
                  recentWorkOrders.slice(0, 5).map((order: any) => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-gray-900 dark:text-white font-medium">WO-{order.id}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium">{order.customerName || 'N/A'}</p>
                          {order.title && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{order.title}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-700 dark:text-gray-300 capitalize text-sm">
                          {order.workType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-gray-700 dark:text-gray-300 text-sm">
                          {new Date(order.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status?.replace('_', ' ')}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => router.push(`/employee/work-orders`)}
                          className="text-green-400 hover:text-green-300 transition-colors flex items-center space-x-1 text-sm font-medium"
                        >
                          <span>View</span>
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <ClipboardCheck className="w-12 h-12 text-gray-400" />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Work Orders Assigned</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">You don't have any active work orders at the moment</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push('/employee/meter-reading')}
            className="group relative p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:border-blue-500/40 transition-all"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gauge className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900 dark:text-white font-semibold mb-1">Record Meter Reading</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Submit new customer readings</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/employee/work-orders')}
            className="group relative p-6 bg-green-500/10 border border-green-500/20 rounded-xl hover:border-green-500/40 transition-all"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ClipboardCheck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900 dark:text-white font-semibold mb-1">View Work Orders</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Manage assigned tasks</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => router.push('/employee/customers')}
            className="group relative p-6 bg-indigo-500/10 border border-indigo-500/20 rounded-xl hover:border-indigo-500/40 transition-all"
          >
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-gray-900 dark:text-white font-semibold mb-1">Customer Directory</p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Search customer info</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}

