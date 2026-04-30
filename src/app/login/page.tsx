'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/useToast';
import { Zap, Mail, Lock, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showResendLink, setShowResendLink] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        const errorMessage = result.error;
        setError(errorMessage);
        toast.error(errorMessage);

        if (result.error.toLowerCase().includes('verify your email')) {
          setShowResendLink(true);
        }

        setIsLoading(false);
      } else if (result?.ok) {
        const response = await fetch('/api/auth/session');
        const session = await response.json();

        if (session?.user?.userType) {
          toast.success('Login successful!');

          switch (session.user.userType) {
            case 'admin':
              router.push('/admin/dashboard');
              break;
            case 'employee':
              router.push('/employee/dashboard');
              break;
            case 'customer':
              router.push('/customer/dashboard');
              break;
            default:
              router.push('/');
          }
        } else {
          router.push('/');
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = 'An error occurred. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-800 to-slate-900 p-12 flex-col justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">ElectroLux</span>
        </div>

        {/* Main Content */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Powering Smart{' '}
            <span className="text-orange-400">Energy Solutions</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-md">
            Streamline your electricity management with real-time monitoring, automated billing, and comprehensive analytics.
          </p>

          {/* Features List */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              <span className="text-slate-300">Customer Management</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              <span className="text-slate-300">Usage Analytics</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              <span className="text-slate-300">Secure Billing</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-orange-400 rounded-full" />
              <span className="text-slate-300">Real-time Updates</span>
            </div>
          </div>
        </div>

        {/* Footer Stats */}
        <div className="flex gap-8">
          <div>
            <p className="text-2xl font-bold text-white">500+</p>
            <p className="text-slate-500 text-sm">Customers</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">99.9%</p>
            <p className="text-slate-500 text-sm">Uptime</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">24/7</p>
            <p className="text-slate-500 text-sm">Support</p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">ElectroLux EMS</span>
          </div>

          {/* Form Card */}
          <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="text-slate-400 mt-2">Sign in to your account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-sm text-red-400">{error}</span>
                    {showResendLink && (
                      <Link
                        href={`/verify-email?email=${email}`}
                        className="block mt-2 text-sm text-orange-400 hover:text-orange-300"
                      >
                        Resend verification code →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="you@example.com"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Enter your password"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-orange-400 hover:text-orange-300">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-semibold py-3 rounded-lg hover:from-yellow-400 hover:to-orange-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            {/* Demo Accounts */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <p className="text-xs text-slate-500 text-center mb-4">Quick Demo Access</p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('admin@electrolux.com', 'password123')}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Admin
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('employee@electrolux.com', 'password123')}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Employee
                </button>
                <button
                  type="button"
                  onClick={() => fillDemoCredentials('customer@example.com', 'password123')}
                  disabled={isLoading}
                  className="flex-1 py-2.5 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  Customer
                </button>
              </div>
            </div>

            {/* Register Link */}
            <p className="mt-6 text-center text-sm text-slate-400">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-orange-400 hover:text-orange-300 font-medium">
                Sign up
              </Link>
            </p>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-slate-600">
            © 2025 ElectroLux EMS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
