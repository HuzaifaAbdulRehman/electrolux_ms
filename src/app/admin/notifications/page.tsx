'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  EyeOff,
  Calendar,
  User,
  Zap,
  DollarSign,
  Wrench,
  FileText,
  ArrowRight,
  Users,
  Shield,
  Activity,
  TrendingUp,
  Settings
} from 'lucide-react';

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  priority: string;
  actionUrl: string;
  actionText: string;
  read: boolean;
  time: string;
  date: string;
}

export default function AdminNotifications() {
  const { data: session } = useSession();
  const [activeFilter, setActiveFilter] = useState('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const filterParam = activeFilter === 'all' ? '' : `?filter=${activeFilter}`;
      const response = await fetch(`/api/notifications${filterParam}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch notifications');
      }

      setNotifications(result.data || []);
    } catch (err: any) {
      console.error('Error fetching notifications:', err);
      setError(err.message || 'Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch on mount and when filter changes
  useEffect(() => {
    fetchNotifications();
  }, [activeFilter]);

  const markAsRead = async (id: number) => {
    try {
      setActionLoading(id);
      setError(null);

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setNotifications(prev =>
          prev.map(notif =>
            notif.id === id ? { ...notif, read: true } : notif
          )
        );
        showSuccess('Marked as read');
      } else {
        throw new Error(result.error || 'Failed to mark as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError(error instanceof Error ? error.message : 'Failed to mark notification as read');
    } finally {
      setActionLoading(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAllRead(true);
      setError(null);

      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAllRead: true })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, read: true }))
        );
        showSuccess('All notifications marked as read');
      } else {
        throw new Error(result.error || 'Failed to mark all as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError(error instanceof Error ? error.message : 'Failed to mark all notifications as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      setActionLoading(id);
      setError(null);

      const response = await fetch(`/api/notifications?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setNotifications(prev => prev.filter(notif => notif.id !== id));
        showSuccess('Notification deleted');
      } else {
        throw new Error(result.error || 'Failed to delete notification');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete notification');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchNotifications();
      showSuccess('Notifications refreshed');
    } catch (err) {
      // Error already handled in fetchNotifications
    } finally {
      setRefreshing(false);
    }
  };

  // Helper function to show success messages
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'billing': return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'payment': return <DollarSign className="w-5 h-5 text-blue-500" />;
      case 'work_order': return <Wrench className="w-5 h-5 text-purple-500" />;
      case 'complaint': return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'system': return <Shield className="w-5 h-5 text-red-500" />;
      case 'customer': return <Users className="w-5 h-5 text-cyan-500" />;
      case 'employee': return <User className="w-5 h-5 text-indigo-500" />;
      case 'alert': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'reminder': return <Clock className="w-5 h-5 text-yellow-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'high': return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low': return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default: return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const getFilterCount = (filter: string) => {
    if (filter === 'all') return notifications.length;
    if (filter === 'unread') return notifications.filter(n => !n.read).length;
    return notifications.filter(n => n.type === filter).length;
  };

  const filters = [
    { id: 'all', label: 'All', icon: Bell },
    { id: 'unread', label: 'Unread', icon: Eye },
    { id: 'system', label: 'System', icon: Shield },
    { id: 'customer', label: 'Customer', icon: Users },
    { id: 'employee', label: 'Employee', icon: User },
    { id: 'billing', label: 'Billing', icon: DollarSign },
    { id: 'complaint', label: 'Complaints', icon: AlertCircle },
    { id: 'work_order', label: 'Work Orders', icon: Wrench }
  ];

  if (loading) {
    return (
      <DashboardLayout userType="admin" userName="Admin User">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-red-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="admin" userName="Admin User">
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10 mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Admin Notifications</h1>
              <p className="text-gray-600 dark:text-gray-400">
                System alerts, customer activities, and administrative updates
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`px-4 py-2 bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center space-x-2 ${
                  refreshing ? 'opacity-70' : ''
                }`}
              >
                {refreshing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                <span>Refresh</span>
              </button>
              <button
                onClick={markAllAsRead}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center space-x-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Mark All Read</span>
              </button>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 flex-shrink-0">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{notifications.length}</p>
              </div>
              <Bell className="w-8 h-8 text-gray-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Unread</p>
                <p className="text-2xl font-bold text-red-500">{notifications.filter(n => !n.read).length}</p>
              </div>
              <Eye className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">System Alerts</p>
                <p className="text-2xl font-bold text-orange-500">{notifications.filter(n => n.type === 'system').length}</p>
              </div>
              <Shield className="w-8 h-8 text-orange-500" />
            </div>
          </div>
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer Issues</p>
                <p className="text-2xl font-bold text-blue-500">{notifications.filter(n => n.type === 'complaint').length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10 mb-6 flex-shrink-0">
          <div className="flex items-center space-x-2 overflow-x-auto">
            <Filter className="w-5 h-5 text-gray-500 flex-shrink-0" />
            {filters.map((filter) => {
              const Icon = filter.icon;
              const count = getFilterCount(filter.id);
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                    activeFilter === filter.id
                      ? 'bg-red-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{filter.label}</span>
                  {count > 0 && (
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      activeFilter === filter.id
                        ? 'bg-white/20 text-white'
                        : 'bg-red-500 text-white'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-400">Error Loading Notifications</h3>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-gray-200 dark:border-white/10 text-center">
              <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Notifications</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {activeFilter === 'all' 
                  ? "You're all caught up! No notifications to display."
                  : `No ${activeFilter} notifications found.`
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border-l-4 border border-gray-200 dark:border-white/10 p-6 transition-all hover:shadow-lg ${
                    !notification.read ? getPriorityColor(notification.priority) : 'opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className={`text-lg font-semibold ${
                            !notification.read 
                              ? 'text-gray-900 dark:text-white' 
                              : 'text-gray-600 dark:text-gray-400'
                          }`}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                          )}
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            notification.priority === 'urgent' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                            notification.priority === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' :
                            notification.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {notification.priority}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{notification.date}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span>{notification.time}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {notification.actionUrl && notification.actionUrl !== '#' && (
                        <a
                          href={notification.actionUrl}
                          className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center space-x-1 text-sm"
                        >
                          <span>{notification.actionText}</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-2 text-gray-500 hover:text-green-500 transition-colors"
                          title="Mark as read"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-2 text-gray-500 hover:text-red-500 transition-colors"
                        title="Delete notification"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

