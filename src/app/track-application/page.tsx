'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Copy,
  LogIn,
  Loader2,
  Zap,
  ArrowLeft,
  CalendarDays,
  User,
  Mail,
  Phone,
  MapPin,
  Key,
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

export default function TrackApplication() {
  const router = useRouter();
  const [applicationNumber, setApplicationNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [application, setApplication] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState<'password' | 'account' | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setApplication(null);

    try {
      const response = await fetch(`/api/connection-requests/track?applicationNumber=${encodeURIComponent(applicationNumber)}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Application not found');
      }

      setApplication(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application status');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any; text: string }> = {
      pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock, text: 'Pending Review' },
      under_review: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: Eye, text: 'Under Review' },
      approved: { color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle, text: 'Rejected' },
      connected: { color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400', icon: Zap, text: 'Connected' },
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

  const handleCopy = (text: string, type: 'password' | 'account') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Track Your Application</p>
              </div>
            </div>
            <Link
              href="/"
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
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
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Track Your Connection Request</h2>
            <p className="text-gray-600 dark:text-gray-400">Enter your application number to check the status</p>
          </div>

          <form onSubmit={handleSearch} className="max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value.toUpperCase())}
                placeholder="Enter Application Number (e.g., APP-2025-123456)"
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
                  <span>Track Application</span>
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

        {/* Application Details */}
        {application && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            {/* Status Header */}
            <div className="text-center mb-8 pb-6 border-b border-gray-200 dark:border-white/10">
              <div className="mb-4">
                {getStatusBadge(application.status)}
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Application #{application.applicationNumber}</h3>
              <p className="text-gray-600 dark:text-gray-400">Submitted on {new Date(application.applicationDate).toLocaleDateString()}</p>
            </div>

            {/* Timeline */}
            <div className="mb-8">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Application Timeline</h4>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Application Submitted</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(application.applicationDate).toLocaleString()}</p>
                  </div>
                </div>

                {application.status !== 'pending' && (
                  <div className="flex items-start space-x-3">
                    <div className={`flex-shrink-0 w-8 h-8 ${application.status === 'approved' || application.status === 'connected' ? 'bg-green-500' : 'bg-yellow-500'} rounded-full flex items-center justify-center`}>
                      {application.status === 'approved' || application.status === 'connected' ? (
                        <CheckCircle className="w-5 h-5 text-white" />
                      ) : (
                        <Clock className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Under Review</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Being processed by our team</p>
                    </div>
                  </div>
                )}

                {(application.status === 'approved' || application.status === 'connected') && application.approvalDate && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Application Approved</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(application.approvalDate).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {application.status === 'approved' && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center animate-pulse">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Installation in Progress</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Our team is working on your connection. You'll receive your account credentials once installation is complete.</p>
                    </div>
                  </div>
                )}

                {application.status === 'connected' && application.installationDate && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <Zap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Installation Completed</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{new Date(application.installationDate).toLocaleString()}</p>
                    </div>
                  </div>
                )}

                {application.status === 'rejected' && (
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Application Rejected</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Please contact support for more information</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Credentials - Only show if connected (account created) */}
            {application.status === 'connected' && application.accountNumber && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 mb-8 border-2 border-green-500 dark:border-green-400">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  <h4 className="text-lg font-bold text-green-900 dark:text-green-100">🎉 Congratulations! Your Account is Ready</h4>
                </div>
                <p className="text-green-800 dark:text-green-200 mb-6">Your connection request has been approved. Use the credentials below to login to your account.</p>

                <div className="space-y-4">
                  {/* Account Number */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
                          <p className="text-lg font-bold text-gray-900 dark:text-white">{application.accountNumber}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(application.accountNumber, 'account')}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                        title="Copy Account Number"
                      >
                        {copied === 'account' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <Copy className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Temporary Password */}
                  {application.temporaryPassword && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-1">
                          <Key className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <div className="flex-1">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Temporary Password</p>
                            <div className="flex items-center space-x-2">
                              <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
                                {showPassword ? application.temporaryPassword : '••••••••••••'}
                              </p>
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"
                                title={showPassword ? "Hide Password" : "Show Password"}
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleCopy(application.temporaryPassword, 'password')}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                          title="Copy Password"
                        >
                          {copied === 'password' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <Copy className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Login Email */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Login Email</p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">{application.email}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center space-x-3">
                  <button
                    onClick={() => router.push('/login')}
                    className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-green-500/50 transition-all"
                  >
                    <LogIn className="w-5 h-5" />
                    <span>Login to Your Account</span>
                  </button>
                </div>

                <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    <strong>Important:</strong> Please change your password after first login for security.
                  </p>
                </div>
              </div>
            )}

            {/* Application Details */}
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Application Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Applicant Name</p>
                    <p className="font-medium text-gray-900 dark:text-white">{application.applicantName}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="font-medium text-gray-900 dark:text-white">{application.email}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                    <p className="font-medium text-gray-900 dark:text-white">{application.phone}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Property Type</p>
                    <p className="font-medium text-gray-900 dark:text-white">{application.propertyType}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 md:col-span-2">
                  <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Property Address</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {application.propertyAddress}, {application.city}, {application.state} - {application.pincode}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Help Section */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-white/10">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>Need Help?</strong> If you have any questions about your application, please contact our support team at support@electrolux-ems.com or call 1800-XXX-XXXX
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

