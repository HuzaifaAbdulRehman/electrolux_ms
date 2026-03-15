'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Shield,
  Zap
} from 'lucide-react';
import Link from 'next/link';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: '',
    color: 'bg-gray-300'
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Calculate password strength
  useEffect(() => {
    const calculateStrength = (password: string) => {
      if (!password) {
        return { score: 0, feedback: '', color: 'bg-gray-300' };
      }

      let score = 0;
      const feedback: string[] = [];

      // Length check
      if (password.length >= 8) score += 1;
      else feedback.push('at least 8 characters');

      // Uppercase check
      if (/[A-Z]/.test(password)) score += 1;
      else feedback.push('an uppercase letter');

      // Lowercase check
      if (/[a-z]/.test(password)) score += 1;
      else feedback.push('a lowercase letter');

      // Number check
      if (/[0-9]/.test(password)) score += 1;
      else feedback.push('a number');

      // Special character check
      if (/[^A-Za-z0-9]/.test(password)) score += 1;
      else feedback.push('a special character');

      let strengthText = '';
      let color = 'bg-gray-300';

      if (score === 0) {
        strengthText = '';
      } else if (score <= 2) {
        strengthText = 'Weak - Add ' + feedback.slice(0, 2).join(', ');
        color = 'bg-red-500';
      } else if (score === 3) {
        strengthText = 'Fair - Add ' + feedback.join(', ');
        color = 'bg-yellow-500';
      } else if (score === 4) {
        strengthText = 'Good - Consider adding ' + (feedback[0] || 'more complexity');
        color = 'bg-blue-500';
      } else {
        strengthText = 'Strong';
        color = 'bg-green-500';
      }

      return { score, feedback: strengthText, color };
    };

    setPasswordStrength(calculateStrength(formData.newPassword));
  }, [formData.newPassword]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!formData.currentPassword) {
      setError('Please enter your current password');
      return;
    }

    if (!formData.newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (formData.newPassword.length < 8) {
      setError('New password must be at least 8 characters long');
      return;
    }

    if (formData.newPassword === formData.currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please choose a stronger password.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to change password');
      }

      setSuccess(true);
      setFormData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        const userType = session?.user?.userType || 'customer';
        router.push(`/${userType}/dashboard`);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-10 opacity-10">
          <div className="absolute top-0 -left-4 w-72 h-72 bg-cyan-400 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-0 -right-4 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
      </div>

      <div className="relative max-w-md w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-xl rounded-full mb-4">
              <Shield className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Change Password</h1>
            <p className="text-white/90 mt-2">Update your account password</p>
          </div>

          {/* Change Password Form */}
          <div className="p-8">
            {success ? (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Password Changed Successfully!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Your password has been updated. Redirecting to dashboard...
                </p>
                <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Current Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={formData.currentPassword}
                        onChange={(e) => {
                          setFormData({ ...formData, currentPassword: e.target.value });
                          setError('');
                        }}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter current password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={isLoading}
                      >
                        {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={formData.newPassword}
                        onChange={(e) => {
                          setFormData({ ...formData, newPassword: e.target.value });
                          setError('');
                        }}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Enter new password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={isLoading}
                      >
                        {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {formData.newPassword && (
                      <div className="mt-2">
                        <div className="flex items-center space-x-2 mb-1">
                          <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${passwordStrength.color} transition-all duration-300`}
                              style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400 min-w-[60px]">
                            {passwordStrength.score === 0 ? 'Too Short' : passwordStrength.score <= 2 ? 'Weak' : passwordStrength.score === 3 ? 'Fair' : passwordStrength.score === 4 ? 'Good' : 'Strong'}
                          </span>
                        </div>
                        {passwordStrength.feedback && (
                          <p className="text-xs text-gray-600 dark:text-gray-400">{passwordStrength.feedback}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={formData.confirmPassword}
                        onChange={(e) => {
                          setFormData({ ...formData, confirmPassword: e.target.value });
                          setError('');
                        }}
                        className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Confirm new password"
                        required
                        disabled={isLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        disabled={isLoading}
                      >
                        {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>

                    {/* Password Match Indicator */}
                    {formData.confirmPassword && (
                      <div className="mt-2">
                        {formData.newPassword === formData.confirmPassword ? (
                          <div className="flex items-center text-green-600 dark:text-green-400 text-xs">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span>Passwords match</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600 dark:text-red-400 text-xs">
                            <XCircle className="w-4 h-4 mr-1" />
                            <span>Passwords do not match</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Password Requirements */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-2">Password Requirements:</p>
                    <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                      <li className="flex items-center">
                        {formData.newPassword.length >= 8 ? (
                          <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1.5 text-gray-400" />
                        )}
                        At least 8 characters
                      </li>
                      <li className="flex items-center">
                        {/[A-Z]/.test(formData.newPassword) ? (
                          <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1.5 text-gray-400" />
                        )}
                        One uppercase letter
                      </li>
                      <li className="flex items-center">
                        {/[a-z]/.test(formData.newPassword) ? (
                          <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1.5 text-gray-400" />
                        )}
                        One lowercase letter
                      </li>
                      <li className="flex items-center">
                        {/[0-9]/.test(formData.newPassword) ? (
                          <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1.5 text-gray-400" />
                        )}
                        One number
                      </li>
                      <li className="flex items-center">
                        {/[^A-Za-z0-9]/.test(formData.newPassword) ? (
                          <CheckCircle className="w-3 h-3 mr-1.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3 h-3 mr-1.5 text-gray-400" />
                        )}
                        One special character
                      </li>
                    </ul>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold py-3 rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Changing Password...
                      </>
                    ) : (
                      <>
                        <Shield className="h-5 w-5" />
                        Change Password
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Dashboard Link */}
                <div className="mt-6 text-center">
                  <Link
                    href={`/${session?.user?.userType || 'customer'}/dashboard`}
                    className="text-sm text-cyan-500 hover:text-cyan-600 font-medium"
                  >
                    Back to Dashboard
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Need help? Contact support@electrolux-ems.com
          </p>
        </div>
      </div>
    </div>
  );
}
