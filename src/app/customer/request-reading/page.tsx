'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Gauge,
  Calendar,
  Clock,
  MapPin,
  Phone,
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  User,
  Zap,
  History,
  Eye,
  XCircle
} from 'lucide-react';
import { formatPKPhone, onlyDigits } from '@/lib/utils/dataHandlers';

export default function RequestReading() {
  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    requestType: 'regular',
    preferredDate: '',
    preferredTimeSlot: 'morning',
    contactPhone: '',
    alternatePhone: '',
    accessInstructions: '',
    urgency: 'medium'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [previousRequests, setPreviousRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState<any>(null);
  const [canRequestBill, setCanRequestBill] = useState(false);
  const [canRequestReading, setCanRequestReading] = useState(true);
  const [requestingBill, setRequestingBill] = useState(false);
  const [showBillRequestSuccess, setShowBillRequestSuccess] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');

  // Fetch customer account info and previous requests
  useEffect(() => {
    fetchAccountInfo();
    fetchPreviousRequests();
    checkBillEligibility();

    // Auto-refresh eligibility status every 30 seconds
    // This ensures customer sees updated status when employee completes work order
    const intervalId = setInterval(() => {
      checkBillEligibility();
      fetchPreviousRequests();
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, []);

  const checkBillEligibility = async () => {
    try {
      console.log('[Customer] Checking bill eligibility...');
      // Check if customer can request meter reading
      const response = await fetch('/api/bills/can-request');
      console.log('[Customer] API response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('[Customer] API result:', result);
        console.log('[Customer] canRequestReading:', result.canRequestReading);
        console.log('[Customer] reason:', result.reason);

        setCanRequestBill(result.canRequest || false);
        setCanRequestReading(result.canRequestReading === true);

        if (result.reason) {
          setEligibilityMessage(result.reason);
          console.log('[Customer] Setting eligibility message:', result.reason);
        } else {
          setEligibilityMessage('');
        }

        console.log('[Customer] State updated - canRequestReading:', result.canRequestReading === true);
      }
    } catch (error) {
      console.error('[Customer] Error checking bill eligibility:', error);
      // On error, do NOT allow request (fail secure)
      setCanRequestReading(false);
      setEligibilityMessage('Error checking eligibility. Please refresh the page.');
    }
  };

  const handleRequestBill = async () => {
    try {
      setRequestingBill(true);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 3); // 3 days for meter reading

      // Create work order for meter reading request
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workType: 'meter_reading',
          title: 'Meter Reading Request',
          description: 'Customer requested meter reading for bill generation.',
          priority: 'medium',
          dueDate: dueDate.toISOString().split('T')[0]
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setShowBillRequestSuccess(true);

        // Refresh eligibility - API will determine if customer can request again
        await checkBillEligibility();
        await fetchPreviousRequests();

        setTimeout(() => setShowBillRequestSuccess(false), 5000);
      } else {
        alert(`❌ ${result.error || 'Failed to request meter reading'}`);
      }
    } catch (error) {
      console.error('Error requesting meter reading:', error);
      alert('❌ Failed to request meter reading. Please try again.');
    } finally {
      setRequestingBill(false);
    }
  };

  const fetchAccountInfo = async () => {
    try {
      // Fetch from customer profile/account API
      const response = await fetch('/api/customers/profile');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAccountInfo({
            accountNumber: result.data.accountNumber || 'N/A',
            customerName: result.data.fullName || 'Customer',
            address: result.data.address || 'N/A',
            meterNumber: result.data.meterNumber || 'N/A',
            lastReading: result.data.lastReading,
            lastReadingDate: result.data.lastReadingDate,
            zone: result.data.zone || 'N/A'
          });
        }
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
    }
  };

  const fetchPreviousRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/reading-requests');

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPreviousRequests(result.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching previous requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestTypes = [
    { value: 'regular', label: 'Regular Reading', description: 'Standard monthly meter reading' },
    { value: 'urgent', label: 'Urgent Reading', description: 'Need reading within 24 hours' },
    { value: 'disputed', label: 'Disputed Bill', description: 'Request reading for bill verification' },
    { value: 'final', label: 'Final Reading', description: 'Closing account or moving out' }
  ];

  const timeSlots = [
    { value: 'morning', label: 'Morning (8 AM - 12 PM)' },
    { value: 'afternoon', label: 'Afternoon (12 PM - 4 PM)' },
    { value: 'evening', label: 'Evening (4 PM - 7 PM)' },
    { value: 'anytime', label: 'Anytime (Flexible)' }
  ];

  const urgencyLevels = [
    { value: 'low', label: 'Low Priority', color: 'from-green-500 to-emerald-500', description: 'Within 7 days' },
    { value: 'medium', label: 'Normal Priority', color: 'from-blue-500 to-cyan-500', description: 'Within 3-5 days' },
    { value: 'high', label: 'High Priority', color: 'from-yellow-400 to-orange-500', description: 'Within 1-2 days' },
    { value: 'urgent', label: 'Urgent', color: 'from-red-500 to-pink-500', description: 'Within 24 hours' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Create reading request (will be assigned by admin later)
      const requestReason = `Request Type: ${formData.requestType}\nPreferred Time: ${formData.preferredTimeSlot}\nContact: ${formData.contactPhone}\nAlternate: ${formData.alternatePhone}\n\nAccess Instructions:\n${formData.accessInstructions || 'None provided'}`;

      const response = await fetch('/api/reading-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: session?.user.customerId,
          preferredDate: formData.preferredDate || null,
          requestReason: requestReason,
          priority: formData.urgency === 'urgent' || formData.urgency === 'high' ? 'urgent' : 'normal',
          notes: null,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit request');
      }

      const result = await response.json();

      if (result.success) {
        const newRequestId = result.data.requestNumber;
        setRequestId(newRequestId);
        setShowSuccess(true);

        // Refresh previous requests and eligibility
        // API will determine if customer can request again
        await fetchPreviousRequests();
        await checkBillEligibility();

        // Hide success message after 5 seconds
        setTimeout(() => {
          setShowSuccess(false);
        }, 5000);
      } else {
        throw new Error(result.error || 'Failed to submit request');
      }
    } catch (err: any) {
      console.error('Error submitting request:', err);
      alert(`❌ Error: ${err.message || 'Failed to submit request'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'in_progress': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'in_progress': return <Clock className="w-4 h-4" />;
      case 'pending': return <AlertCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center">
                <Gauge className="w-6 h-6 mr-2 text-purple-400" />
                Request Meter Reading
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Schedule a meter reading visit from our field team
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Form */}
            <div className="lg:col-span-2 space-y-4">
              {/* Success Message */}
              {showSuccess && (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl p-5 border border-green-500/50">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-7 h-7 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">Request Submitted Successfully!</h3>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Your meter reading request has been received and assigned to a field employee.
                      </p>
                    </div>
                  </div>
                  <div className="p-4 bg-white dark:bg-white/5 rounded-lg border border-green-500/20">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Request Number</p>
                        <p className="text-gray-900 dark:text-white font-bold">{requestId}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Status</p>
                        <p className="text-yellow-400 font-semibold">Pending Assignment</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Preferred Date</p>
                        <p className="text-gray-900 dark:text-white font-semibold">{formData.preferredDate}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 dark:text-gray-400">Expected Assignment</p>
                        <p className="text-gray-900 dark:text-white font-semibold">Within 2 hours</p>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-700 dark:text-gray-300 mt-3">
                    You will receive a notification once an employee is assigned to your request.
                  </p>
                </div>
              )}

              {/* Show appropriate message based on status */}
              {!canRequestReading && eligibilityMessage && (
                <div className={`backdrop-blur-xl rounded-2xl p-5 border ${
                  eligibilityMessage.includes('Bill already exists')
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/50'
                    : eligibilityMessage.includes('pending')
                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50'
                    : 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50'
                }`}>
                  <div className="flex items-center space-x-3">
                    {eligibilityMessage.includes('Bill already exists') ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <Clock className="w-6 h-6 text-blue-400" />
                    )}
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">
                        {eligibilityMessage.includes('Bill already exists')
                          ? '✅ You\'re All Set!'
                          : eligibilityMessage.includes('pending')
                          ? '⏳ Request Pending'
                          : 'Notice'}
                      </h3>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                        {eligibilityMessage}
                        {eligibilityMessage.includes('Bill already exists') && '. View your bill in "My Bills" section.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Account Information */}
              <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-5 border border-purple-500/20">
                <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Account Information
                </h2>
                {accountInfo ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-start space-x-3">
                      <FileText className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Account Number</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{accountInfo.accountNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Gauge className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Meter Number</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{accountInfo.meterNumber}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 md:col-span-2">
                      <MapPin className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Service Address</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{accountInfo.address}</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Zap className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Last Reading</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {accountInfo.lastReading ? `${accountInfo.lastReading} kWh` : 'N/A'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Calendar className="w-4 h-4 text-purple-400 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Last Reading Date</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {accountInfo.lastReadingDate || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading account info...</p>
                  </div>
                )}
              </div>

              {/* Request Form */}
              {canRequestReading && (
                <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10 space-y-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Reading Request Details</h2>

                {/* Request Type */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Request Type
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {requestTypes.map((type) => (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, requestType: type.value })}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          formData.requestType === type.value
                            ? 'border-purple-400/50 bg-purple-500/10'
                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                        }`}
                      >
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{type.label}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{type.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Urgency Level */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Priority Level
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {urgencyLevels.map((level) => (
                      <button
                        key={level.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, urgency: level.value })}
                        className={`p-3 rounded-lg border transition-all text-center ${
                          formData.urgency === level.value
                            ? 'border-purple-400/50 bg-purple-500/10'
                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className={`w-8 h-8 bg-gradient-to-r ${level.color} rounded-lg flex items-center justify-center mx-auto mb-2`}>
                          <AlertCircle className="w-4 h-4 text-white" />
                        </div>
                        <p className="text-xs font-semibold text-gray-900 dark:text-white">{level.label}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{level.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preferred Date */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Preferred Date <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                      type="date"
                      required
                      value={formData.preferredDate}
                      onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-400 transition-colors"
                    />
                  </div>
                </div>

                {/* Time Slot */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Preferred Time Slot
                  </label>
                  <select
                    value={formData.preferredTimeSlot}
                    onChange={(e) => setFormData({ ...formData, preferredTimeSlot: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-400 font-medium"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot.value} value={slot.value} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Contact Phone */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Contact Phone <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      value={formatPKPhone(formData.contactPhone)}
                      onChange={(e) => {
                        const raw = onlyDigits(e.target.value).slice(0, 11);
                        setFormData({ ...formData, contactPhone: raw });
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
                      placeholder="0300-1234567"
                    />
                  </div>
                </div>

                {/* Alternate Phone */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Alternate Phone (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
                    <input
                      type="tel"
                      inputMode="numeric"
                      value={formatPKPhone(formData.alternatePhone)}
                      onChange={(e) => {
                        const raw = onlyDigits(e.target.value).slice(0, 11);
                        setFormData({ ...formData, alternatePhone: raw });
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors"
                      placeholder="0300-1234567"
                    />
                  </div>
                </div>

                {/* Access Instructions */}
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Access Instructions (Optional)
                  </label>
                  <textarea
                    value={formData.accessInstructions}
                    onChange={(e) => setFormData({ ...formData, accessInstructions: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-purple-400 transition-colors resize-none"
                    rows={3}
                    placeholder="Provide any special instructions for accessing your meter (e.g., gate code, dog on premises, meter location details)"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-purple-500/50'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Submit Reading Request</span>
                    </>
                  )}
                </button>
              </form>
              )}
            </div>

            {/* Right Column - Info & History */}
            <div className="space-y-4">
              {/* Bill Request Success */}
              {showBillRequestSuccess && (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl p-5 border border-green-500/50">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <h3 className="text-sm font-bold text-gray-900 dark:text-white">Bill Request Submitted!</h3>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                        Your bill generation request has been sent. You'll receive your bill within 24 hours.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* REMOVED: Request Bill Button - Customer only requests meter reading, bill auto-generates */}

              {/* Important Notice */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-2xl p-5 border border-blue-500/20">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-blue-400" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Important Information</h3>
                </div>
                <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Reading requests are processed within 24 hours</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>You'll receive SMS and email notifications</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Ensure meter is accessible on preferred date</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="w-3 h-3 text-blue-400 mt-0.5 flex-shrink-0" />
                    <span>Bill will be generated after reading is taken</span>
                  </div>
                </div>
              </div>

              {/* Previous Requests */}
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10">
                <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center">
                  <History className="w-4 h-4 mr-2" />
                  Previous Requests
                </h3>
                {loading ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mx-auto"></div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading...</p>
                  </div>
                ) : previousRequests.length === 0 ? (
                  <div className="text-center py-6">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No previous requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {previousRequests.slice(0, 5).map((request) => (
                      <div
                        key={request.id}
                        className="p-3 bg-white dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-gray-900 dark:text-white">REQ-{request.id}</span>
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-semibold border ${getStatusColor(request.status)}`}>
                            {getStatusIcon(request.status)}
                            <span className="capitalize">{request.status.replace('_', ' ')}</span>
                          </span>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Requested:</span>
                            <span className="text-gray-900 dark:text-white">{new Date(request.assignedDate).toLocaleDateString()}</span>
                          </div>
                          {request.completionDate && (
                            <div className="flex justify-between">
                              <span>Completed:</span>
                              <span className="text-gray-900 dark:text-white">{new Date(request.completionDate).toLocaleDateString()}</span>
                            </div>
                          )}
                          {request.employeeName && (
                            <div className="flex justify-between">
                              <span>Employee:</span>
                              <span className="text-gray-900 dark:text-white">{request.employeeName}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Need Help */}
              <div className="bg-gradient-to-r from-yellow-400/10 to-orange-500/10 backdrop-blur-xl rounded-2xl p-5 border border-yellow-400/20">
                <div className="flex items-center space-x-2 mb-3">
                  <Phone className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Need Help?</h3>
                </div>
                <p className="text-xs text-gray-700 dark:text-gray-300 mb-3">
                  Contact our customer service team for assistance with meter reading requests.
                </p>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <span className="text-gray-900 dark:text-white font-semibold">1-800-ELECTRIC</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Hours:</span>
                    <span className="text-gray-900 dark:text-white font-semibold">24/7</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

