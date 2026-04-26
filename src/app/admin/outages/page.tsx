'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Zap,
  ZapOff,
  Plus,
  Edit,
  Trash2,
  X,
  Search,
  Filter,
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Save
} from 'lucide-react';

export default function AdminOutagesManagement() {
  const router = useRouter();
  const [outages, setOutages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterZone, setFilterZone] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedOutage, setSelectedOutage] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    areaName: '',
    zone: 'Zone A',
    outageType: 'planned' as 'planned' | 'unplanned',
    reason: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    scheduledStartTime: '',
    scheduledEndTime: '',
    affectedCustomerCount: '0',
    status: 'scheduled' as 'scheduled' | 'ongoing' | 'restored' | 'cancelled'
  });
  const [zoneCountLoading, setZoneCountLoading] = useState(false);

  useEffect(() => {
    fetchOutages();
  }, [filterZone, filterStatus, filterType]);

  const fetchOutages = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterZone !== 'all') params.append('zone', filterZone);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);

      const response = await fetch(`/api/outages?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch outages');
      }

      const result = await response.json();

      if (result.success) {
        setOutages(result.data || []);
      } else {
        throw new Error(result.error || 'Failed to load outages');
      }
    } catch (err: any) {
      console.error('Error fetching outages:', err);
      setError(err.message || 'Failed to load outages');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (mode: 'create' | 'edit', outage?: any) => {
    setModalMode(mode);
    if (mode === 'edit' && outage) {
      setSelectedOutage(outage);
      setFormData({
        areaName: outage.areaName || '',
        zone: outage.zone || 'Zone A',
        outageType: outage.outageType || 'planned',
        reason: outage.reason || '',
        severity: outage.severity || 'medium',
        scheduledStartTime: outage.scheduledStartTime ? new Date(outage.scheduledStartTime).toISOString().slice(0, 16) : '',
        scheduledEndTime: outage.scheduledEndTime ? new Date(outage.scheduledEndTime).toISOString().slice(0, 16) : '',
        affectedCustomerCount: outage.affectedCustomerCount?.toString() || '0',
        status: outage.status || 'scheduled'
      });
    } else {
      setFormData({
        areaName: '',
        zone: 'Zone A',
        outageType: 'planned',
        reason: '',
        severity: 'medium',
        scheduledStartTime: '',
        scheduledEndTime: '',
        affectedCustomerCount: '0',
        status: 'scheduled'
      });
    }
    setShowModal(true);
  };
  // Auto-calculate affected customers when zone changes
  useEffect(() => {
    const fetchZoneCount = async () => {
      if (!formData.zone) return;
      try {
        setZoneCountLoading(true);
        const resp = await fetch(`/api/customers?countOnly=true&zone=${encodeURIComponent(formData.zone)}`);
        const json = await resp.json();
        if (resp.ok && json?.success) {
          const count = Number(json.data?.count || 0);
          setFormData(prev => ({ ...prev, affectedCustomerCount: String(count) }));
        }
      } catch (e) {
        // ignore UI errors here; API still computes server-side as fallback
      } finally {
        setZoneCountLoading(false);
      }
    };
    fetchZoneCount();
  }, [formData.zone]);

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedOutage(null);
    setFormData({
      areaName: '',
      zone: 'Zone A',
      outageType: 'planned',
      reason: '',
      severity: 'medium',
      scheduledStartTime: '',
      scheduledEndTime: '',
      affectedCustomerCount: '0',
      status: 'scheduled'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = modalMode === 'create' ? '/api/outages' : '/api/outages';
      const method = modalMode === 'create' ? 'POST' : 'PATCH';

      const payload = modalMode === 'edit'
        ? { id: selectedOutage.id, ...formData }
        : formData;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Operation failed');
      }

      handleCloseModal();
      fetchOutages();
    } catch (err: any) {
      console.error('Error submitting outage:', err);
      alert(`Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this outage?')) return;

    try {
      const response = await fetch(`/api/outages?id=${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to delete outage');
      }

      fetchOutages();
    } catch (err: any) {
      console.error('Error deleting outage:', err);
      alert(`Error: ${err.message}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'ongoing': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'restored': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getTypeColor = (type: string) => {
    return type === 'planned'
      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
      : 'bg-orange-500/20 text-orange-400 border-orange-500/50';
  };

  const filteredOutages = outages.filter(outage =>
    outage.areaName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    outage.zone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    outage.reason?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: outages.length,
    scheduled: outages.filter(o => o.status === 'scheduled').length,
    ongoing: outages.filter(o => o.status === 'ongoing').length,
    restored: outages.filter(o => o.status === 'restored').length
  };

  return (
    <DashboardLayout userType="admin" userName="Admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                <ZapOff className="w-8 h-8 mr-3 text-red-500" />
                Outage Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Manage load shedding schedules and emergency outages</p>
            </div>
            <button
              onClick={() => handleOpenModal('create')}
              className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl hover:shadow-lg hover:shadow-red-500/50 transition-all font-semibold flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Create Outage</span>
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <Zap className="w-8 h-8 text-blue-400" />
              <span className="text-xs text-gray-600 dark:text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">All outages</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <Calendar className="w-8 h-8 text-yellow-400" />
              <span className="text-xs text-yellow-400">Upcoming</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.scheduled}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Scheduled</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <AlertTriangle className="w-8 h-8 text-red-400" />
              <span className="text-xs text-red-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.ongoing}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Ongoing</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <span className="text-xs text-green-400">Done</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.restored}</p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Restored</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search outages..."
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-red-400 transition-colors"
              />
            </div>

            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
            >
              <option value="all">All Zones</option>
              <option value="Zone A">Zone A</option>
              <option value="Zone B">Zone B</option>
              <option value="Zone C">Zone C</option>
              <option value="Zone D">Zone D</option>
              <option value="Zone E">Zone E</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
            >
              <option value="all">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="ongoing">Ongoing</option>
              <option value="restored">Restored</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Outages Table */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
            </div>
          ) : error ? (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400">{error}</p>
              <button
                onClick={fetchOutages}
                className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Area & Zone</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Schedule</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Affected</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {filteredOutages.length > 0 ? (
                    filteredOutages.map((outage) => (
                      <tr key={outage.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-medium">{outage.areaName}</p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {outage.zone}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-xs mt-1">{outage.reason}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm">
                            <p className="text-white">{outage.scheduledStartTime ? new Date(outage.scheduledStartTime).toLocaleString() : 'TBD'}</p>
                            <p className="text-gray-600 dark:text-gray-400">to {outage.scheduledEndTime ? new Date(outage.scheduledEndTime).toLocaleString() : 'TBD'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getTypeColor(outage.outageType)}`}>
                            {outage.outageType.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusColor(outage.status)}`}>
                            {outage.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white text-sm">{outage.affectedCustomerCount} customers</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleOpenModal('edit', outage)}
                              className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(outage.id)}
                              className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <ZapOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-900 dark:text-white font-semibold">No outages found</p>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Try adjusting your filters</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-red-500/20 to-rose-500/20 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {modalMode === 'create' ? 'Create New Outage' : 'Edit Outage'}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Area Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.areaName}
                    onChange={(e) => setFormData({ ...formData, areaName: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
                    placeholder="e.g., North District"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zone <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    required
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
                  >
                    <option value="Zone A">Zone A</option>
                    <option value="Zone B">Zone B</option>
                    <option value="Zone C">Zone C</option>
                    <option value="Zone D">Zone D</option>
                    <option value="Zone E">Zone E</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Outage Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.outageType}
                    onChange={(e) => setFormData({ ...formData, outageType: e.target.value as any })}
                    required
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
                  >
                    <option value="planned">Planned (Load Shedding)</option>
                    <option value="unplanned">Unplanned (Emergency)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Reason
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    rows={2}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
                    placeholder="e.g., Daily load shedding schedule"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Severity <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value as any })}
                    required
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Status <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    required
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="restored">Restored</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledStartTime}
                    onChange={(e) => setFormData({ ...formData, scheduledStartTime: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledEndTime}
                    onChange={(e) => setFormData({ ...formData, scheduledEndTime: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-red-400"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Affected Customer Count
                  </label>
                  <input
                    type="number"
                    value={formData.affectedCustomerCount}
                    onChange={(e) => setFormData({ ...formData, affectedCustomerCount: e.target.value })}
                    min="0"
                    readOnly
                    className="w-full px-4 py-2 bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none"
                  />
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {zoneCountLoading ? 'Calculating from selected zone…' : 'Auto-calculated from selected zone. Server will also validate.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      <span>{modalMode === 'create' ? 'Create Outage' : 'Update Outage'}</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-6 py-3 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-white/20 transition-all font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

