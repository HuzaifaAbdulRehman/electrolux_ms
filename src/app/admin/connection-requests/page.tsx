'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  Zap,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  FileText,
  Loader2,
  AlertCircle,
  Home,
  RefreshCw
} from 'lucide-react';
import { formatPKPhone, formatCNIC } from '@/lib/utils/dataHandlers';

export default function AdminConnectionRequests() {
  const { data: session } = useSession();
  const toast = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [accountCredentials, setAccountCredentials] = useState<any>(null);

  const [approvalData, setApprovalData] = useState({
    employeeId: '',
    estimatedCharges: '',
    zone: 'Zone A'
  });
  const [employeeSearch, setEmployeeSearch] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  // Refresh on window focus (when user returns to tab) - better UX than auto-refresh
  useEffect(() => {
    const onFocus = () => fetchRequests();
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Ensure employees are present: if API returned empty, fetch directly from employees API as fallback
  useEffect(() => {
    const ensureEmployees = async () => {
      if (employees.length === 0) {
        try {
          const resp = await fetch('/api/employees');
          const json = await resp.json();
          if (resp.ok && json?.success && Array.isArray(json.data) && json.data.length > 0) {
            setEmployees(json.data);
          }
        } catch (error) {
          console.error('[Connection Requests] Fallback employee fetch failed:', error);
        }
      }
    };
    ensureEmployees();
  }, [employees.length]);

  // Reset approval state when opening modal for a specific request
  useEffect(() => {
    if (showApproveModal && selectedRequest) {
      const zoneToUse = selectedRequest.zone || 'Zone A';
      console.log('🔍 Auto-filling approve modal:', {
        customerSelectedZone: selectedRequest.zone,
        zoneFilled: zoneToUse,
        applicantName: selectedRequest.applicantName
      });

      setApprovalData({
        employeeId: '',
        estimatedCharges: selectedRequest.estimatedCharges ? String(selectedRequest.estimatedCharges) : '',
        zone: zoneToUse
      });
      setEmployeeSearch('');
    }
  }, [showApproveModal, selectedRequest]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);

      const response = await fetch(`/api/admin/connection-requests?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch requests');
      }

      setRequests(result.data.requests || []);
      setEmployees(result.data.availableEmployees || []);
    } catch (err: any) {
      console.error('Error fetching requests:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    // Charges required for approval to avoid accidental empty approvals
    if (!approvalData.estimatedCharges || Number(approvalData.estimatedCharges) <= 0) {
      toast.error('Please enter Estimated Charges (Rs) before approval');
      return;
    }
    if (!approvalData.employeeId) {
      toast.error('Please select an employee');
      return;
    }
    if (!approvalData.zone) {
      toast.error('Please select a zone');
      return;
    }

    console.log('✅ Approving application:', {
      requestId: selectedRequest.id,
      applicantName: selectedRequest.applicantName,
      zone: approvalData.zone,
      employeeId: approvalData.employeeId
    });

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/connection-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: selectedRequest.id,
          action: 'approve',
          employeeId: parseInt(approvalData.employeeId, 10),
          estimatedCharges: approvalData.estimatedCharges,
          zone: approvalData.zone
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve request');
      }

      toast.success('Application approved successfully!');
      setShowApproveModal(false);
      setSelectedRequest(null);
      fetchRequests();
    } catch (err: any) {
      console.error('Error approving request:', err);
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (requestId: number) => {
    if (!confirm('Are you sure you want to reject this application?')) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/connection-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action: 'reject',
          notes: 'Application does not meet requirements'
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject request');
      }

      toast.success('Application rejected');
      fetchRequests();
    } catch (err: any) {
      console.error('Error rejecting request:', err);
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateAccount = async (requestId: number) => {
    // Get the request to use its zone (customer already filled this)
    const request = requests.find(r => r.id === requestId);

    console.log('[Create Account] Full request data:', {
      id: request?.id,
      applicantName: request?.applicantName,
      zone: request?.zone,
      applicationNumber: request?.applicationNumber,
      status: request?.status
    });

    const zoneToUse = request?.zone;

    if (!zoneToUse || zoneToUse.trim() === '') {
      toast.error(`Zone is missing for ${request?.applicantName}'s application (${request?.applicationNumber}). Customer must have skipped the zone field. Please contact customer to resubmit.`);
      console.error('[Create Account] Missing or empty zone:', {
        requestId,
        applicantName: request?.applicantName,
        zone: request?.zone,
        zoneType: typeof request?.zone
      });
      return;
    }

    console.log('[Create Account] ✅ Creating account with zone:', zoneToUse, 'for', request?.applicantName);

    if (!confirm(`Create customer account for ${request?.applicantName}?\n\nZone: ${zoneToUse}\n\nA meter number will be auto-generated and login credentials will be created.`)) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/admin/connection-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
          requestId,
          action: 'create_customer',
          zone: zoneToUse
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create account');
      }

      // Show credentials modal
      setAccountCredentials(result.data);
      setShowAccountModal(true);

      toast.success('Customer account created successfully!');
      fetchRequests();
    } catch (err: any) {
      console.error('Error creating account:', err);
      toast.error(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.applicantName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.applicationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.email?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-600 border-yellow-500/50';
      case 'approved': return 'bg-green-500/20 text-green-600 border-green-500/50';
      case 'rejected': return 'bg-red-500/20 text-red-600 border-red-500/50';
      case 'connected': return 'bg-purple-500/20 text-purple-600 border-purple-500/50';
      default: return 'bg-gray-500/20 text-gray-600 border-gray-500/50';
    }
  };

  return (
    <DashboardLayout userType="admin" userName={session?.user?.name || 'Admin'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Connection Requests
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Review and approve new connection applications
              </p>
            </div>
            <button
              onClick={fetchRequests}
              className="mt-4 sm:mt-0 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all flex items-center space-x-2"
            >
              <RefreshCw className="w-5 h-5" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'All', status: 'all', count: requests.length, color: 'text-gray-600' },
            { label: 'Pending', status: 'pending', count: requests.filter(r => r.status === 'pending').length, color: 'text-yellow-600' },
            { label: 'Approved', status: 'approved', count: requests.filter(r => r.status === 'approved').length, color: 'text-green-600' },
            { label: 'Rejected', status: 'rejected', count: requests.filter(r => r.status === 'rejected').length, color: 'text-red-600' }
          ].map((stat) => (
            <button
              key={stat.status}
              onClick={() => setFilterStatus(stat.status)}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 border transition-all ${
                filterStatus === stat.status
                  ? 'border-yellow-400 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.count}</p>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, application number, or email..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Requests List */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-yellow-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading requests...</p>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-12 border border-gray-200 dark:border-gray-700 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No Requests Found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchQuery ? 'No requests match your search' : `No ${filterStatus === 'all' ? '' : filterStatus} requests`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {request.applicantName}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {request.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Application #{request.applicationNumber}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{request.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">{formatPKPhone(request.phone)}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <Home className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {request.propertyType} - {request.connectionType}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 mb-4">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {request.city}, {request.state}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Applied: {new Date(request.applicationDate).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowDetailsModal(true);
                      }}
                      className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      View Details
                    </button>

                    {request.status === 'pending' && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowApproveModal(true);
                          }}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 flex items-center space-x-2"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all disabled:opacity-50 flex items-center space-x-2"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {request.status === 'approved' && (
                      request.completedCount && request.completedCount > 0 ? (
                        <button
                          onClick={() => handleCreateAccount(request.id)}
                          disabled={isProcessing}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center space-x-2"
                        >
                          <User className="w-4 h-4" />
                          <span>Create Customer Account</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled
                          title="Waiting for employee to complete installation"
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg cursor-not-allowed flex items-center space-x-2"
                        >
                          <Clock className="w-4 h-4" />
                          <span>Waiting for work completion</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Details Modal */}
        {showDetailsModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  Application Details
                </h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Applicant Name</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedRequest.applicantName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Application Number</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedRequest.applicationNumber}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-white">{selectedRequest.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <p className="text-gray-900 dark:text-white">{formatPKPhone(selectedRequest.phone)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Property Address</p>
                  <p className="text-gray-900 dark:text-white">{selectedRequest.propertyAddress}</p>
                  <p className="text-gray-900 dark:text-white">{selectedRequest.city}, {selectedRequest.state} - {selectedRequest.pincode}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Property Type</p>
                    <p className="text-gray-900 dark:text-white">{selectedRequest.propertyType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Connection Type</p>
                    <p className="text-gray-900 dark:text-white">{selectedRequest.connectionType}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Load Required</p>
                  <p className="text-gray-900 dark:text-white">
                    {selectedRequest.loadRequired ? `${selectedRequest.loadRequired} kW` : 'TBD (during inspection)'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedRequest.status)}`}>
                    {selectedRequest.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Approve Modal */}
        {showApproveModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Approve Application
              </h2>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign Employee <span className="text-red-500">*</span>
                  </label>
                  <div className="mb-2">
                    <input
                      type="text"
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      placeholder="Search employees by name, email or department..."
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-700">
                    {employees
                      .filter((emp) => {
                        const q = employeeSearch.toLowerCase();
                        return (
                          (emp.fullName || emp.employeeName || '').toLowerCase().includes(q) ||
                          (emp.email || '').toLowerCase().includes(q) ||
                          (emp.department || '').toLowerCase().includes(q)
                        );
                      })
                      .map((emp) => (
                        <button
                          key={emp.id}
                          type="button"
                          onClick={() => setApprovalData({ ...approvalData, employeeId: String(emp.id) })}
                          className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-600/50 ${approvalData.employeeId === String(emp.id) ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                        >
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">{emp.fullName || emp.employeeName}</p>
                            <p className="text-xs text-gray-500">{emp.department} • {emp.email}</p>
                          </div>
                          {Number(emp.workLoad || 0) > 0 && (
                            <span className={`text-xs px-2 py-1 rounded ${Number(emp.workLoad || 0) > 3 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'}`}>
                              Load: {emp.workLoad}
                            </span>
                          )}
                        </button>
                      ))}
                    {employees.length === 0 && (
                      <div className="px-4 py-6 text-center text-sm text-gray-500">No employees found</div>
                    )}
                  </div>
                  {approvalData.employeeId === '' && (
                    <p className="mt-2 text-xs text-gray-500">Select an employee to approve and assign.</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zone <span className="text-green-600 dark:text-green-400">✓</span>
                  </label>
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white">
                    {approvalData.zone || 'Zone not specified by customer'}
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    ✓ Auto-detected from customer's application
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Estimated Charges (Rs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={approvalData.estimatedCharges}
                    onChange={(e) => setApprovalData({ ...approvalData, estimatedCharges: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 15000"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /><span>Processing...</span></>
                  ) : (
                    <><CheckCircle className="w-5 h-5" /><span>Approve & Assign</span></>
                  )}
                </button>
                <button
                  onClick={() => setShowApproveModal(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Account Credentials Modal */}
        {showAccountModal && accountCredentials && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full">
              <div className="text-center mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Customer Account Created!
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Please provide these credentials to the customer
                </p>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Customer Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{accountCredentials.name}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email (Username)</p>
                  <p className="font-mono text-gray-900 dark:text-white">{accountCredentials.email}</p>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-1">Temporary Password</p>
                  <p className="font-mono text-xl font-bold text-yellow-900 dark:text-yellow-100">{accountCredentials.temporaryPassword}</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">Customer should change this on first login</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Account Number</p>
                  <p className="font-mono text-gray-900 dark:text-white">{accountCredentials.accountNumber}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Meter Number</p>
                  <p className="font-mono text-gray-900 dark:text-white">{accountCredentials.meterNumber}</p>
                </div>
              </div>

              <div className="mt-6 flex items-center space-x-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`Email: ${accountCredentials.email}\nPassword: ${accountCredentials.temporaryPassword}\nAccount: ${accountCredentials.accountNumber}\nMeter: ${accountCredentials.meterNumber}`);
                    toast.success('Credentials copied to clipboard!');
                  }}
                  className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all"
                >
                  Copy All Details
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(accountCredentials.temporaryPassword);
                    toast.success('Password copied');
                  }}
                  className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Copy Password
                </button>
                <button
                  onClick={() => {
                    setShowAccountModal(false);
                    setAccountCredentials(null);
                  }}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

