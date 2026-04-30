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
  ArrowRight
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

export default function EmployeeNotifications() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [markingAllRead, setMarkingAllRead] = useState(false);

  // Fetch notifications from API
  useEffect(() => {
    fetchNotifications();
  }, [activeFilter]);

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
    } finally {
      setLoading(false);
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

  // Helper function to show success messages
  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'work_order':
        return <Wrench className="w-5 h-5 text-blue-500" />;
      case 'billing':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'service':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'system':
        return <FileText className="w-5 h-5 text-purple-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'low':
        return 'border-l-green-500 bg-green-50 dark:bg-green-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const categories = [
    { id: 'all', label: 'All Notifications', count: notifications.length },
    { id: 'unread', label: 'Unread', count: notifications.filter(n => !n.read).length },
    { id: 'work_order', label: 'Work Orders', count: notifications.filter(n => n.type === 'work_order').length },
    { id: 'billing', label: 'Billing', count: notifications.filter(n => n.type === 'billing').length },
    { id: 'service', label: 'Service', count: notifications.filter(n => n.type === 'service').length },
    { id: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length }
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading notifications...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Error Loading Notifications</h3>
          </div>
          <p className="text-red-300 mb-4">{error}</p>
          <button
            onClick={fetchNotifications}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
          >
            Try Again
          </button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center">
                <Bell className="w-6 h-6 mr-2 text-green-500" />
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 px-2 py-1 bg-red-500 text-white text-xs rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Stay updated with your work assignments and system alerts
              </p>
            </div>
            <div className="mt-3 sm:mt-0 flex items-center space-x-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-2 bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Mark All Read</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex gap-4">
          {/* Categories Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10 h-full">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Categories</h2>
              <div className="space-y-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setActiveFilter(category.id)}
                    className={`w-full px-4 py-3 rounded-lg text-left transition-all flex items-center justify-between ${
                      activeFilter === category.id
                        ? 'bg-gradient-to-r from-green-400/20 to-emerald-500/20 text-white border border-green-400/30'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{category.label}</span>
                    <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 rounded-full text-xs">
                      {category.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 min-h-0">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 h-full flex flex-col">
              {notifications.length === 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Bell className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Notifications</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {activeFilter === 'all' 
                        ? "You're all caught up! No notifications to show."
                        : `No ${activeFilter} notifications found.`
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto">
                  <div className="p-4 space-y-3">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`border-l-4 rounded-lg p-4 transition-all hover:shadow-md ${
                          notification.read 
                            ? 'bg-white dark:bg-white/5 border-l-gray-300' 
                            : getPriorityColor(notification.priority)
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className={`font-semibold ${
                                  notification.read 
                                    ? 'text-gray-700 dark:text-gray-300' 
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {notification.title}
                                </h3>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                )}
                              </div>
                              <p className={`text-sm mb-2 ${
                                notification.read 
                                  ? 'text-gray-600 dark:text-gray-400' 
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.message}
                              </p>
                              <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center space-x-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{notification.time}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Calendar className="w-3 h-3" />
                                  <span>{notification.date}</span>
                                </div>
                                <span className="capitalize">{notification.priority} priority</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-4">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="p-2 text-gray-400 hover:text-green-500 transition-colors"
                                title="Mark as read"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Delete notification"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {notification.actionUrl && notification.actionUrl !== '#' && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/10">
                            <a
                              href={notification.actionUrl}
                              className="inline-flex items-center text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                            >
                              {notification.actionText || 'View Details'}
                              <ArrowRight className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

