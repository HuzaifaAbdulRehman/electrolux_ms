'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import DashboardLayout from '@/components/DashboardLayout';
import {
  ClipboardList,
  Calendar,
  MapPin,
  Clock,
  User,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Search,
  RefreshCw,
  Zap,
  FileText,
  Phone,
  Navigation,
  Loader2,
  AlertTriangle,
  Gauge
} from 'lucide-react';

interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  workType: string;
  status: string;
  priority: string;
  assignedDate: string;
  dueDate: string;
  completionDate: string | null;
  completionNotes: string | null;
  customerName: string | null;
  customerAccount: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  customerCity: string | null;
  employeeName: string | null;
}

export default function WorkOrders() {
  const { data: session } = useSession();

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const [activeTab, setActiveTab] = useState('assigned');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPriority, setFilterPriority] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedOrderForCompletion, setSelectedOrderForCompletion] = useState<WorkOrder | null>(null);

  // Fetch work orders from API
  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/work-orders');
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch work orders');
      }

      setWorkOrders(result.data || []);
    } catch (err: any) {
      console.error('Error fetching work orders:', err);
      setError(err.message || 'Failed to load work orders');
    } finally {
      setLoading(false);
    }
  };

  // Update work order status
  const updateWorkOrderStatus = async (id: number, newStatus: string, notes: string = '') => {
    try {
      setUpdating(true);
      const response = await fetch('/api/work-orders', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          status: newStatus,
          completionNotes: notes,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update work order');
      }

      // Refresh work orders
      await fetchWorkOrders();
      return true;
    } catch (err: any) {
      console.error('Error updating work order:', err);
      alert(err.message || 'Failed to update work order');
      return false;
    } finally {
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned': return <AlertCircle className="w-5 h-5" />;
      case 'in_progress': return <Play className="w-5 h-5" />;
      case 'completed': return <CheckCircle className="w-5 h-5" />;
      case 'cancelled': return <XCircle className="w-5 h-5" />;
      default: return <Clock className="w-5 h-5" />;
    }
  };

  const formatWorkType = (workType: string) => {
    return workType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const filteredOrders = workOrders.filter(order => {
    const matchesTab = activeTab === 'all' || order.status === activeTab;
    const matchesSearch =
      order.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerAddress?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerAccount?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = filterPriority === 'all' || order.priority === filterPriority;

    return matchesTab && matchesSearch && matchesPriority;
  });

  const handleStartWork = async (orderId: number) => {
    if (updating) return;
    const success = await updateWorkOrderStatus(orderId, 'in_progress');
    if (success && showDetails) {
      setShowDetails(false);
    }
  };

  const handleCompleteWork = (order: WorkOrder) => {
    setSelectedOrderForCompletion(order);
    setCompletionNotes('');
    setShowCompletionModal(true);
  };

  const handleConfirmCompletion = async () => {
    if (!selectedOrderForCompletion) return;

    if (!completionNotes.trim()) {
      alert('Please enter completion notes');
      return;
    }

    const success = await updateWorkOrderStatus(
      selectedOrderForCompletion.id,
      'completed',
      completionNotes
    );

    if (success) {
      setShowCompletionModal(false);
      setSelectedOrderForCompletion(null);
      setCompletionNotes('');
      if (showDetails) {
        setShowDetails(false);
      }
    }
  };

  const stats = {
    assigned: workOrders.filter(o => o.status === 'assigned').length,
    inProgress: workOrders.filter(o => o.status === 'in_progress').length,
    completed: workOrders.filter(o => o.status === 'completed').length,
    total: workOrders.length,
  };

  return (
    <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Work Orders</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your assigned tasks and field work</p>
            </div>
            <button
              onClick={fetchWorkOrders}
              disabled={loading}
              className="mt-4 sm:mt-0 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center space-x-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Refresh Orders</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400">Total</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Orders</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-yellow-600 dark:text-yellow-400">Pending</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.assigned}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Assigned</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Play className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-purple-600 dark:text-purple-400">Active</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">In Progress</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs text-green-600 dark:text-green-400">Done</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-1 border border-gray-200 dark:border-white/10">
          <div className="flex flex-wrap gap-1">
            {['assigned', 'in_progress', 'completed', 'all'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg font-medium transition-all capitalize ${
                  activeTab === tab
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by title, customer, account number, or address..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors"
              />
            </div>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-green-400 font-medium"
            >
              <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">All Priorities</option>
              <option value="urgent" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Urgent Priority</option>
              <option value="high" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">High Priority</option>
              <option value="medium" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Medium Priority</option>
              <option value="low" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Low Priority</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-400 font-semibold">Error Loading Work Orders</h3>
              <p className="text-red-300 text-sm mt-1">{error}</p>
              <button
                onClick={fetchWorkOrders}
                className="mt-3 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-gray-200 dark:border-white/10 text-center">
            <Loader2 className="w-16 h-16 text-green-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Loading Work Orders</h3>
            <p className="text-gray-600 dark:text-gray-400">Please wait while we fetch your assigned tasks...</p>
          </div>
        )}

        {/* Work Orders List */}
        {!loading && !error && (
          <div className="space-y-4">
            {filteredOrders.length === 0 ? (
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-12 border border-gray-200 dark:border-white/10 text-center">
                <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No work orders found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery || filterPriority !== 'all'
                    ? 'Try adjusting your filters or search criteria'
                    : 'You have no work orders assigned at the moment'}
                </p>
              </div>
            ) : (
              filteredOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-6 border border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Left Section */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)} flex items-center space-x-1`}>
                          {getStatusIcon(order.status)}
                          <span className="capitalize">{order.status.replace('_', ' ')}</span>
                        </span>
                        <span className={`text-sm font-semibold ${getPriorityColor(order.priority)}`}>
                          {order.priority.toUpperCase()} PRIORITY
                        </span>
                        {order.customerAccount && (
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {order.customerAccount}
                          </span>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        {order.title}
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        {order.customerName && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4" />
                            <span>{order.customerName}</span>
                          </div>
                        )}
                        {order.customerPhone && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4" />
                            <span>{order.customerPhone}</span>
                          </div>
                        )}
                        {order.customerAddress && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4" />
                            <span>{order.customerAddress}</span>
                          </div>
                        )}
                        {order.customerCity && (
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <Navigation className="w-4 h-4" />
                            <span>{order.customerCity}</span>
                          </div>
                        )}
                      </div>

                      {order.description && (
                        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                          {order.description}
                        </p>
                      )}

                      <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400">
                        <span className="flex items-center space-x-1">
                          <Zap className="w-3 h-3" />
                          <span>{formatWorkType(order.workType)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Assigned: {formatDate(order.assignedDate)}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Due: {formatDate(order.dueDate)}</span>
                        </span>
                        {order.completionDate && (
                          <span className="flex items-center space-x-1 text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            <span>Completed: {formatDate(order.completionDate)}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right Section - Actions */}
                    <div className="flex flex-row lg:flex-col gap-2">
                      {order.status === 'assigned' && (
                        <button
                          onClick={() => handleStartWork(order.id)}
                          disabled={updating}
                          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center space-x-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                          <span>Start Work</span>
                        </button>
                      )}
                      {order.status === 'in_progress' && order.workType === 'meter_reading' && (
                        <button
                          onClick={() => {
                            // Redirect to meter reading page with customer info
                            const params = new URLSearchParams({
                              customerId: (order as any).customerId?.toString() || '',
                              customerName: order.customerName || '',
                              accountNumber: order.customerAccount || '',
                              workOrderId: order.id.toString()
                            });
                            window.location.href = `/employee/meter-reading?${params.toString()}`;
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center space-x-2 text-sm font-medium"
                        >
                          <Gauge className="w-4 h-4" />
                          <span>Take Reading</span>
                        </button>
                      )}
                      {order.status === 'in_progress' && (
                        <button
                          onClick={() => handleCompleteWork(order)}
                          disabled={updating}
                          className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center space-x-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {updating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          <span>Complete</span>
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setShowDetails(true);
                        }}
                        className="px-4 py-2 bg-white/10 border border-white/20 text-gray-900 dark:text-white rounded-lg hover:bg-white/20 transition-all flex items-center space-x-2 text-sm font-medium"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Details</span>
                      </button>
                    </div>
                  </div>

                  {order.completionNotes && (
                    <div className="mt-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Completion Notes:</p>
                      <p className="text-sm text-gray-900 dark:text-white">{order.completionNotes}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && selectedOrderForCompletion && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-lg w-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Complete Work Order</h2>
              <button
                onClick={() => {
                  setShowCompletionModal(false);
                  setSelectedOrderForCompletion(null);
                  setCompletionNotes('');
                }}
                disabled={updating}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{selectedOrderForCompletion.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{formatWorkType(selectedOrderForCompletion.workType)}</p>
                {selectedOrderForCompletion.customerName && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Customer: {selectedOrderForCompletion.customerName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Completion Notes <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Enter details about the work completed, observations, meter readings, etc..."
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors resize-none"
                />
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Please provide detailed notes about the work completed</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowCompletionModal(false);
                    setSelectedOrderForCompletion(null);
                    setCompletionNotes('');
                  }}
                  disabled={updating}
                  className="flex-1 px-6 py-3 bg-white/10 border border-white/20 text-gray-900 dark:text-white rounded-lg hover:bg-white/20 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmCompletion}
                  disabled={updating || !completionNotes.trim()}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {updating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Completing...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      <span>Mark Complete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Work Order Details</h2>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Order Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedOrder.customerAccount || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Work Type</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatWorkType(selectedOrder.workType)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Priority</p>
                    <p className={`font-semibold ${getPriorityColor(selectedOrder.priority)}`}>
                      {selectedOrder.priority.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatDate(selectedOrder.assignedDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{formatDate(selectedOrder.dueDate)}</p>
                  </div>
                  {selectedOrder.completionDate && (
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Completion Date</p>
                      <p className="font-semibold text-green-400">{formatDate(selectedOrder.completionDate)}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedOrder.customerName && (
                <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Customer Information</h3>
                  <div className="space-y-2">
                    <p className="text-gray-900 dark:text-white">{selectedOrder.customerName}</p>
                    {selectedOrder.customerPhone && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.customerPhone}</p>
                    )}
                    {selectedOrder.customerAddress && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.customerAddress}</p>
                    )}
                    {selectedOrder.customerCity && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedOrder.customerCity}</p>
                    )}
                  </div>
                </div>
              )}

              {selectedOrder.description && (
                <div className="bg-white dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Description</h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedOrder.description}</p>
                </div>
              )}

              {selectedOrder.completionNotes && (
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <h3 className="font-semibold text-green-400 mb-3">Completion Notes</h3>
                  <p className="text-gray-700 dark:text-gray-300">{selectedOrder.completionNotes}</p>
                </div>
              )}

              <div className="flex gap-3">
                {selectedOrder.status === 'assigned' && (
                  <button
                    onClick={() => handleStartWork(selectedOrder.id)}
                    disabled={updating}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5" />
                        <span>Start This Work Order</span>
                      </>
                    )}
                  </button>
                )}
                {selectedOrder.status === 'in_progress' && (
                  <button
                    onClick={() => {
                      setShowDetails(false);
                      handleCompleteWork(selectedOrder);
                    }}
                    disabled={updating}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Complete This Work Order</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

