'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  User,
  Mail,
  Phone,
  Home,
  MapPin,
  Calendar,
  FileText,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { formatPKPhone, formatCNIC, onlyDigits } from '@/lib/utils/dataHandlers';

export default function ApplyConnection() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [copied, setCopied] = useState(false);

  const [formData, setFormData] = useState({
    applicantName: '',
    fatherName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    idType: 'national_id' as 'national_id',
    idNumber: '',
    propertyType: 'Residential' as 'Residential' | 'Commercial' | 'Industrial' | 'Agricultural',
    connectionType: 'single-phase',
    propertyAddress: '',
    city: '',
    state: '',
    pincode: '',
    landmark: '',
    preferredDate: '',
    zone: ''
  });

  const [zones, setZones] = useState<string[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  const [zonesError, setZonesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchZones = async () => {
      setZonesLoading(true);
      setZonesError(null);
      try {
        const resp = await fetch('/api/zones');
        const json = await resp.json();
        if (resp.ok && json?.success && Array.isArray(json.data)) {
          setZones(json.data);
        } else {
          setZones(['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']);
        }
      } catch (e: any) {
        setZonesError('Failed to load zones');
        setZones(['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']);
      } finally {
        setZonesLoading(false);
      }
    };
    fetchZones();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validate zone is selected
      if (!formData.zone) {
        setError('Please select a zone before submitting');
        setLoading(false);
        return;
      }

      // Auto-set purpose based on property type
      const purposeMap: Record<string, string> = {
        'Residential': 'domestic',
        'Commercial': 'business',
        'Industrial': 'industrial',
        'Agricultural': 'agricultural'
      };

      const submitData = {
        ...formData,
        purposeOfConnection: purposeMap[formData.propertyType],
        loadRequired: null, // Load will be determined during inspection
        existingConnection: false,
        existingAccountNumber: ''
      };

      console.log('[Apply Connection] Submitting data:', {
        applicantName: submitData.applicantName,
        zone: submitData.zone,
        email: submitData.email
      });

      const response = await fetch('/api/connection-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to submit application');
      }

      setApplicationNumber(result.data.applicationNumber);
      setSuccess(true);

    } catch (err: any) {
      console.error('Error submitting application:', err);
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Application Submitted Successfully!
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Your connection request has been received and is under review
            </p>
          </div>

          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl p-6 mb-6">
            <p className="text-sm opacity-90 mb-2">Your Application Number</p>
            <p className="text-3xl font-bold tracking-wide">{applicationNumber}</p>
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(applicationNumber);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-white text-sm font-semibold transition-colors"
              >
                Copy Application Number
              </button>
              {copied && (
                <span className="text-xs text-white/90">Copied!</span>
              )}
            </div>
            <p className="text-sm opacity-90 mt-2">Please save this number for future reference</p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 text-left space-y-3 mb-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">What's Next?</h3>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-yellow-400 text-white flex items-center justify-center text-sm flex-shrink-0">1</div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Application Review</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Our team will review your application within 2-3 business days</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-yellow-400 text-white flex items-center justify-center text-sm flex-shrink-0">2</div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Site Inspection</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">If approved, we'll schedule a site inspection at your property</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-yellow-400 text-white flex items-center justify-center text-sm flex-shrink-0">3</div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Installation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Our technician will install the meter and activate your connection</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-yellow-400 text-white flex items-center justify-center text-sm flex-shrink-0">4</div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Account Activation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Check application status to get your login credentials once approved</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Track Your Application:</strong> Use your application number to check the status anytime. Once approved, you'll see your account credentials on the tracking page.
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              We'll send updates to <span className="font-semibold text-gray-900 dark:text-white">{formData.email}</span>
            </p>
            <Link href={`/track-application`}>
              <button className="w-full px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all flex items-center justify-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Track Application Status</span>
              </button>
            </Link>
            <Link href="/">
              <button className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                Back to Home
              </button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/login" className="inline-flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Login
          </Link>
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Apply for New Connection
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Get electricity connection in just a few simple steps
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold">Application Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8">
          {/* Personal Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-yellow-400" />
              Personal Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Applicant Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.applicantName}
                  onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Full name as per ID"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Father's Name
                </label>
                <input
                  type="text"
                  value={formData.fatherName}
                  onChange={(e) => setFormData({ ...formData, fatherName: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Father's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    suppressHydrationWarning
                    placeholder="customer@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={formatPKPhone(formData.phone)}
                    onChange={(e) => {
                      const raw = onlyDigits(e.target.value).slice(0, 11);
                      setFormData({ ...formData, phone: raw });
                    }}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., 0300-1234567 (11 digits)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formData.alternatePhone}
                  onChange={(e) => {
                    const raw = onlyDigits(e.target.value).slice(0, 11);
                    setFormData({ ...formData, alternatePhone: raw });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 0300-1234567 (optional)"
                />
              </div>
            </div>
          </div>

          {/* ID Verification */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-yellow-400" />
              Identity Verification
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  National ID (CNIC) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formatCNIC(formData.idNumber)}
                  onChange={(e) => {
                    const raw = onlyDigits(e.target.value).slice(0, 13);
                    setFormData({ ...formData, idNumber: raw });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="42101-1234567-1 (13 digits)"
                />
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">CNIC must be 13 digits (formatted 5-7-1)</p>
              </div>
            </div>
          </div>

          {/* Connection Details */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-400" />
              Connection Details
            </h2>
            <div className="mb-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Note:</strong> All connections are Single-Phase. One customer can have only one meter connection.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={formData.propertyType}
                  onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Agricultural">Agricultural</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred Connection Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Property Address */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2 text-yellow-400" />
              Property Address
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Property Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.propertyAddress}
                  onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="House/Plot number, Street, Area"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Lahore"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    State/Province <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Punjab"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Zone <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={formData.zone}
                    onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{zonesLoading ? 'Loading zones...' : 'Select Zone'}</option>
                    {zones.map((z) => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Pincode <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    pattern="[0-9]{5,6}"
                    minLength={5}
                    maxLength={6}
                    value={formData.pincode}
                    onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="5-6 digit pincode"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Landmark
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={formData.landmark}
                    onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                    className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yellow-400 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Nearby landmark (optional)"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-orange-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Submitting Application...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          </div>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            By submitting this form, you agree to our terms and conditions
          </p>
        </form>
      </div>
    </div>
  );
}

