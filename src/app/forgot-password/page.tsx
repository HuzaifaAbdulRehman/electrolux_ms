'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Mail,
  Zap,
  ArrowLeft,
  Shield,
  AlertCircle,
  CheckCircle,
  Send,
  KeyRound,
  Loader2,
  CreditCard,
  User,
  Copy
} from 'lucide-react';

export default function ForgotPasswordPage() {
  const [formData, setFormData] = useState({
    userType: 'customer' as 'employee' | 'customer',
    email: '',
    accountNumber: '',
    requestReason: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!formData.email) {
      setError('Please enter your email address');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (formData.userType === 'customer' && formData.accountNumber && formData.accountNumber.length < 5) {
      setError('Account number must be at least 5 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit password reset request');
      }

      setRequestNumber(result.data.requestNumber);
      setIsSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Password Reset Request</p>
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
        {!isSubmitted ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full mb-4">
                <KeyRound className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Reset Your Password</h2>
              <p className="text-gray-600 dark:text-gray-400">Submit a password reset request to regain access to your account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                <p className="text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* User Type Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  I am a <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, userType: 'customer', accountNumber: '' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.userType === 'customer'
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                        : 'border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/30'
                    }`}
                  >
                    <User className={`w-6 h-6 mx-auto mb-2 ${formData.userType === 'customer' ? 'text-cyan-500' : 'text-gray-400'}`} />
                    <p className={`font-medium ${formData.userType === 'customer' ? 'text-cyan-900 dark:text-cyan-100' : 'text-gray-700 dark:text-gray-300'}`}>Customer</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, userType: 'employee', accountNumber: '' })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.userType === 'employee'
                        ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                        : 'border-gray-300 dark:border-white/20 hover:border-gray-400 dark:hover:border-white/30'
                    }`}
                  >
                    <Shield className={`w-6 h-6 mx-auto mb-2 ${formData.userType === 'employee' ? 'text-cyan-500' : 'text-gray-400'}`} />
                    <p className={`font-medium ${formData.userType === 'employee' ? 'text-cyan-900 dark:text-cyan-100' : 'text-gray-700 dark:text-gray-300'}`}>Employee</p>
                  </button>
                </div>
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => {
                      setFormData({ ...formData, email: e.target.value });
                      setError('');
                    }}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder={formData.userType === 'customer' ? 'customer@example.com' : 'employee@electrolux.com'}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Account Number (Optional for Customers) */}
              {formData.userType === 'customer' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Account Number (Optional)
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.accountNumber}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="e.g., ACC-2025-123456"
                      disabled={isLoading}
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Providing your account number helps us verify your identity faster
                  </p>
                </div>
              )}

              {/* Request Reason (Optional) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for Request (Optional)
                </label>
                <textarea
                  value={formData.requestReason}
                  onChange={(e) => setFormData({ ...formData, requestReason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                  placeholder="e.g., Forgot password, Account locked, etc."
                  disabled={isLoading}
                />
              </div>

              {/* Information Box */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800 dark:text-blue-300">
                    <p className="font-semibold mb-1">How it works:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Submit your password reset request</li>
                      <li>Admin will review and approve your request</li>
                      <li>You'll receive a temporary password via email</li>
                      <li>Track your request status using the request number</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </form>

            {/* Footer Links */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Already have a request number?
              </p>
              <Link
                href="/track-password-reset"
                className="text-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 font-medium"
              >
                Track your request
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Request Submitted Successfully!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your password reset request has been submitted and is pending admin approval
              </p>

              {/* Request Number Display */}
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl p-6 mb-6 border-2 border-cyan-500 dark:border-cyan-400">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Your Request Number</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2 font-mono">{requestNumber}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(requestNumber);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="mt-3 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-all flex items-center space-x-2 mx-auto"
                >
                  <Copy className="w-4 h-4" />
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  Save this number to track your request status
                </p>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800 mb-6">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">What happens next?</p>
                <ul className="text-sm text-blue-800 dark:text-blue-300 text-left space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Admin will review your request within 24 hours</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>If approved, you'll receive a temporary password via email</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>You can track your request status using the request number above</span>
                  </li>
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/track-password-reset"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Track Request Status</span>
                </Link>
                <Link
                  href="/login"
                  className="flex-1 px-6 py-3 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-white/20 transition-all flex items-center justify-center space-x-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
