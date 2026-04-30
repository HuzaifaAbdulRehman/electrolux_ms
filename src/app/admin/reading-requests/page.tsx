'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  ClipboardList,
  User,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  UserCheck,
  Loader2,
  Search,
  Filter,
  X,
  FileText
} from 'lucide-react';
import { formatPKPhone } from '@/lib/utils/dataHandlers';

interface ReadingRequest {
  id: number;
  requestNumber: string;
  customerId: number;
  requestDate: string;
  preferredDate: string | null;
  requestReason: string | null;
  priority: 'normal' | 'urgent';
  status: 'pending' | 'assigned' | 'completed' | 'cancelled';
  notes: string | null;
  workOrderId: number | null;
  assignedDate: string | null;
  completedDate: string | null;
  customerName: string;
  customerAccount: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  customerCity: string;
  meterNumber: string;
  employeeName: string | null;
  employeeNumber: string | null;
}

interface Employee {
  id: number;
  employeeName: string;
  employeeNumber: string;
  email?: string;
  department?: string;
  designation?: string;
}

export default function ReadingRequestsPage() {
  const { data: session } = useSession();
  const [requests, setRequests] = useState<ReadingRequest[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ReadingRequest | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user.userType === 'admin') {
      fetchRequests();
      fetchEmployees();
    }
  }, [session]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reading-requests');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setRequests(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching reading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setEmployees(result.data);
        }
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedRequest || !selectedEmployee) return;

    try {
      setAssigning(true);
      setError(null);

      console.log('[Admin] Assigning request:', {
        requestId: selectedRequest.id,
        employeeId: selectedEmployee,
      });

      const response = await fetch('/api/reading-requests/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          employeeId: parseInt(selectedEmployee),
          // Don't send priority - let API map from reading request
        }),
      });

      const result = await response.json();
      console.log('[Admin] Assign response:', result);

      if (response.ok && result.success) {
        setSuccess(result.message || 'Request assigned successfully!');
        setShowAssignModal(false);
        setSelectedRequest(null);
        setSelectedEmployee('');
        fetchRequests(); // Refresh to get updated data

        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to assign request');
        console.error('[Admin] Assignment failed:', result.error);
      }
    } catch (error) {
      console.error('[Admin] Error assigning request:', error);
      setError('Network error. Please try again.');
    } finally {
      setAssigning(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch =
      request.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.customerAccount.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.requestNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || request.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    assigned: requests.filter(r => r.status === 'assigned').length,
    completed: requests.filter(r => r.status === 'completed').length,
  };

  if (session?.user.userType !== 'admin') {
    return (
      <DashboardLayout userType="admin">
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Access Denied</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">Only admins can access this page.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="admin">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <ClipboardList className="w-8 h-8 text-red-500" />
              <span>Meter Reading Requests</span>
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage customer meter reading requests and assign to employees
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700 dark:text-green-300 font-medium">{success}</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700 dark:text-red-300 font-medium">{error}</span>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Pending</p>
                  <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Assigned</p>
                  <p className="text-2xl font-bold text-blue-500">{stats.assigned}</p>
                </div>
                <UserCheck className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                  <p className="text-2xl font-bold text-green-500">{stats.completed}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by customer, account, or request number..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Status Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-white"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              {/* Priority Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-white"
                >
                  <option value="all">All Priority</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                <span className="ml-3 text-gray-600 dark:text-gray-400">Loading requests...</span>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 font-medium">No reading requests found</p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Requests will appear here when customers submit them'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-white/10">
                {filteredRequests.map((request) => (
                  <div
                    key={request.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <span className="font-mono text-sm text-red-500 font-semibold">
                            {request.requestNumber}
                          </span>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              request.status === 'pending'
                                ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400'
                                : request.status === 'assigned'
                                ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                                : request.status === 'completed'
                                ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                                : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {request.status.toUpperCase()}
                          </span>
                          {request.priority === 'urgent' && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-600 dark:text-red-400">
                              URGENT
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                          {request.customerName}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <User className="w-4 h-4 mr-2" />
                            Account: {request.customerAccount}
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Phone className="w-4 h-4 mr-2" />
                            {formatPKPhone(request.customerPhone)}
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <MapPin className="w-4 h-4 mr-2" />
                            {request.customerCity}
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Calendar className="w-4 h-4 mr-2" />
                            {new Date(request.requestDate).toLocaleDateString()}
                          </div>
                        </div>
                        {request.employeeName && (
                          <div className="mt-2 flex items-center text-sm text-blue-600 dark:text-blue-400">
                            <UserCheck className="w-4 h-4 mr-2" />
                            Assigned to: {request.employeeName}
                          </div>
                        )}
                      </div>
                      {request.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedRequest(request);
                            setShowAssignModal(true);
                          }}
                          className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
                        >
                          Assign
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Modal */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-white/10">
            <div className="bg-gradient-to-r from-red-500 to-pink-500 p-5 flex items-center justify-between rounded-t-2xl">
              <h2 className="text-xl font-bold text-white">Assign to Employee</h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedEmployee('');
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedRequest.customerName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedRequest.customerAccount}</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Employee *
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-white"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.employeeName} ({emp.email ? emp.email.split('@')[0] : emp.employeeNumber}) - {emp.department} - {emp.designation}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedEmployee('');
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAssign}
                  disabled={!selectedEmployee || assigning}
                  className={`flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-semibold transition-all ${
                    !selectedEmployee || assigning
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:shadow-lg hover:shadow-red-500/50'
                  }`}
                >
                  {assigning ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Assigning...
                    </span>
                  ) : (
                    'Assign Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
