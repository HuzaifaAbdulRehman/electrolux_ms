'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  MessageSquare,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Zap,
  DollarSign,
  Wrench,
  AlertTriangle,
  Plug,
  FileText,
  Loader2,
  Save,
  X,
  User,
  Calendar,
  RefreshCw
} from 'lucide-react';

export default function AdminComplaints() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('medium');

  useEffect(() => {
    fetchComplaints();
    fetchEmployees();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/complaints');
      const result = await response.json();
      
      if (result.success) {
        setComplaints(result.data);
      } else {
        setError(result.error || 'Failed to fetch complaints');
      }
    } catch (err) {
      setError('Network error while fetching complaints');
      console.error('Error fetching complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/employees');
      const result = await response.json();
      if (result.success) {
        setEmployees(result.data);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleStatusUpdate = async (complaintId: number, status: string) => {
    try {
      const response = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      
      if (response.ok) {
        await fetchComplaints();
        setSelectedComplaint(null);
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to update complaint');
      }
    } catch (err) {
      setError('Network error while updating complaint');
      console.error('Error updating complaint:', err);
    }
  };

  const handleAssignComplaint = async () => {
    if (!selectedComplaint || !selectedEmployee) return;

    try {
      setError(null);
      const response = await fetch(`/api/complaints/${selectedComplaint.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'assigned',
          employeeId: parseInt(selectedEmployee, 10),
          priority: selectedPriority  // Admin-set priority!
        })
      });
      
      if (response.ok) {
        await fetchComplaints();
        setShowAssignModal(false);
        setSelectedComplaint(null);
        setSelectedEmployee('');
      } else {
        const error = await response.json();
        console.error('Assignment error:', error);
        setError(error.error || error.details || 'Failed to assign complaint');
      }
    } catch (err) {
      setError('Network error while assigning complaint');
      console.error('Error assigning complaint:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'under_review': return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'assigned': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      case 'in_progress': return <Zap className="w-4 h-4 text-purple-500" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'closed': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'submitted': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'under_review': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'assigned': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'in_progress': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'resolved': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/50';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'power_outage': return <Zap className="w-5 h-5 text-red-500" />;
      case 'billing': return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'service': return <Wrench className="w-5 h-5 text-blue-500" />;
      case 'meter_issue': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'connection': return <Plug className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getCategoryName = (category: string) => {
    switch (category) {
      case 'power_outage': return 'Power Outage';
      case 'billing': return 'Billing Issue';
      case 'service': return 'Service Request';
      case 'meter_issue': return 'Meter Issue';
      case 'connection': return 'Connection Issue';
      default: return 'Other';
    }
  };

  return (
    <DashboardLayout userType="admin" userName="Admin User">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Complaint Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Review and manage customer complaints</p>
            </div>
            <button
              onClick={() => {
                fetchComplaints();
                fetchEmployees();
              }}
              disabled={loading}
              className="mt-4 sm:mt-0 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center space-x-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Refreshing...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { 
              label: 'Total Complaints', 
              value: complaints.length.toString(), 
              icon: MessageSquare, 
              color: 'from-blue-500 to-cyan-500' 
            },
            { 
              label: 'Pending Review', 
              value: complaints.filter(c => c.status === 'submitted').length.toString(), 
              icon: Clock, 
              color: 'from-yellow-500 to-orange-500' 
            },
            { 
              label: 'In Progress', 
              value: complaints.filter(c => ['assigned', 'in_progress'].includes(c.status)).length.toString(), 
              icon: Zap, 
              color: 'from-purple-500 to-pink-500' 
            },
            { 
              label: 'Resolved', 
              value: complaints.filter(c => ['resolved', 'closed'].includes(c.status)).length.toString(), 
              icon: CheckCircle, 
              color: 'from-green-500 to-emerald-500' 
            }
          ].map((stat, index) => (
            <div key={index} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Complaints List */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading complaints...</span>
            </div>
          ) : complaints.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <MessageSquare className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Complaints</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center">
                No complaints have been submitted yet
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              {complaints.map((complaint) => (
                <div key={complaint.id} className="p-6 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getCategoryIcon(complaint.category)}
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {complaint.title}
                        </h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(complaint.status)}`}>
                          {getStatusIcon(complaint.status)}
                          <span className="ml-1 capitalize">{complaint.status.replace('_', ' ')}</span>
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(complaint.priority)}`}>
                          {complaint.priority}
                        </span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">{complaint.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                        <span>Category: {getCategoryName(complaint.category)}</span>
                        <span>Submitted: {new Date(complaint.submittedAt).toLocaleDateString()}</span>
                        {complaint.employeeId && (
                          <span className="flex items-center text-blue-600 dark:text-blue-400">
                            <User className="w-3 h-3 mr-1" />
                            Assigned to Employee ID: {complaint.employeeId}
                          </span>
                        )}
                        {complaint.resolvedAt && (
                          <span>Resolved: {new Date(complaint.resolvedAt).toLocaleDateString()}</span>
                        )}
                      </div>
                      {complaint.resolutionNotes && (
                        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                          <p className="text-sm text-green-800 dark:text-green-200">
                            <strong>Resolution:</strong> {complaint.resolutionNotes}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      {/* Admin can only assign unassigned complaints */}
                      {(complaint.status === 'submitted' || complaint.status === 'under_review') && (
                        <button
                          onClick={() => {
                            setSelectedComplaint(complaint);
                            setSelectedPriority(complaint.priority || 'medium'); // Set current priority
                            setShowAssignModal(true);
                          }}
                          className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                        >
                          Assign to Employee
                        </button>
                      )}

                      {/* Show assigned employee info for assigned complaints */}
                      {complaint.status === 'assigned' && (
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-600 dark:text-orange-400 rounded-lg text-sm border border-orange-500/50">
                          Assigned - Waiting for employee to start
                        </span>
                      )}

                      {complaint.status === 'in_progress' && (
                        <span className="px-3 py-1 bg-purple-500/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm border border-purple-500/50">
                          Employee working on it
                        </span>
                      )}

                      {/* Admin can close resolved complaints */}
                      {complaint.status === 'resolved' && (
                        <button
                          onClick={() => handleStatusUpdate(complaint.id, 'closed')}
                          className="px-3 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                        >
                          Close Complaint
                        </button>
                      )}

                      {complaint.status === 'closed' && (
                        <span className="px-3 py-1 bg-gray-500/20 text-gray-600 dark:text-gray-400 rounded-lg text-sm border border-gray-500/50">
                          Closed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assign Complaint Modal */}
        {showAssignModal && selectedComplaint && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Assign Complaint</h2>
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedComplaint(null);
                    setSelectedEmployee('');
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedComplaint.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    {selectedComplaint.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Set Priority
                  </label>
                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
                  >
                    <option value="low" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🟢 Low - General queries, non-urgent</option>
                    <option value="medium" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🟡 Medium - Standard issues</option>
                    <option value="high" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🟠 High - Important, needs attention</option>
                    <option value="urgent" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">🔴 Urgent - Emergency, critical</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Admin sets priority based on issue severity
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assign to Employee
                  </label>
                  <select
                    value={selectedEmployee}
                    onChange={(e) => setSelectedEmployee(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Select Employee</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                        {employee.employeeName} ({employee.email.split('@')[0]}) - {employee.department} - {employee.designation} - Work Orders: {employee.workOrdersCount || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAssignModal(false);
                      setSelectedComplaint(null);
                      setSelectedEmployee('');
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignComplaint}
                    disabled={!selectedEmployee}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <User className="w-4 h-4" />
                    <span>Assign Complaint</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

