'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Settings,
  Building,
  Zap,
  Users,
  FileText,
  Bell,
  ChevronRight,
  Loader2,
  CheckCircle,
  Shield,
  UserCog,
  BarChart3,
  CloudOff,
  Monitor,
  Moon,
  Sun,
  Palette
} from 'lucide-react';

export default function AdminSettingsHub() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [themeSuccess, setThemeSuccess] = useState(false);

  const [companyInfo, setCompanyInfo] = useState({
    companyName: 'Electrolux EMS',
    adminEmail: 'admin@electrolux.com',
    adminPhone: '0300-1234567'
  });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Management sections that link to specific pages
  const managementSections = [
    {
      title: 'Tariff Management',
      description: 'Configure electricity tariff rates for different customer types',
      icon: Zap,
      color: 'from-yellow-500 to-orange-500',
      link: '/admin/tariffs',
      enabled: true
    },
    {
      title: 'Employee Management',
      description: 'Manage employees, assignments, and work schedules',
      icon: UserCog,
      color: 'from-green-500 to-emerald-500',
      link: '/admin/employees',
      enabled: true
    },
    {
      title: 'Customer Management',
      description: 'View and manage customer accounts and meter connections',
      icon: Users,
      color: 'from-blue-500 to-cyan-500',
      link: '/admin/customers',
      enabled: true
    },
    {
      title: 'Connection Requests',
      description: 'Review and approve new meter connection applications',
      icon: FileText,
      color: 'from-purple-500 to-pink-500',
      link: '/admin/connection-requests',
      enabled: true
    },
    {
      title: 'Outage Management',
      description: 'Schedule and manage power outage notifications',
      icon: CloudOff,
      color: 'from-orange-500 to-red-500',
      link: '/admin/outages',
      enabled: true
    },
    {
      title: 'Notifications Center',
      description: 'Manage system notifications and alerts',
      icon: Bell,
      color: 'from-indigo-500 to-purple-500',
      link: '/admin/notifications',
      enabled: true
    },
    {
      title: 'Analytics & Reports',
      description: 'View system analytics and generate reports',
      icon: BarChart3,
      color: 'from-teal-500 to-green-500',
      link: '/admin/analytics',
      enabled: true
    }
  ];

  if (loading) {
    return (
      <DashboardLayout userType="admin" userName="Admin">
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="w-12 h-12 text-red-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="admin" userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">System Settings & Management</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Central hub for all system configuration and management</p>
            </div>
          </div>
        </div>

        {/* Company Information (Read-Only) */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center space-x-3 mb-6">
            <Building className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Company Information</h2>
            <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">Read Only</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Company Name</p>
              <p className="text-gray-900 dark:text-white font-semibold">{companyInfo.companyName}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Admin Email</p>
              <p className="text-gray-900 dark:text-white font-semibold">{companyInfo.adminEmail}</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Admin Phone</p>
              <p className="text-gray-900 dark:text-white font-semibold">{companyInfo.adminPhone}</p>
            </div>
          </div>
        </div>

        {/* Display Preferences */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center space-x-3 mb-6">
            <Palette className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Display Preferences</h2>
          </div>

          {themeSuccess && (
            <div className="mb-4 flex items-center space-x-2 px-4 py-3 bg-green-500/20 rounded-lg border border-green-500/50">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-semibold">Theme preference saved successfully!</span>
            </div>
          )}

          <div>
            <label className="text-sm text-gray-700 dark:text-gray-300 mb-3 block font-medium">Theme Mode</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Light Theme */}
              <button
                onClick={() => {
                  setTheme('light');
                  setThemeSuccess(true);
                  setTimeout(() => {
                    setThemeSuccess(false);
                  }, 2000);
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === 'light'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-300 dark:border-white/20 hover:border-red-400'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`p-3 rounded-lg ${theme === 'light' ? 'bg-red-500/20' : 'bg-gray-100 dark:bg-white/5'}`}>
                    <Sun className={`w-6 h-6 ${theme === 'light' ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                  <span className={`font-semibold ${theme === 'light' ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    Light
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Light color scheme
                  </span>
                </div>
              </button>

              {/* Dark Theme */}
              <button
                onClick={() => {
                  setTheme('dark');
                  setThemeSuccess(true);
                  setTimeout(() => {
                    setThemeSuccess(false);
                  }, 2000);
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-300 dark:border-white/20 hover:border-red-400'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-red-500/20' : 'bg-gray-100 dark:bg-white/5'}`}>
                    <Moon className={`w-6 h-6 ${theme === 'dark' ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                  <span className={`font-semibold ${theme === 'dark' ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    Dark
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Dark color scheme
                  </span>
                </div>
              </button>

              {/* System Theme */}
              <button
                onClick={() => {
                  setTheme('system');
                  setThemeSuccess(true);
                  setTimeout(() => {
                    setThemeSuccess(false);
                  }, 2000);
                }}
                className={`p-4 rounded-xl border-2 transition-all ${
                  theme === 'system'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-gray-300 dark:border-white/20 hover:border-red-400'
                }`}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className={`p-3 rounded-lg ${theme === 'system' ? 'bg-red-500/20' : 'bg-gray-100 dark:bg-white/5'}`}>
                    <Monitor className={`w-6 h-6 ${theme === 'system' ? 'text-red-500' : 'text-gray-600 dark:text-gray-400'}`} />
                  </div>
                  <span className={`font-semibold ${theme === 'system' ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                    System
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    Follow system preference
                  </span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Management Hub - Navigation Cards */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center space-x-3 mb-2">
            <Shield className="w-6 h-6 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Management Hub</h2>
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">Quick access to all system management features</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {managementSections.slice(0, 6).map((section, index) => (
              <button
                key={index}
                onClick={() => router.push(section.link)}
                disabled={!section.enabled}
                className={`group p-6 bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 hover:shadow-xl transition-all text-left ${
                  section.enabled ? 'hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 bg-gradient-to-br ${section.color} rounded-xl`}>
                    <section.icon className="w-6 h-6 text-white" />
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{section.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{section.description}</p>
              </button>
            ))}
          </div>

          {/* Last Row - Centered Single Card */}
          {managementSections.length > 6 && (
            <div className="flex justify-center mt-4">
              {managementSections.slice(6).map((section, index) => (
                <button
                  key={index}
                  onClick={() => router.push(section.link)}
                  disabled={!section.enabled}
                  className={`group p-6 bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 hover:shadow-xl transition-all text-left w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)] ${
                    section.enabled ? 'hover:scale-105 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`p-3 bg-gradient-to-br ${section.color} rounded-xl`}>
                      <section.icon className="w-6 h-6 text-white" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{section.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{section.description}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

