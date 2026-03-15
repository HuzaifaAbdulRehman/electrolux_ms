'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  MessageSquare,
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Loader2,
  AlertTriangle,
  Zap,
  DollarSign,
  Wrench,
  Plug,
  FileText
} from 'lucide-react';
import { Complaint, ComplaintForm, ApiResponse } from '@/types';

export default function CustomerComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [newComplaint, setNewComplaint] = useState<ComplaintForm>({
    category: 'power_outage',
    title: '',
    description: ''
  });

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/complaints');

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        setError(errorData.error || `Server error: ${response.status}`);
        setLoading(false);
        return;
      }

      const result: ApiResponse<Complaint[]> = await response.json();

      if (result.success && result.data) {
        setComplaints(result.data);
      } else {
        console.error('Fetch failed:', result);
        setError(result.error || 'Failed to fetch complaints');
      }
    } catch (err) {
      console.error('Error fetching complaints:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear any previous errors
    setModalError(null);
    setError(null);

    try {
      setSaving(true);

      console.log('🔄 Submitting complaint...', newComplaint);

      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComplaint)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Complaint submitted successfully');

        // Show success message
        setSuccessMessage('Complaint submitted successfully!');

        // Refresh complaints list
        await fetchComplaints();

        // Close modal after short delay (so user sees success)
        setTimeout(() => {
          setShowAddModal(false);
          setNewComplaint({
            category: 'power_outage',
            title: '',
            description: ''
          });
          setSuccessMessage(null);
        }, 1500);

      } else {
        console.error('❌ Complaint submission failed:', result);
        // Show error inside modal
        setModalError(result.error || result.details || 'Failed to submit complaint. Please try again.');
      }
    } catch (err) {
      console.error('❌ Network error while submitting complaint:', err);
      // Show error inside modal
      setModalError('Network error. Please check your connection and try again.');
    } finally {
      setSaving(false);
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
    <DashboardLayout userType="customer" userName="Customer">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Complaints</h1>
              <p className="text-gray-600 dark:text-gray-400">Submit and track your service complaints</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Submit Complaint</span>
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
              label: 'In Progress', 
              value: complaints.filter(c => ['assigned', 'in_progress'].includes(c.status)).length.toString(), 
              icon: Clock, 
              color: 'from-yellow-500 to-orange-500' 
            },
            { 
              label: 'Resolved', 
              value: complaints.filter(c => c.status === 'resolved').length.toString(), 
              icon: CheckCircle, 
              color: 'from-green-500 to-emerald-500' 
            },
            { 
              label: 'Closed', 
              value: complaints.filter(c => c.status === 'closed').length.toString(), 
              icon: XCircle, 
              color: 'from-gray-500 to-slate-500' 
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
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Complaints Yet</h3>
              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Submit your first complaint to get started
              </p>
            <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Submit Complaint</span>
            </button>
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
                        <span>Submitted: {new Date(complaint.createdAt).toLocaleDateString()}</span>
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
                  </div>
                </div>
              ))}
            </div>
          )}
          </div>

        {/* Add Complaint Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Submit New Complaint</h2>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setModalError(null);
                    setSuccessMessage(null);
                  }}
                  disabled={saving}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Error Message Inside Modal */}
              {modalError && (
                <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700 dark:text-red-300">{modalError}</p>
                  </div>
                </div>
              )}

              {/* Success Message Inside Modal */}
              {successMessage && (
                <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-sm text-green-700 dark:text-green-300">{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    required
                    value={newComplaint.category}
                    onChange={(e) => setNewComplaint({...newComplaint, category: e.target.value as 'power_outage' | 'billing' | 'meter_issue' | 'service' | 'connection' | 'other'})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
                  >
                    <option value="power_outage" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Power Outage</option>
                    <option value="meter_issue" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Meter Issue</option>
                    <option value="billing" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Billing Issue</option>
                    <option value="service" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Service Request</option>
                    <option value="connection" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Connection Issue</option>
                    <option value="other" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Other</option>
                  </select>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Your complaint will be reviewed and prioritized by our admin team
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title</label>
                  <input
                    type="text"
                    required
                    value={newComplaint.title}
                    onChange={(e) => setNewComplaint({...newComplaint, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brief description of your complaint"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    required
                    value={newComplaint.description}
                    onChange={(e) => setNewComplaint({...newComplaint, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Please provide detailed information about your complaint..."
                  />
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setModalError(null);
                      setSuccessMessage(null);
                    }}
                    disabled={saving}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving || !!successMessage}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : successMessage ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        <span>Submitted!</span>
                      </>
                    ) : (
                      <>
                        <MessageSquare className="w-4 h-4" />
                        <span>Submit Complaint</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

