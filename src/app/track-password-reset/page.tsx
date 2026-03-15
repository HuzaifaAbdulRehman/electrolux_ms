'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  Zap,
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Key,
  Copy,
  Eye,
  EyeOff,
  LogIn,
  CalendarDays
} from 'lucide-react';

interface PasswordResetRequest {
  id: number;
  requestNumber: string;
  userType: string;
  email: string;
  accountNumber: string | null;
  requestReason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  temporaryPassword: string | null;
  rejectionReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  approvedAt: string | null;
  completedAt: string | null;
}

export default function TrackPasswordResetPage() {
  const [requestNumber, setRequestNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [request, setRequest] = useState<PasswordResetRequest | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRequest(null);

    try {
      const response = await fetch(`/api/password-reset/track?requestNumber=${encodeURIComponent(requestNumber)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Request not found');
      }

      setRequest(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch request status');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, text: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, text: 'Rejected' },
      completed: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: CheckCircle, text: 'Completed' },
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${badge.color} font-semibold`}>
        <Icon className="w-5 h-5" />
        <span>{badge.text}</span>
      </div>
    );
  };

  const isPasswordExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Zap className="w-8 h-8 text-cyan-500" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Electrolux EMS</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Track Password Reset Request</p>
              </div>
            </div>
            <Link
              href="/login"
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-8">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mb-4">
              <Search className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Track Your Password Reset Request</h2>
            <p className="text-gray-600 dark:text-gray-400">Enter your request number to check the status</p>
          </div>

          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={requestNumber}
                onChange={(e) => setRequestNumber(e.target.value.toUpperCase())}
                placeholder="Enter Request Number (e.g., PWR-2025-123456)"
                className="w-full px-4 py-3 pl-12 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                required
              />
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  <span>Track Request</span>
                </>
              )}
            </button>
          </form>

          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}
        </div>

        {/* Request Details */}
        {request && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {/* Status Header */}
            <div className="text-center mb-8 pb-6 border-b border-gray-200 dark:border-white/10">
              <div className="mb-4">
                {getStatusBadge(request.status)}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Request #{request.requestNumber}</h3>
              <p className="text-gray-600 dark:text-gray-400">Submitted on {new Date(request.createdAt).toLocaleDateString()}</p>
            </div>

            {/* Timeline */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Timeline</h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Request Submitted</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(request.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {request.status !== 'pending' && (
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 ${request.status === 'approved' || request.status === 'completed' ? 'bg-green-500' : 'bg-red-500'} rounded-full flex items-center justify-center`}>
                      {request.status === 'approved' || request.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <XCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {request.status === 'rejected' ? 'Request Rejected' : 'Request Approved'}
                      </p>
                      {request.approvedAt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(request.approvedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}

                {request.status === 'completed' && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Password Changed Successfully</p>
                      {request.completedAt && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(request.completedAt).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Temporary Password - Only show if approved and not expired */}
            {request.status === 'approved' && request.temporaryPassword && !isPasswordExpired(request.expiresAt) && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 mb-8 border-2 border-green-500 dark:border-green-400">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <h4 className="text-lg font-bold text-green-900 dark:text-green-100">Your Request Has Been Approved!</h4>
                </div>
                <p className="text-green-800 dark:text-green-200 mb-6">Use the temporary password below to login to your account.</p>

                <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3 flex-1">
                      <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-600 dark:text-gray-400">Temporary Password</p>
                        <div className="flex items-center space-x-2">
                          <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                            {showPassword ? request.temporaryPassword : '••••••••••••'}
                          </p>
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                            title={showPassword ? "Hide Password" : "Show Password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(request.temporaryPassword!)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy Password"
                    >
                      {copied ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {request.expiresAt && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center space-x-2">
                    <CalendarDays className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-300">
                      <strong>Expires on:</strong> {new Date(request.expiresAt).toLocaleString()}
                    </p>
                  </div>
                )}

                <div className="mt-6 flex items-center space-x-3">
                  <Link
                    href="/login"
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Login to Your Account</span>
                  </Link>
                </div>

                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Important:</strong> Please change your password after login for security.
                  </p>
                </div>
              </div>
            )}

            {/* Password Expired */}
            {request.status === 'approved' && request.expiresAt && isPasswordExpired(request.expiresAt) && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 mb-8 border-2 border-red-500 dark:border-red-400">
                <div className="flex items-center space-x-3 mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <h4 className="text-lg font-bold text-red-900 dark:text-red-100">Temporary Password Expired</h4>
                </div>
                <p className="text-red-800 dark:text-red-200 mb-4">
                  The temporary password has expired. Please submit a new password reset request.
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
                >
                  Submit New Request
                </Link>
              </div>
            )}

            {/* Rejection Reason */}
            {request.status === 'rejected' && request.rejectionReason && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 mb-8 border-2 border-red-500 dark:border-red-400">
                <div className="flex items-center space-x-3 mb-4">
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  <h4 className="text-lg font-bold text-red-900 dark:text-red-100">Request Rejected</h4>
                </div>
                <p className="text-sm text-red-800 dark:text-red-200 mb-2"><strong>Reason:</strong></p>
                <p className="text-red-800 dark:text-red-200">{request.rejectionReason}</p>
                <div className="mt-4">
                  <Link
                    href="/forgot-password"
                    className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-red-500/50 transition-all"
                  >
                    Submit New Request
                  </Link>
                </div>
              </div>
            )}

            {/* Request Details */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">User Type</p>
                  <p className="font-medium text-gray-900 dark:text-white capitalize">{request.userType}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                  <p className="font-medium text-gray-900 dark:text-white">{request.email}</p>
                </div>

                {request.accountNumber && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
                    <p className="font-medium text-gray-900 dark:text-white">{request.accountNumber}</p>
                  </div>
                )}

                {request.requestReason && (
                  <div className="md:col-span-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Request Reason</p>
                    <p className="font-medium text-gray-900 dark:text-white">{request.requestReason}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Need Help?</strong> If you have any questions about your request, please contact our support team at support@electrolux-ems.com or call 1800-XXX-XXXX
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
