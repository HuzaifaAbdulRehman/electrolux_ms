'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import { safeNumber, formatCurrency, safeDate, formatUnits, formatPKPhone, onlyDigits } from '@/lib/utils/dataHandlers';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Edit,
  Save,
  Camera,
  Shield,
  Zap,
  Home,
  CreditCard,
  FileText,
  Award,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Settings,
  Key,
  Bell,
  Hash,
  DollarSign,
  Loader2,
  X
} from 'lucide-react';

export default function CustomerProfile() {
  const { data: session } = useSession();
  const toast = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [customerData, setCustomerData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [recentPayments, setRecentPayments] = useState<any[]>([]);
  const [recentBills, setRecentBills] = useState<any[]>([]);

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    secondaryEmail: '',
    emergencyContact: '',
    dateOfBirth: ''
  });

  useEffect(() => {
    fetchCustomerData();
  }, [session]);

  const fetchCustomerData = async () => {
    try {
      setLoading(true);

      // Fetch customer profile data
      const profileResponse = await fetch('/api/customers/profile');
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch profile data');
      }
      const profileResult = await profileResponse.json();

      if (profileResult.data) {
        setCustomerData(profileResult.data);
        setProfileData({
          fullName: profileResult.data.fullName || session?.user?.name || '',
          email: profileResult.data.email || session?.user?.email || '',
          phone: profileResult.data.phone || '',
          address: profileResult.data.address || '',
          city: profileResult.data.city || '',
          state: profileResult.data.state || '',
          pincode: profileResult.data.pincode || '',
          secondaryEmail: profileResult.data.secondaryEmail || '',
          emergencyContact: profileResult.data.emergencyContact || '',
          dateOfBirth: profileResult.data.dateOfBirth || ''
        });
      }

      // Fetch dashboard data for usage statistics
      const dashboardResponse = await fetch('/api/customer/dashboard?period=all');
      if (dashboardResponse.ok) {
        const dashboardResult = await dashboardResponse.json();
        if (dashboardResult.success) {
          setUsageData(dashboardResult.data);
        }
      }

      // Fetch recent payments
      const paymentsResponse = await fetch('/api/payments?limit=5');
      if (paymentsResponse.ok) {
        const paymentsResult = await paymentsResponse.json();
        setRecentPayments(paymentsResult.data || []);
      }

      // Fetch recent bills
      const billsResponse = await fetch('/api/bills?limit=3');
      if (billsResponse.ok) {
        const billsResult = await billsResponse.json();
        setRecentBills(billsResult.data || []);
      }

    } catch (error) {
      console.error('Error fetching customer data:', error);
      setError('Failed to load profile data');
      // Fallback to session data
      setProfileData({
        fullName: session?.user?.name || 'Customer',
        email: session?.user?.email || 'customer@example.com',
        phone: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        secondaryEmail: '',
        emergencyContact: '',
        dateOfBirth: ''
      });
    } finally {
      setLoading(false);
    }
  };

  // Account information from real data - Calculate payment health properly
  const calculatePaymentHealth = () => {
    const totalBills = recentBills.length;
    if (totalBills === 0) return 'New Account';

    const paidBills = recentBills.filter((b: any) => b.status === 'paid').length;
    const onTimeRate = Math.round((paidBills / totalBills) * 100);

    if (onTimeRate >= 90) return 'Excellent';
    if (onTimeRate >= 70) return 'Good';
    if (onTimeRate >= 50) return 'Fair';
    return 'Needs Attention';
  };

  const accountInfo = {
    accountNumber: customerData?.accountNumber || 'Loading...',
    meterNumber: customerData?.meterNumber || 'Loading...',
    zone: customerData?.zone || 'N/A',
    connectionType: customerData?.connectionType || 'Residential',
    connectionDate: customerData?.connectionDate || new Date().toISOString().split('T')[0],
    status: customerData?.status || 'Active',
    outstandingBalance: formatCurrency(safeNumber(customerData?.outstandingBalance, 0), 'Rs.'),
    averageMonthlyUsage: formatUnits(safeNumber(customerData?.averageMonthlyUsage, 0)),
    lastPaymentDate: safeDate(customerData?.lastPaymentDate),
    currentMeterReading: formatUnits(safeNumber(customerData?.lastReading, 0)),
    paymentHealth: calculatePaymentHealth(),
    accountAge: customerData?.connectionDate
      ? `${Math.floor((new Date().getTime() - new Date(customerData.connectionDate).getTime()) / (365 * 24 * 60 * 60 * 1000))} years`
      : 'N/A'
  };

  // Usage statistics - Calculated from real database data
  const calculateUsageStats = () => {
    const consumptionHistory = usageData?.consumptionHistory || [];
    // Filter out zero-unit bills (connection/installation charges)
    const consumptionHistoryFiltered = consumptionHistory.filter((item: any) => safeNumber(item.unitsConsumed, 0) > 0);

    const totalBills = recentBills.length;
    const paidBills = recentBills.filter((b: any) => b.status === 'paid').length;

    // Get current meter reading (cumulative)
    const latestMeterReading = usageData?.latestMeterReading;
    const currentMeterReading = latestMeterReading
      ? safeNumber(latestMeterReading.currentReading, 0)
      : 0;

    // Calculate total billed consumption (excluding zero-unit bills)
    const billedConsumption = consumptionHistoryFiltered.reduce((sum: number, item: any) =>
      sum + safeNumber(item.unitsConsumed, 0), 0
    );

    // Calculate average monthly (excluding zero-unit bills)
    const averageMonthly = consumptionHistoryFiltered.length > 0
      ? Math.round(billedConsumption / consumptionHistoryFiltered.length)
      : safeNumber(usageData?.avgConsumption, 0);

    // Find peak and lowest months (excluding zero-unit bills)
    let peakMonth = { month: 'N/A', units: 0 };
    let lowestMonth = { month: 'N/A', units: Infinity };

    consumptionHistoryFiltered.forEach((item: any) => {
      const units = safeNumber(item.unitsConsumed, 0);
      if (units > peakMonth.units) {
        peakMonth = {
          month: new Date(item.billingPeriod).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          units
        };
      }
      if (units < lowestMonth.units && units > 0) {
        lowestMonth = {
          month: new Date(item.billingPeriod).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          units
        };
      }
    });

    // Calculate total payments
    const totalPayments = recentPayments.reduce((sum: number, payment: any) =>
      sum + safeNumber(payment.paymentAmount, 0), 0
    );

    // Calculate on-time payment percentage
    const onTimePayments = totalBills > 0
      ? Math.round((paidBills / totalBills) * 100)
      : 100;

    return {
      currentMeterReading: formatUnits(currentMeterReading),
      billedConsumption: formatUnits(billedConsumption),
      averageMonthly: formatUnits(averageMonthly),
      peakMonth: peakMonth.month,
      lowestMonth: lowestMonth.month !== 'N/A' && lowestMonth.units !== Infinity ? lowestMonth.month : 'N/A',
      totalPayments: formatCurrency(totalPayments, 'Rs.'),
      onTimePayments: `${onTimePayments}%`
    };
  };

  const usageStats = calculateUsageStats();

  // Achievements removed (dummy content)

  // Recent activities - Compiled from real data
  const compileRecentActivities = () => {
    const activities: any[] = [];

    // Add recent payments
    recentPayments.slice(0, 3).forEach((payment: any) => {
      activities.push({
        date: payment.paymentDate,
        activity: 'Bill payment completed',
        amount: formatCurrency(safeNumber(payment.paymentAmount, 0), 'Rs.'),
        status: 'success',
        icon: CreditCard
      });
    });

    // Add recent bills
    recentBills.slice(0, 2).forEach((bill: any) => {
      activities.push({
        date: bill.issueDate,
        activity: 'Bill generated',
        amount: formatUnits(safeNumber(bill.unitsConsumed, 0)),
        status: 'info',
        icon: FileText
      });
    });

    // Sort by date (most recent first)
    return activities.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    ).slice(0, 5);
  };

  const recentActivities = compileRecentActivities();

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Validation
      if (!profileData.fullName || profileData.fullName.trim() === '') {
        setError('Full name is required');
        return;
      }

      if (!profileData.email || !/^\S+@\S+\.\S+$/.test(profileData.email)) {
        setError('Valid email is required');
        return;
      }

      if (profileData.phone && !/^\d{10,11}$/.test(profileData.phone.replace(/\D/g, ''))) {
        setError('Phone number must be 10-11 digits');
        return;
      }

      // Pincode validation removed - field not visible in UI, no need to validate

      // Call API to update profile
      const response = await fetch('/api/customers/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Success
      setSuccess('Profile updated successfully! Refreshing...');
      setIsEditing(false);

      // Refresh customer data
      await fetchCustomerData();

      // Reload page after 1.5 seconds to refresh session data
      // This ensures the status bar name and all other session-based data are updated
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (err: any) {
      console.error('Error saving profile:', err);
      setError(err.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="customer" userName={profileData.fullName || session?.user?.name || 'Customer'}>
      <div className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-semibold">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-400 font-semibold">{success}</p>
            </div>
            <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="bg-white dark:bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <User className="w-12 h-12 text-white" />
                </div>
                <button className="absolute bottom-0 right-0 w-8 h-8 bg-gray-100 dark:bg-gray-100 dark:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all">
                  <Camera className="w-4 h-4 text-white" />
                </button>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{profileData.fullName}</h1>
                <p className="text-gray-600 dark:text-gray-400">Account: {accountInfo.accountNumber}</p>
                <div className="flex items-center space-x-4 mt-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 text-sm rounded-full font-semibold border border-green-500/50">
                    {accountInfo.status}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-sm">Member since {accountInfo.connectionDate}</span>
                </div>
              </div>
            </div>
            <div className="mt-4 lg:mt-0">
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={saving}
                className={`px-6 py-3 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                  isEditing
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed'
                    : 'bg-white/10 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-300 dark:border-white/20 hover:bg-gray-200 dark:hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="w-5 h-5" />
                    <span>Save Changes</span>
                  </>
                ) : (
                  <>
                    <Edit className="w-5 h-5" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats - Only realistic database-calculable metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">Payment Health</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{accountInfo.paymentHealth}</p>
                {/* MySQL: CASE WHEN on_time_rate >= 95 THEN 'Excellent' WHEN on_time_rate >= 85 THEN 'Good' ELSE 'Fair' END */}
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">On-time Payments</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{usageStats.onTimePayments}</p>
                {/* MySQL: (COUNT(CASE WHEN paid_date <= due_date THEN 1 END) / COUNT(*) * 100) */}
              </div>
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-1">
          {['personal', 'account', 'usage'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold capitalize transition-all ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {activeTab === 'personal' && (
              <div className="bg-white dark:bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Full Name</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-3 bg-white dark:bg-white/5 rounded-lg">
                        <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{profileData.fullName}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Email Address</label>
                    {isEditing ? (
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-3 bg-white dark:bg-white/5 rounded-lg">
                        <Mail className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{profileData.email}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Phone Number</label>
                    {isEditing ? (
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={formatPKPhone(profileData.phone)}
                        onChange={(e) => {
                          const raw = onlyDigits(e.target.value).slice(0, 11);
                          setProfileData({ ...profileData, phone: raw });
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                        placeholder="0300-1234567 (11 digits)"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-3 bg-white dark:bg-white/5 rounded-lg">
                        <Phone className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{formatPKPhone(profileData.phone)}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Date of Birth</label>
                    {isEditing ? (
                      <input
                        type="date"
                        value={profileData.dateOfBirth}
                        onChange={(e) => setProfileData({ ...profileData, dateOfBirth: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                      />
                    ) : (
                      <div className="flex items-center space-x-3 p-3 bg-white dark:bg-white/5 rounded-lg">
                        <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{profileData.dateOfBirth}</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Full Address</label>
                    {isEditing ? (
                      <textarea
                        value={profileData.address}
                        onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                        rows={2}
                      />
                    ) : (
                      <div className="flex items-start space-x-3 p-3 bg-white dark:bg-white/5 rounded-lg">
                        <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                        <span className="text-gray-900 dark:text-white">{profileData.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="flex-1 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-gray-100 dark:bg-white/20 transition-all font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-emerald-500/50 transition-all font-semibold"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'account' && (
              <div className="bg-white dark:bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Account Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(accountInfo).map(([key, value]) => (
                    <div key={key} className="p-4 bg-white dark:bg-white/5 rounded-xl">
                      <p className="text-gray-600 dark:text-gray-400 text-sm mb-1 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                      <p className="text-white font-semibold flex items-center">
                        {key === 'status' ? (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 text-sm rounded-full">
                            {value}
                          </span>
                        ) : (
                          value
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'usage' && (
              <div className="bg-white dark:bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Usage Statistics</h2>
                  <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <p className="text-xs text-blue-600 dark:text-blue-400">💡 Meter reading is cumulative like odometer</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(usageStats).map(([key, value]) => {
                    const labels: { [key: string]: string } = {
                      currentMeterReading: 'Current Meter Reading',
                      billedConsumption: 'Billed Consumption (Since Connection)',
                      averageMonthly: 'Average Monthly',
                      peakMonth: 'Peak Month',
                      lowestMonth: 'Lowest Month',
                      totalPayments: 'Total Payments',
                      onTimePayments: 'On Time Payments'
                    };
                    return (
                      <div key={key} className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
                          {labels[key] || key.replace(/([A-Z])/g, ' $1').trim()}
                        </p>
                        <p className="text-xl font-semibold text-gray-900 dark:text-white">{value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Achievements removed */}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">

            {/* Recent Activity */}
            <div className="bg-white dark:bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-white dark:bg-white/5 rounded-lg">
                    <div className={`w-2 h-2 mt-2 rounded-full ${
                      activity.status === 'success' ? 'bg-green-400' : 'bg-blue-400'
                    }`} />
                    <div className="flex-1">
                      <p className="text-gray-900 dark:text-white text-sm">{activity.activity}</p>
                      <p className="text-gray-600 dark:text-gray-400 text-xs">{activity.date}</p>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400 text-xs">{activity.amount}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

