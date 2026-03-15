'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Zap,
  ZapOff,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Info,
  Search,
  Loader2
} from 'lucide-react';

export default function OutageSchedule() {
  const { data: session } = useSession();

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [customerZone, setCustomerZone] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [outages, setOutages] = useState<any[]>([]);
  const [stats, setStats] = useState({
    scheduled: 0,
    completed: 0,
    affectedUsers: 0,
    avgDuration: 0
  });

  // Fetch outages and customer profile
  useEffect(() => {
    fetchOutages();
    fetchCustomerProfile();
  }, []);

  const fetchOutages = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/outages');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setOutages(result.data || []);
          calculateStats(result.data || []);
        }
      } else {
        console.error('Failed to fetch outages:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching outages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerProfile = async () => {
    try {
      const response = await fetch('/api/customers/profile');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data.zone) {
          setCustomerZone(result.data.zone);
        }
      }
    } catch (error) {
      console.error('Error fetching customer profile:', error);
    }
  };

  const calculateStats = (outageData: any[]) => {
    const scheduled = outageData.filter(o => o.status === 'scheduled').length;
    const completed = outageData.filter(o => o.status === 'restored').length;
    // For customers, show UNIQUE affected users in their zone (not sum across all outages)
    // Customer only sees their zone's outages, so affected users = zone's customer count
    const affectedUsers = outageData.length > 0 ? (outageData[0].affectedCustomerCount ?? 0) : 0;
    
    // Calculate average duration for completed outages
    const completedOutages = outageData.filter(o => o.status === 'restored' && o.actualStartTime && o.actualEndTime);
    let avgDuration = 0;
    if (completedOutages.length > 0) {
      const totalMinutes = completedOutages.reduce((sum, o) => {
        const start = new Date(o.actualStartTime);
        const end = new Date(o.actualEndTime);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60); // minutes
      }, 0);
      avgDuration = totalMinutes / completedOutages.length;
    }

    setStats({
      scheduled,
      completed,
      affectedUsers,
      avgDuration: Math.round(avgDuration)
    });
  };

  // Filter outages - customers only see their own zone (API already filters, this is extra safety)
  const filteredOutages = outages.filter(outage => {
    const matchesSearch = outage.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         outage.zone.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         outage.reason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesZone = customerZone ? outage.zone === customerZone : true; // Only customer's zone
    return matchesSearch && matchesZone;
  });

  // Get unique zones for filter
  const availableZones = [...new Set(outages.map(o => o.zone))];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'ongoing': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'planned'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      : 'bg-orange-500/20 text-orange-400 border-orange-500/50';
  };

  // Sort: customer's zone first, then by date
  const sortedOutages = [...filteredOutages].sort((a, b) => {
    // Prioritize customer's zone
    if (customerZone) {
      const aIsCustomerZone = a.zone === customerZone;
      const bIsCustomerZone = b.zone === customerZone;
      if (aIsCustomerZone && !bIsCustomerZone) return -1;
      if (!aIsCustomerZone && bIsCustomerZone) return 1;
    }

    // Then sort by status (scheduled first, then restored)
    if (a.status === 'scheduled' && b.status === 'restored') return -1;
    if (a.status === 'restored' && b.status === 'scheduled') return 1;

    // Then by date (newer first)
    const aTime = a.scheduledStartTime || a.createdAt;
    const bTime = b.scheduledStartTime || b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });

  // Use the stats from state
  const scheduledCount = stats.scheduled;
  const completedCount = stats.completed;
  const totalAffected = stats.affectedUsers;
  const avgDuration = stats.avgDuration;

  // Calculate average duration helper function
  const calculateAverageDuration = () => {
    if (avgDuration === 0) return '0';
    const hours = Math.floor(avgDuration / 60);
    const minutes = avgDuration % 60;
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}`;
    return `${hours}.${Math.round(minutes / 6)}`;
  };

  // Find upcoming outage in customer's zone
  const upcomingCustomerOutage = sortedOutages.find(
    o => o.status === 'scheduled' && customerZone && o.zone === customerZone
  );

  if (loading) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading outage schedule...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                <ZapOff className="w-8 h-8 mr-3 text-red-500" />
                Load Shedding & Outage Schedule
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Stay informed about planned and unplanned power outages in your area
                {customerZone && <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-md text-sm font-medium">Your Zone: {customerZone}</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-yellow-400">Upcoming</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Scheduled Outages</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{scheduledCount}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-green-400">Done</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Completed</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedCount}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Customers</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Affected Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalAffected.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Average</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Avg Duration</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{calculateAverageDuration()} hrs</p>
          </div>
        </div>

        {/* Alert Banner - Only show if customer's zone is affected */}
        {upcomingCustomerOutage && (
          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 backdrop-blur-xl rounded-2xl p-4 border border-orange-500/30">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-6 h-6 text-orange-400 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  Upcoming Outage Alert - Your Area Affected!
                </h3>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  <strong>{upcomingCustomerOutage.areaName}</strong> will experience a {upcomingCustomerOutage.outageType} power outage from <strong>{upcomingCustomerOutage.scheduledStartTime ? new Date(upcomingCustomerOutage.scheduledStartTime).toLocaleTimeString() : 'TBD'}</strong> to <strong>{upcomingCustomerOutage.scheduledEndTime ? new Date(upcomingCustomerOutage.scheduledEndTime).toLocaleTimeString() : 'TBD'}</strong> for {upcomingCustomerOutage.reason?.toLowerCase() || 'maintenance'}.
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Severity: <strong className="text-orange-400">{upcomingCustomerOutage.severity}</strong>
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">•</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Affected: <strong className="text-orange-400">{(upcomingCustomerOutage.affectedCustomerCount ?? 0).toLocaleString()} customers</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by area or reason..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors text-sm"
              />
            </div>
            {/* Zone filter removed for customers - they only see their own zone */}
            <div className="px-4 py-2 bg-blue-500/20 border border-blue-500/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-semibold text-blue-400">
                  Viewing: {customerZone || 'Your Zone'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Outage Schedule Table */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Area</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Schedule</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Duration</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Reason</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Affected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {sortedOutages.length > 0 ? (
                  sortedOutages.map((outage) => {
                    const isCustomerZone = customerZone && outage.zone === customerZone;
                    const startTime = outage.scheduledStartTime ? new Date(outage.scheduledStartTime).toLocaleString() : 'TBD';
                    const endTime = outage.scheduledEndTime ? new Date(outage.scheduledEndTime).toLocaleString() : 'TBD';
                    const duration = outage.scheduledStartTime && outage.scheduledEndTime 
                      ? `${Math.round((new Date(outage.scheduledEndTime).getTime() - new Date(outage.scheduledStartTime).getTime()) / (1000 * 60 * 60) * 10) / 10} hours`
                      : 'TBD';
                    
                    return (
                      <tr
                        key={outage.id}
                        className={`hover:bg-white/5 transition-colors ${isCustomerZone ? 'bg-blue-500/5' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className={`w-4 h-4 ${isCustomerZone ? 'text-yellow-400' : 'text-blue-400'}`} />
                            <span className="text-white font-medium">{outage.areaName}</span>
                            {isCustomerZone && (
                              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs font-semibold">YOUR ZONE</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white text-sm">{startTime}</p>
                            <p className="text-gray-600 dark:text-gray-400 text-xs">to {endTime}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4 text-purple-400" />
                            <span className="text-white text-sm">{duration}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-gray-300 text-sm">{outage.reason}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTypeColor(outage.outageType)}`}>
                            {outage.outageType === 'planned' ? <Calendar className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                            {outage.outageType.charAt(0).toUpperCase() + outage.outageType.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(outage.status)}`}>
                            {outage.status === 'restored' ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                            {outage.status.charAt(0).toUpperCase() + outage.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-white text-sm">{(outage.affectedCustomerCount ?? 0).toLocaleString()} users</span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <ZapOff className="w-12 h-12 text-gray-400 mb-3" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No Outages Found</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          No outages match your search criteria. Try adjusting your filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Information Box */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl p-6 border border-blue-500/20">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Info className="w-5 h-5 mr-2 text-blue-400" />
            Important Information
          </h3>
          <div className="space-y-3 text-gray-700 dark:text-gray-300 text-sm">
            <p>• <strong>Planned Outages:</strong> You will receive SMS/Email notifications 24 hours in advance</p>
            <p>• <strong>Unplanned Outages:</strong> We work to restore power as quickly as possible, typically within 2-4 hours</p>
            <p>• <strong>Emergency Contact:</strong> For power emergencies, call our 24/7 helpline: <strong className="text-orange-400">1-800-POWER-HELP</strong></p>
            <p>• <strong>Compensation:</strong> Extended outages beyond scheduled time may qualify for bill credits</p>
            <p>• <strong>Load Shedding:</strong> During peak demand periods, scheduled rotational power cuts help prevent grid overload</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

