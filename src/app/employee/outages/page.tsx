'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Zap,
  ZapOff,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  Eye,
  Edit,
  Play,
  Square,
  RotateCcw
} from 'lucide-react';

interface Outage {
  id: number;
  areaName: string;
  zone: string;
  outageType: 'planned' | 'unplanned';
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  scheduledStartTime: string;
  scheduledEndTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  affectedCustomerCount: number;
  status: 'scheduled' | 'ongoing' | 'restored' | 'cancelled';
  restorationNotes?: string;
  createdAt: string;
}

export default function EmployeeOutages() {
  const { data: session } = useSession();
  const [outages, setOutages] = useState<Outage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedOutage, setSelectedOutage] = useState<Outage | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    restorationNotes: ''
  });

  useEffect(() => {
    fetchOutages();
  }, [filterStatus, filterType]);

  const fetchOutages = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);
      
      const response = await fetch(`/api/employee/outages?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch outages');
      }

      setOutages(result.data || []);
    } catch (err: any) {
      console.error('Error fetching outages:', err);
      setError(err.message || 'Failed to load outages');
      setOutages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedOutage || !updateData.status) return;

    try {
      setUpdating(true);
      
      const response = await fetch('/api/employee/outages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOutage.id,
          status: updateData.status,
          restorationNotes: updateData.restorationNotes
        })
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update outage');
      }

      // Update local state
      setOutages(prev => prev.map(outage => 
        outage.id === selectedOutage.id 
          ? { ...outage, status: updateData.status as any, restorationNotes: updateData.restorationNotes }
          : outage
      ));

      setShowUpdateModal(false);
      setSelectedOutage(null);
      setUpdateData({ status: '', restorationNotes: '' });
      
      // Show success message
      alert('Outage status updated successfully!');
      
    } catch (err: any) {
      console.error('Error updating outage:', err);
      alert(err.message || 'Failed to update outage');
    } finally {
      setUpdating(false);
    }
  };

  const openUpdateModal = (outage: Outage, newStatus: string) => {
    setSelectedOutage(outage);
    setUpdateData({ status: newStatus, restorationNotes: '' });
    setShowUpdateModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'ongoing': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'restored': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'cancelled': return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'ongoing': return <Play className="w-4 h-4" />;
      case 'restored': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'scheduled': return 'ongoing';
      case 'ongoing': return 'restored';
      default: return null;
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-green-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading outages...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10 mb-6 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Outage Management</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage power outages and restoration activities
              </p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={fetchOutages}
                className="px-4 py-2 bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center space-x-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10 mb-6 flex-shrink-0">
          <div className="flex items-center space-x-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-green-400"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="restored">Restored</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-green-400"
            >
              <option value="all">All Types</option>
              <option value="planned">Planned</option>
              <option value="unplanned">Unplanned</option>
            </select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <h3 className="text-lg font-semibold text-red-400">Error Loading Outages</h3>
                <p className="text-red-300">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Outages List */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {outages.length === 0 ? (
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-8 border border-gray-200 dark:border-white/10 text-center">
              <ZapOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Outages Found</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filterStatus === 'all' && filterType === 'all'
                  ? "No outages are currently scheduled or ongoing."
                  : "No outages match the current filters."
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {outages.map((outage) => {
                const nextStatus = getNextStatus(outage.status);
                return (
                  <div
                    key={outage.id}
                    className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-3">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                            {outage.areaName}
                          </h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(outage.status)}`}>
                            {getStatusIcon(outage.status)}
                            <span className="capitalize">{outage.status}</span>
                          </span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getSeverityColor(outage.severity)}`}>
                            {outage.severity.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Zone: {outage.zone}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">{outage.outageType}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {outage.scheduledStartTime ? new Date(outage.scheduledStartTime).toLocaleDateString() : 'TBD'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <AlertTriangle className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {outage.affectedCustomerCount} customers affected
                            </span>
                          </div>
                        </div>

                        {outage.reason && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            <strong>Reason:</strong> {outage.reason}
                          </p>
                        )}

                        {outage.restorationNotes && (
                          <p className="text-gray-600 dark:text-gray-400 mb-3">
                            <strong>Restoration Notes:</strong> {outage.restorationNotes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {nextStatus && (
                          <button
                            onClick={() => openUpdateModal(outage, nextStatus)}
                            className={`px-4 py-2 rounded-lg text-white font-medium transition-all flex items-center space-x-2 ${
                              nextStatus === 'ongoing' 
                                ? 'bg-orange-500 hover:bg-orange-600' 
                                : 'bg-green-500 hover:bg-green-600'
                            }`}
                          >
                            {nextStatus === 'ongoing' ? (
                              <>
                                <Play className="w-4 h-4" />
                                <span>Start Outage</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Mark Restored</span>
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Update Modal */}
        {showUpdateModal && selectedOutage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Update Outage Status
              </h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  Updating: <strong>{selectedOutage.areaName}</strong>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  New Status: <strong className="capitalize">{updateData.status}</strong>
                </p>
              </div>

              {updateData.status === 'restored' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Restoration Notes (Optional)
                  </label>
                  <textarea
                    value={updateData.restorationNotes}
                    onChange={(e) => setUpdateData(prev => ({ ...prev, restorationNotes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:border-green-400"
                    rows={3}
                    placeholder="Enter restoration details..."
                  />
                </div>
              )}

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleStatusUpdate}
                  disabled={updating}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Status</span>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    setSelectedOutage(null);
                    setUpdateData({ status: '', restorationNotes: '' });
                  }}
                  className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

