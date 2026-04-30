'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { DashboardLayoutProps, Notification, UserType } from '@/types';
import {
  Zap,
  Home,
  FileText,
  BarChart3,
  Bell,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Moon,
  Sun,
  Users,
  Building,
  DollarSign,
  Activity,
  Gauge,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Info,
  Clock,
  Calculator,
  ZapOff,
  Plus,
  Loader2,
  Eye,
  KeyRound
} from 'lucide-react';

export default function DashboardLayout({ children, userType, userName }: DashboardLayoutProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  // Initialize connection status from localStorage if available
  const getInitialConnectionStatus = () => {
    if (typeof window !== 'undefined') {
      const cachedStatus = localStorage.getItem('customerConnectionStatus');
      const statusFetched = localStorage.getItem('customerConnectionStatusFetched');
      const cachedUserId = localStorage.getItem('customerConnectionUserId');
      
      // If we have cached status and it's for the current user, use it immediately
      if (cachedStatus && statusFetched === 'true' && cachedUserId) {
        return cachedStatus;
      }
    }
    return 'loading';
  };

  const initialStatus = getInitialConnectionStatus();
  const [hasActiveConnection, setHasActiveConnection] = useState(initialStatus === 'active');
  const [connectionStatus, setConnectionStatus] = useState<string>(initialStatus);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();

  // Use session data if available
  const displayName = session?.user?.name || userName || 'User';
  const userEmail = session?.user?.email || '';

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Get navigation items with professional grouping
  const getNavigationItems = () => {
    if (userType === 'customer') {
      return [
        { section: 'OVERVIEW', items: [
          { name: 'Dashboard', href: '/customer/dashboard', icon: Home, description: 'Overview & quick stats' },
        ]},
        { section: 'BILLING & PAYMENTS', items: [
          { name: 'My Bills', href: '/customer/view-bills', icon: FileText, description: 'View & download bills' },
          { name: 'Make Payment', href: '/customer/payment', icon: DollarSign, description: 'Pay your bills online' },
          { name: 'Usage Analytics', href: '/customer/analytics', icon: BarChart3, description: 'Track consumption patterns' },
          { name: 'Bill Calculator', href: '/customer/bill-calculator', icon: Calculator, description: 'Estimate your bill' },
        ]},
        { section: 'SERVICES', items: [
          { name: 'Request Reading', href: '/customer/request-reading', icon: Gauge, description: 'Request meter reading' },
          { name: 'Complaints', href: '/customer/complaints', icon: MessageSquare, description: 'Report issues' },
          { name: 'Outage Schedule', href: '/customer/outage-schedule', icon: ZapOff, description: 'Planned power outages' },
        ]},
        { section: 'ACCOUNT', items: [
          { name: 'Profile', href: '/customer/profile', icon: User, description: 'Manage your profile' },
          { name: 'Settings', href: '/customer/settings', icon: Settings, description: 'Account preferences' },
        ]},
      ];
    } else if (userType === 'employee') {
      return [
        { section: 'OVERVIEW', items: [
          { name: 'Dashboard', href: '/employee/dashboard', icon: Home, description: 'Tasks & performance' },
        ]},
        { section: 'CORE OPERATIONS', items: [
          { name: 'Meter Reading', href: '/employee/meter-reading', icon: Gauge, description: 'Record customer readings' },
          { name: 'Work Orders', href: '/employee/work-orders', icon: ClipboardList, description: 'Manage assigned tasks' },
          { name: 'Bill Generation', href: '/employee/bill-generation', icon: FileText, description: 'Generate customer bills' },
        ]},
        { section: 'CUSTOMER MANAGEMENT', items: [
          { name: 'Customers', href: '/employee/customers', icon: Users, description: 'View customer details' },
        ]},
        { section: 'ACCOUNT', items: [
          { name: 'Notifications', href: '/employee/notifications', icon: Bell, description: 'View your notifications' },
          { name: 'Profile', href: '/employee/profile', icon: User, description: 'Your employee profile' },
          { name: 'Settings', href: '/employee/settings', icon: Settings, description: 'Preferences' },
        ]},
      ];
    } else if (userType === 'admin') {
      return [
        { section: 'OVERVIEW', items: [
          { name: 'Dashboard', href: '/admin/dashboard', icon: Home, description: 'System overview & stats' },
        ]},
        { section: 'USER MANAGEMENT', items: [
          { name: 'Customers', href: '/admin/customers', icon: Users, description: 'Manage all customers' },
          { name: 'Employees', href: '/admin/employees', icon: Building, description: 'Manage staff members' },
          { name: 'Connection Requests', href: '/admin/connection-requests', icon: Zap, description: 'Review new connection applications' },
          { name: 'Reading Requests', href: '/admin/reading-requests', icon: Gauge, description: 'Manage meter reading requests' },
          { name: 'Password Resets', href: '/admin/password-resets', icon: KeyRound, description: 'Manage password reset requests' },
          { name: 'Complaints', href: '/admin/complaints', icon: MessageSquare, description: 'Review & assign complaints' },
        ]},
        { section: 'BILLING & FINANCE', items: [
          { name: 'Generate Bills', href: '/admin/bills/generate', icon: FileText, description: 'Bulk bill generation' },
          { name: 'View Bills', href: '/admin/bills', icon: Eye, description: 'View & manage generated bills' },
          { name: 'Tariffs', href: '/admin/tariffs', icon: DollarSign, description: 'Manage pricing plans' },
        ]},
        { section: 'ANALYTICS', items: [
          { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, description: 'System analytics' },
        ]},
        { section: 'SYSTEM', items: [
          { name: 'Outages', href: '/admin/outages', icon: ZapOff, description: 'Manage power outages' },
          { name: 'Settings', href: '/admin/settings', icon: Settings, description: 'System configuration' },
        ]},
        { section: 'ACCOUNT', items: [
          { name: 'Notifications', href: '/admin/notifications', icon: Bell, description: 'View system notifications' },
          { name: 'Profile', href: '/admin/profile', icon: User, description: 'Admin profile' },
        ]},
      ];
    }
    return [];
  };

  const navigationItems = getNavigationItems();

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications?filter=unread&limit=5');
      const result = await response.json();

      if (response.ok && result.success) {
        setNotifications(result.data || []);
        setUnreadCount(result.data?.length || 0);
      } else {
        // If notifications API doesn't exist, set empty state
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // Set empty state on error
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    const isDark = localStorage.getItem('theme') === 'dark';
    setIsDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Fetch customer connection status only once per session
    const fetchCustomerStatus = async () => {
      if (userType === 'customer' && session?.user?.id) {
        // Check if we have cached status and fetch flag
        const cachedStatus = localStorage.getItem('customerConnectionStatus');
        const statusFetched = localStorage.getItem('customerConnectionStatusFetched');
        const currentUserId = session.user.id;
        const cachedUserId = localStorage.getItem('customerConnectionUserId');
        
        // If we have cached status for the same user, use it immediately
        if (cachedStatus && statusFetched === 'true' && cachedUserId === currentUserId) {
          setConnectionStatus(cachedStatus);
          setHasActiveConnection(cachedStatus === 'active');
          return; // Don't fetch from API
        }
        
        // Only fetch from API if we haven't fetched for this user
        try {
          const response = await fetch('/api/customers/profile');
          if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
              const status = result.data.status;
              setConnectionStatus(status);
              setHasActiveConnection(status === 'active');
              
              // Cache the status and fetch flag in localStorage
              localStorage.setItem('customerConnectionStatus', status);
              localStorage.setItem('customerConnectionStatusFetched', 'true');
              localStorage.setItem('customerConnectionUserId', currentUserId);
            } else {
              setConnectionStatus('unknown');
              setHasActiveConnection(false);
              localStorage.setItem('customerConnectionStatus', 'unknown');
              localStorage.setItem('customerConnectionStatusFetched', 'true');
              localStorage.setItem('customerConnectionUserId', currentUserId);
            }
          } else {
            setConnectionStatus('unknown');
            setHasActiveConnection(false);
            localStorage.setItem('customerConnectionStatus', 'unknown');
            localStorage.setItem('customerConnectionStatusFetched', 'true');
            localStorage.setItem('customerConnectionUserId', currentUserId);
          }
        } catch (error) {
          console.error('Error fetching customer status:', error);
          setConnectionStatus('unknown');
          setHasActiveConnection(false);
          localStorage.setItem('customerConnectionStatus', 'unknown');
          localStorage.setItem('customerConnectionStatusFetched', 'true');
          localStorage.setItem('customerConnectionUserId', currentUserId);
        }
      } else if (userType !== 'customer') {
        // For non-customers, set to active by default
        setConnectionStatus('active');
        setHasActiveConnection(true);
      }
    };

    fetchCustomerStatus();

    // Fetch notifications on mount
    if (status === 'authenticated') {
      fetchNotifications();
    }

    // Listen for connection status changes
    const handleConnectionChange = (e: CustomEvent) => {
      const newStatus = e.detail.status;
      setConnectionStatus(newStatus);
      setHasActiveConnection(newStatus === 'active');
      localStorage.setItem('customerConnectionStatus', newStatus);
      localStorage.setItem('customerConnectionStatusFetched', 'true');
      if (session?.user?.id) {
        localStorage.setItem('customerConnectionUserId', session.user.id);
      }
    };

    // Function to manually refresh connection status (for admin actions)
    const refreshConnectionStatus = () => {
      localStorage.removeItem('customerConnectionStatusFetched');
      fetchCustomerStatus();
    };

    // Expose refresh function globally for admin actions
    (window as any).refreshCustomerConnectionStatus = refreshConnectionStatus;

    window.addEventListener('connectionStatusChange' as any, handleConnectionChange);

    return () => {
      window.removeEventListener('connectionStatusChange' as any, handleConnectionChange);
      delete (window as any).refreshCustomerConnectionStatus;
    };
  }, [status, session?.user?.id, userType]);

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    if (newTheme) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }

    // Dispatch custom event for theme change
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { isDark: newTheme } }));
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      // Clear all cached connection status data on logout
      localStorage.removeItem('customerConnectionStatus');
      localStorage.removeItem('customerConnectionStatusFetched');
      localStorage.removeItem('customerConnectionUserId');
      
      await signOut({
        redirect: true,
        callbackUrl: '/login'
      });
    } catch (error) {
      console.error('Logout error:', error);
      setIsLoggingOut(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'billing': return <FileText className="h-5 w-5 text-green-500" />;
      case 'payment': return <DollarSign className="h-5 w-5 text-blue-500" />;
      case 'work_order': return <ClipboardList className="h-5 w-5 text-purple-500" />;
      case 'complaint': return <MessageSquare className="h-5 w-5 text-orange-500" />;
      case 'alert': return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'reminder': return <Clock className="h-5 w-5 text-yellow-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  const getUserTypeColor = () => {
    switch (userType) {
      case 'admin': return 'from-blue-500 to-blue-600';
      case 'employee': return 'from-green-500 to-green-600';
      default: return 'from-orange-500 to-orange-600';
    }
  };

  const getUserTypeLabel = () => {
    switch (userType) {
      case 'admin': return 'Administrator';
      case 'employee': return 'Employee';
      default: return 'Customer';
    }
  };

  // Show loading while checking authentication
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-yellow-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Sidebar for desktop */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 transform ${
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 transition-transform bg-white dark:bg-gray-800 shadow-xl`}>
        <div className="h-full flex flex-col">
          {/* Logo */}
          <div className="p-4 border-b dark:border-gray-700">
            <Link href="/" className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
                <Zap className="h-8 w-8 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">ElectroLux</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Energy Management</p>
              </div>
            </Link>
          </div>

          {/* User type badge */}
          <div className="px-4 py-3 border-b dark:border-gray-700">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white bg-gradient-to-r ${getUserTypeColor()}`}>
              {getUserTypeLabel()}
            </span>
          </div>

          {/* Navigation with Grouped Sections */}
          <nav className="flex-1 overflow-y-auto p-4">
            <div className="space-y-6">
              {navigationItems.map((section, sectionIndex) => (
                <div key={section.section}>
                  {/* Section Header */}
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 px-3">
                    {section.section}
                  </h3>

                  {/* Section Items */}
                  <ul className="space-y-1">
                    {section.items.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <li key={item.name}>
                          <Link
                            href={item.href}
                            className={`group flex items-center space-x-3 px-3 py-2 rounded-lg transition-all ${
                              isActive
                                ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-yellow-500/30'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            title={item.description}
                          >
                            <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? '' : 'group-hover:scale-110 transition-transform'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{item.name}</p>
                              <p className={`text-xs truncate ${
                                isActive
                                  ? 'text-white/80'
                                  : 'text-gray-500 dark:text-gray-400'
                              }`}>
                                {item.description}
                              </p>
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Divider (except for last section) */}
                  {sectionIndex < navigationItems.length - 1 && (
                    <div className="mt-4 border-t border-gray-200 dark:border-gray-700"></div>
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* Connection Status (for customers) - Only show if meaningful */}
          {userType === 'customer' && connectionStatus !== 'unknown' && connectionStatus !== 'loading' && (
            <div className="p-4 border-t dark:border-gray-700">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Connection</span>
                <span className={`flex items-center space-x-1 text-sm ${
                  connectionStatus === 'active' ? 'text-green-500' :
                  connectionStatus === 'pending_installation' ? 'text-yellow-500' :
                  connectionStatus === 'suspended' ? 'text-red-500' :
                  'text-gray-500 dark:text-gray-400'
                }`}>
                  <span className={`h-2 w-2 rounded-full ${
                    connectionStatus === 'active' ? 'bg-green-500' :
                    connectionStatus === 'pending_installation' ? 'bg-yellow-500' :
                    connectionStatus === 'suspended' ? 'bg-red-500' :
                    'bg-gray-500 dark:bg-gray-400'
                  }`}></span>
                  <span>
                    {connectionStatus === 'active' ? 'Active' :
                     connectionStatus === 'pending_installation' ? 'Pending' :
                     connectionStatus === 'suspended' ? 'Suspended' :
                     connectionStatus}
                  </span>
                </span>
              </div>
            </div>
          )}

          {/* Logout button */}
          <div className="p-4 border-t dark:border-gray-700">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Logging out...</span>
                </>
              ) : (
                <>
                  <LogOut className="h-5 w-5" />
                  <span>Logout</span>
                </>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="lg:ml-64">
        {/* Top navigation */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              {isSidebarOpen ? <X className="h-6 w-6 text-gray-700 dark:text-gray-300" /> : <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />}
            </button>

            {/* Spacer for mobile menu button alignment */}
            <div className="flex-1 lg:hidden"></div>

            {/* Right side buttons */}
            <div className="flex items-center space-x-2 ml-auto">
              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Toggle theme"
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5 text-yellow-400" />
                ) : (
                  <Moon className="h-5 w-5 text-gray-600" />
                )}
              </button>

              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsNotificationOpen(!isNotificationOpen);
                    setIsProfileOpen(false);
                  }}
                  className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <Bell className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50">
                    <div className="p-4 border-b dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <div key={notification.id} className="p-4 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                            <div className="flex items-start space-x-3">
                              {getNotificationIcon(notification.type)}
                              <div className="flex-1">
                                <p className="font-medium text-sm text-gray-900 dark:text-white">{notification.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{notification.message}</p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center">
                                  <Clock className="h-3 w-3 mr-1" />
                                  {notification.time}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">All caught up!</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">No new notifications</p>
                        </div>
                      )}
                    </div>
                    <div className="p-3 text-center border-t dark:border-gray-700">
                      <Link href={`/${userType}/notifications`} className="text-sm text-yellow-500 hover:text-yellow-600">
                        View all notifications
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setIsProfileOpen(!isProfileOpen);
                    setIsNotificationOpen(false);
                  }}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">{displayName}</span>
                  <ChevronDown className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-50">
                    <div className="p-4 border-b dark:border-gray-700">
                      <p className="font-semibold text-gray-900 dark:text-white">{displayName}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{userEmail}</p>
                    </div>
                    <div className="p-2">
                      <Link
                        href={`/${userType}/profile`}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <User className="h-4 w-4" />
                        <span>Profile</span>
                      </Link>
                      <Link
                        href={`/${userType}/settings`}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                      >
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-red-600 dark:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoggingOut ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <LogOut className="h-4 w-4" />
                        )}
                        <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}

