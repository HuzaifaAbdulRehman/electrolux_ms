'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Gauge,
  Search,
  User,
  MapPin,
  Calendar,
  Save,
  AlertCircle,
  CheckCircle,
  FileText,
  Zap,
  Loader2,
  Phone,
  Building,
  ClipboardList,
  Users,
  X,
  ArrowRight
} from 'lucide-react';

interface Customer {
  id: number;
  accountNumber: string;
  meterNumber: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  connectionType: string;
  averageMonthlyUsage: string;
}

interface MeterReading {
  readingId: number;
  unitsConsumed: number;
  previousReading: number;
  currentReading: number;
}

function MeterReadingFormInner() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Three-tab system state
  const [activeTab, setActiveTab] = useState<'work-orders' | 'all-customers' | 'enter-reading'>('work-orders');
  const [workOrders, setWorkOrders] = useState<any[]>([]);
  const [loadingWorkOrders, setLoadingWorkOrders] = useState(false);

  // All Customers tab state
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerStats, setCustomerStats] = useState<any>(null);
  const [pagination, setPagination] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [lastReading, setLastReading] = useState<number | null>(null);
  const [lastReadingDate, setLastReadingDate] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalCustomer, setModalCustomer] = useState<any>(null);

  const [readingData, setReadingData] = useState({
    currentReading: '',
    readingDate: new Date().toISOString().split('T')[0],
    readingTime: new Date().toTimeString().slice(0, 5),
    meterCondition: 'good',
    accessibility: 'accessible',
    notes: '',
  });

  const [autoGenerateBill, setAutoGenerateBill] = useState(true);
  const [errors, setErrors] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [generatingBill, setGeneratingBill] = useState(false);
  const [billGenerated, setBillGenerated] = useState<any>(null);
  const [savedReading, setSavedReading] = useState<MeterReading | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Load customer from URL parameters (from work orders or bill generation page)
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    const customerName = searchParams.get('customerName');
    const accountNumber = searchParams.get('accountNumber');
    const workOrderId = searchParams.get('workOrderId');

    if (customerId && customerName && accountNumber) {
      // Pre-fill customer from URL params
      setSelectedCustomer({
        id: parseInt(customerId),
        fullName: decodeURIComponent(customerName),
        accountNumber: decodeURIComponent(accountNumber),
        meterNumber: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        connectionType: '',
        averageMonthlyUsage: ''
      });
      
      // Set modal customer with work order ID if provided
      if (workOrderId) {
        setModalCustomer({
          id: parseInt(customerId),
          fullName: decodeURIComponent(customerName),
          accountNumber: decodeURIComponent(accountNumber),
          workOrderId: parseInt(workOrderId)
        });
      }
      
      // Fetch full customer details and last reading
      fetchCustomerById(parseInt(customerId));
    }
  }, [searchParams]);

  // Fetch data when switching tabs
  useEffect(() => {
    console.log('[Tab Switch] Active tab changed to:', activeTab);
    if (activeTab === 'work-orders') {
      console.log('[Tab Switch] Fetching work orders...');
      fetchWorkOrders();
    } else if (activeTab === 'all-customers') {
      console.log('[Tab Switch] Fetching customers without reading...');
      fetchCustomersWithoutReading();
    }
    // Note: enter-reading tab does NOT fetch customers - it only shows form when customer is pre-selected
  }, [activeTab]);

  // Fetch customers when search changes (ONLY for All Customers tab)
  useEffect(() => {
    if (activeTab === 'all-customers') {
      const timeoutId = setTimeout(() => {
        setCurrentPage(1); // Reset to first page when searching
        fetchCustomersWithoutReading(1);
      }, 300); // Reduced debounce time for better responsiveness

      return () => clearTimeout(timeoutId);
    }
  }, [customerSearch, activeTab]);

  // Fetch customers without current month reading
  const fetchCustomersWithoutReading = async (page: number = 1) => {
    console.log('[fetchCustomersWithoutReading] Called with page:', page, 'loadingCustomers:', loadingCustomers);
    if (loadingCustomers) return; // Prevent multiple simultaneous calls
    
    try {
      setLoadingCustomers(true);
      console.log('[fetchCustomersWithoutReading] Making API call...');
      const response = await fetch(`/api/customers/without-reading?search=${encodeURIComponent(customerSearch)}&page=${page}&limit=20`);
      console.log('[Frontend] Fetching customers without reading...');
      console.log('[Frontend] Search query:', customerSearch);
      console.log('[Frontend] Page:', page);
      
      if (response.ok) {
        const result = await response.json();
        console.log('[Frontend] API Response:', result);
        console.log('[Frontend] Customers count:', result.data?.length || 0);
        console.log('[Frontend] Stats:', result.stats);
        console.log('[Frontend] Pagination:', result.pagination);
        
        if (result.success) {
          console.log('[Frontend] Setting customers data:', result.data);
          console.log('[Frontend] Customers count:', result.data?.length);
          setAllCustomers(result.data || []);
          setCustomerStats(result.stats);
          setPagination(result.pagination);
          setCurrentPage(page);
          console.log('[Frontend] State updated - allCustomers length:', result.data?.length || 0);
        } else {
          console.error('[Frontend] API returned error:', result.error);
        }
      } else {
        const errorText = await response.text();
        console.error('[Frontend] API Error:', response.status, response.statusText, errorText);
      }
    } catch (error) {
      console.error('Error fetching customers without reading:', error);
    } finally {
      setLoadingCustomers(false);
    }
  };

  // Fetch work orders for employee
  const fetchWorkOrders = async () => {
    try {
      setLoadingWorkOrders(true);
      const response = await fetch('/api/work-orders?workType=meter_reading&status=assigned,in_progress');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Sort work orders by creation date (oldest first - FIFO)
          const sortedWorkOrders = (result.data || []).sort((a: any, b: any) => {
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          });
          setWorkOrders(sortedWorkOrders);
        }
      }
    } catch (error) {
      console.error('Error fetching work orders:', error);
    } finally {
      setLoadingWorkOrders(false);
    }
  };

  // Handle work order click - redirect to meter reading with customer info
  const handleWorkOrderClick = (workOrder: any) => {
    const customer = {
      id: workOrder.customerId,
      fullName: workOrder.customerName,
      accountNumber: workOrder.customerAccount,
      meterNumber: workOrder.meterNumber,
      phone: workOrder.customerPhone,
      address: workOrder.customerAddress,
      city: workOrder.customerCity,
      state: workOrder.customerState || '', // Add missing state property
      connectionType: 'residential', // Default
      averageMonthlyUsage: '0'
    };
    
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  // Fetch customer by ID (from URL params)
  const fetchCustomerById = async (customerId: number) => {
    try {
      const response = await fetch(`/api/customers?id=${customerId}`);
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          const customer = result.data[0];
          setSelectedCustomer(customer);
          await fetchLastReading(customer.id);
        }
      }
    } catch (error) {
      console.error('Error fetching customer:', error);
    }
  };

  // Real customer search with API
  const handleCustomerSearch = async () => {
    // Validate search query
    if (!searchQuery || searchQuery.trim().length < 3) {
      setErrors({ search: 'Please enter at least 3 characters to search' });
      setSelectedCustomer(null);
      return;
    }

    try {
      setSearching(true);
      setErrors({});

      const response = await fetch(`/api/customers?search=${encodeURIComponent(searchQuery.trim())}&limit=1`);

      if (!response.ok) {
        throw new Error('Failed to search customer');
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const customer = result.data[0];
        setSelectedCustomer(customer);

        // Fetch last meter reading for this customer
        await fetchLastReading(customer.id);

        setErrors({});
      } else {
        setSelectedCustomer(null);
        setLastReading(null);
        setLastReadingDate(null);
        setErrors({ search: 'No customer found with this information' });
      }
    } catch (error: any) {
      console.error('Customer search error:', error);
      setErrors({ search: error.message || 'Failed to search customer' });
      setSelectedCustomer(null);
    } finally {
      setSearching(false);
    }
  };

  // Fetch last meter reading for customer
  const fetchLastReading = async (customerId: number) => {
    try {
      const response = await fetch(`/api/meter-readings?customerId=${customerId}&limit=1`);

      if (!response.ok) {
        // No previous readings - that's okay for new customers
        setLastReading(0);
        setLastReadingDate(null);
        return;
      }

      const result = await response.json();

      if (result.success && result.data && result.data.length > 0) {
        const reading = result.data[0];
        setLastReading(parseFloat(reading.currentReading));
        setLastReadingDate(reading.readingDate);
      } else {
        // No previous readings
        setLastReading(0);
        setLastReadingDate(null);
      }
    } catch (error) {
      console.error('Error fetching last reading:', error);
      setLastReading(0);
      setLastReadingDate(null);
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: any = {};

    if (!selectedCustomer && !modalCustomer) {
      newErrors.customer = 'Please select a customer first';
    }

    if (!readingData.currentReading) {
      newErrors.currentReading = 'Current reading is required';
    } else if (isNaN(Number(readingData.currentReading))) {
      newErrors.currentReading = 'Reading must be a valid number';
    } else if (Number(readingData.currentReading) < 0) {
      newErrors.currentReading = 'Reading cannot be negative';
    } else if (lastReading !== null && Number(readingData.currentReading) < lastReading) {
      // Professional warning for lower readings (not blocking)
      console.log(`⚠️  WARNING: Current reading (${readingData.currentReading}) is less than previous reading (${lastReading})`);
      console.log(`This is normal for: meter replacement, rollover, seasonal usage, or meter repair`);
      // Allow the submission - this is a valid professional scenario
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit meter reading
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const customer = modalCustomer || selectedCustomer;
    if (!customer) {
      alert('No customer selected');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitting(true);
      setErrors({});
      setSubmitSuccess('');

      const response = await fetch('/api/meter-readings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customer.id,
          currentReading: readingData.currentReading,
          meterCondition: readingData.meterCondition,
          accessibility: readingData.accessibility,
          notes: readingData.notes,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit reading');
      }

      // Success!
      setSavedReading({
        readingId: result.data.readingId,
        unitsConsumed: result.data.unitsConsumed,
        previousReading: lastReading || 0,
        currentReading: parseFloat(readingData.currentReading),
      });

      // Auto-generate bill if enabled
      if (autoGenerateBill) {
        await handleGenerateBill();
      } else {
        setShowSuccess(true);
      }

      // Complete any pending work orders for this customer (meter_reading type)
      try {
        // If modal customer has workOrderId, complete that specific work order
        if (modalCustomer?.workOrderId) {
          await fetch(`/api/work-orders/${modalCustomer.workOrderId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              status: 'completed',
              completionNotes: `Meter reading completed. Reading: ${readingData.currentReading} kWh. ${autoGenerateBill ? 'Bill auto-generated.' : 'Bill not generated.'}`
            }),
          });
        } else {
          // Otherwise complete all pending work orders for this customer
          const woResponse = await fetch(`/api/work-orders?customerId=${customer.id}&workType=meter_reading&status=assigned,in_progress`);
          if (woResponse.ok) {
            const woResult = await woResponse.json();
            if (woResult.success && woResult.data && woResult.data.length > 0) {
              for (const wo of woResult.data) {
                await fetch(`/api/work-orders/${wo.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    status: 'completed',
                    completionNotes: `Meter reading completed. Reading: ${readingData.currentReading} kWh. ${autoGenerateBill ? 'Bill auto-generated.' : 'Bill not generated.'}`
                  }),
                });
              }
            }
          }
        }
      } catch (woError) {
        console.error('Error completing work orders:', woError);
        // Don't fail the whole operation if work order update fails
      }

      // ✅ CRITICAL: Refresh BOTH work orders and all customers lists
      console.log('[Submit Success] Refreshing both tabs after bill generation...');
      console.log('[Submit Success] Customer should disappear from all lists now');

      await Promise.all([
        fetchWorkOrders(),
        fetchCustomersWithoutReading(currentPage)
      ]);

      console.log('[Submit Success] Both lists refreshed - customer removed');

      // Reset form and clear selected customer (for Enter Reading tab)
      setSelectedCustomer(null);
      setLastReading(null);
      setLastReadingDate(null);
      setReadingData({
        currentReading: '',
        readingDate: new Date().toISOString().split('T')[0],
        readingTime: new Date().toTimeString().slice(0, 5),
        meterCondition: '',
        accessibility: '',
        notes: ''
      });
      setErrors({});
      setSubmitSuccess('Meter reading recorded and bill generated successfully!');

      // Clear success message after 5 seconds
      setTimeout(() => {
        setSubmitSuccess('');
      }, 5000);

    } catch (error: any) {
      console.error('Meter reading submission error:', error);
      setErrors({ submit: error.message || 'Failed to submit meter reading' });
    } finally {
      setIsSubmitting(false);
      setSubmitting(false);
    }
  };

  // Generate bill
  const handleGenerateBill = async () => {
    if (!selectedCustomer && !modalCustomer) return;

    const customerId = selectedCustomer?.id || modalCustomer?.id;
    const readingDate = readingData.readingDate;

    setGeneratingBill(true);
    try {
      // Format billing month correctly as YYYY-MM-01
      const dateObj = new Date(readingDate);
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const billingMonth = `${year}-${month}-01`;

      console.log('[Bill Generation] Request:', { customerId, billingMonth, readingDate });

      const response = await fetch('/api/bills/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: customerId,
          billingMonth: billingMonth
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setBillGenerated(data.bill);
        setShowSuccess(true); // Show success modal when bill is auto-generated
      } else {
        alert(data.error || 'Failed to generate bill');
      }
    } catch (error) {
      console.error('Bill generation error:', error);
      alert('Failed to generate bill. Please try again.');
    } finally {
      setGeneratingBill(false);
    }
  };

  // Reset form
  const handleReset = async () => {
    setShowSuccess(false);
    setBillGenerated(null);
    setSavedReading(null);
    setSelectedCustomer(null);
    setLastReading(null);
    setLastReadingDate(null);
    setReadingData({
      currentReading: '',
      readingDate: new Date().toISOString().split('T')[0],
      readingTime: new Date().toTimeString().slice(0, 5),
      meterCondition: 'good',
      accessibility: 'accessible',
      notes: '',
    });
    setSearchQuery('');
    setErrors({});

    // ✅ CRITICAL: Refresh BOTH tabs simultaneously (not just active tab)
    console.log('[Reset] Refreshing both work orders and all customers...');
    await Promise.all([
      fetchCustomersWithoutReading(currentPage),
      fetchWorkOrders()
    ]);
    console.log('[Reset] Both lists refreshed successfully');
  };

  // Calculate consumption
  const calculateConsumption = () => {
    if (lastReading !== null && readingData.currentReading) {
      const current = Number(readingData.currentReading);
      return current - lastReading;
    }
    return 0;
  };

  return (
    <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4 py-2">
            {/* Header */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Meter Reading Entry</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Record customer meter readings accurately</p>
                </div>
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl flex items-center justify-center">
                  <Gauge className="w-7 h-7 text-white" />
                </div>
              </div>
            </div>

            {/* Three-Tab System */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center space-x-2 p-1 bg-gray-100 dark:bg-white/5 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab('work-orders')}
                  className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                    activeTab === 'work-orders'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <ClipboardList className="w-4 h-4" />
                  <span>My Work Orders ({workOrders.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab('all-customers')}
                  className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                    activeTab === 'all-customers'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>All Customers</span>
                </button>
                <button
                  onClick={() => setActiveTab('enter-reading')}
                  className={`px-6 py-2.5 rounded-lg font-semibold transition-all flex items-center space-x-2 ${
                    activeTab === 'enter-reading'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Gauge className="w-4 h-4" />
                  <span>Enter Reading</span>
                </button>
              </div>

              {/* Work Orders Tab Content */}
              {activeTab === 'work-orders' && (
                <div className="mt-4">
                  {loadingWorkOrders ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                      <span className="ml-2 text-gray-600 dark:text-gray-400">Loading work orders...</span>
                    </div>
                  ) : workOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Pending Work Orders</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">All assigned tasks are completed.</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Switch to "All Customers" tab to find customers needing readings</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* Queue Header */}
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <p className="text-sm text-blue-400 font-semibold">
                            Processing Queue ({workOrders.length} requests)
                          </p>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Requests are sorted by arrival time - process in order
                        </p>
                      </div>
                      
                      {workOrders.map((wo: any, index: number) => (
                        <div
                          key={wo.id}
                          className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-blue-500/20 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                                  #{index + 1}
                                </span>
                                <span className="text-sm font-mono text-blue-400">WO-{wo.id}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  wo.priority === 'high' ? 'bg-red-500/20 text-red-400' :
                                  wo.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {wo.priority?.toUpperCase()}
                                </span>
                              </div>
                              <p className="text-gray-900 dark:text-white font-semibold">{wo.customerName || 'Unknown Customer'}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Account: {wo.customerAccount || 'N/A'}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Meter: {wo.meterNumber || 'N/A'}</p>
                              {wo.description && (
                                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{wo.description}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();

                                  console.log('[Process Request] Work Order:', wo);
                                  console.log('[Process Request] Customer ID:', wo.customerId);
                                  console.log('[Process Request] Customer Name:', wo.customerName);

                                  // Fetch customer details and last reading
                                  const custResponse = await fetch(`/api/customers?customerId=${wo.customerId}`);
                                  if (custResponse.ok) {
                                    const custResult = await custResponse.json();
                                    console.log('[Process Request] Customer API Response:', custResult);

                                    if (custResult.success && custResult.data && custResult.data.length > 0) {
                                      const customer = custResult.data[0];
                                      console.log('[Process Request] Customer Data:', customer);

                                      // Fetch last reading
                                      const readingResponse = await fetch(`/api/meter-readings?customerId=${wo.customerId}&limit=1`);
                                      let lastRead = 0;
                                      let lastDate = null;
                                      if (readingResponse.ok) {
                                        const readingResult = await readingResponse.json();
                                        if (readingResult.success && readingResult.data && readingResult.data.length > 0) {
                                          lastRead = parseFloat(readingResult.data[0].currentReading);
                                          lastDate = readingResult.data[0].readingDate;
                                        }
                                      }

                                      console.log('[Process Request] Setting customer:', customer.fullName);
                                      console.log('[Process Request] Last Reading:', lastRead);

                                      // Set customer data for Enter Reading tab
                                      setSelectedCustomer({ ...customer, workOrderId: wo.id });
                                      setLastReading(lastRead);
                                      setLastReadingDate(lastDate);

                                      // Reset form
                                      setReadingData({
                                        currentReading: '',
                                        readingDate: new Date().toISOString().split('T')[0],
                                        readingTime: new Date().toTimeString().slice(0, 5),
                                        meterCondition: 'good',
                                        accessibility: 'accessible',
                                        notes: '',
                                      });
                                      setErrors({});
                                      setSubmitSuccess('');

                                      // Switch to Enter Reading tab
                                      console.log('[Process Request] Switching to enter-reading tab');
                                      setActiveTab('enter-reading');
                                    }
                                  } else {
                                    console.error('[Process Request] Failed to fetch customer');
                                  }
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center space-x-2"
                              >
                                <Gauge className="w-4 h-4" />
                                <span>Process Request</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* All Customers Tab Content */}
              {activeTab === 'all-customers' && (
                <div className="mt-4">
                  {/* Stats Banner */}
                  {customerStats && (
                    <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Total Customers</p>
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{customerStats.totalCustomers}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">With Reading</p>
                          <p className="text-2xl font-bold text-green-400">{customerStats.customersWithReading || 0}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">Without Reading</p>
                          <p className="text-2xl font-bold text-orange-400">{customerStats.customersWithoutReading || 0}</p>
                        </div>
                      </div>
                      <div className="mt-2 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          📊 Stats update automatically when readings are entered
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Search Box */}
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={(e) => setCustomerSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchCustomersWithoutReading()}
                        placeholder="Search by name, account, or meter number..."
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors"
                      />
                    </div>
                  </div>

                  {loadingCustomers ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-green-500" />
                      <span className="ml-3 text-gray-600 dark:text-gray-400">Loading customers...</span>
                    </div>
                  ) : allCustomers.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-10 h-10 text-green-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">All Meter Readings Complete!</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        All {customerStats?.totalCustomers || 0} active customers have meter readings for {customerStats?.currentMonth ? new Date(customerStats.currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'this month'}.
                      </p>
                      <div className="inline-flex items-center px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                        <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                          This list will repopulate next month when new readings are needed
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      
                      {allCustomers.map((customer: any) => (
                        <div
                          key={customer.id}
                          className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/30 rounded-xl p-4 cursor-pointer hover:shadow-lg hover:shadow-orange-500/20 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-gray-900 dark:text-white font-semibold">{customer.fullName}</p>
                              <div className="flex items-center space-x-4 mt-1">
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Account:</span> {customer.accountNumber}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  <span className="font-medium">Meter:</span> {customer.meterNumber}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();

                                  // Fetch last reading for this customer
                                  const readingResponse = await fetch(`/api/meter-readings?customerId=${customer.id}&limit=1`);
                                  let lastRead = 0;
                                  let lastDate = null;
                                  if (readingResponse.ok) {
                                    const readingResult = await readingResponse.json();
                                    if (readingResult.success && readingResult.data && readingResult.data.length > 0) {
                                      lastRead = parseFloat(readingResult.data[0].currentReading);
                                      lastDate = readingResult.data[0].readingDate;
                                    }
                                  }

                                  // Set customer data for Enter Reading tab
                                  setSelectedCustomer(customer);
                                  setLastReading(lastRead);
                                  setLastReadingDate(lastDate);

                                  // Reset form
                                  setReadingData({
                                    currentReading: '',
                                    readingDate: new Date().toISOString().split('T')[0],
                                    readingTime: new Date().toTimeString().slice(0, 5),
                                    meterCondition: 'good',
                                    accessibility: 'accessible',
                                    notes: '',
                                  });
                                  setErrors({});
                                  setSubmitSuccess('');

                                  // Switch to Enter Reading tab
                                  setActiveTab('enter-reading');
                                }}
                                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-semibold hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center space-x-2"
                              >
                                <Gauge className="w-4 h-4" />
                                <span>Select Customer</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Pagination Controls */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-6">
                      <button
                        onClick={() => fetchCustomersWithoutReading(currentPage - 1)}
                        disabled={!pagination.hasPrev || loadingCustomers}
                        className="px-3 py-2 bg-white/10 border border-white/20 text-gray-900 dark:text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          const pageNum = i + 1;
                          return (
                            <button
                              key={pageNum}
                              onClick={() => fetchCustomersWithoutReading(pageNum)}
                              disabled={loadingCustomers}
                              className={`px-3 py-2 rounded-lg transition-all ${
                                currentPage === pageNum
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                                  : 'bg-white/10 border border-white/20 text-gray-900 dark:text-white hover:bg-white/20'
                              } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => fetchCustomersWithoutReading(currentPage + 1)}
                        disabled={!pagination.hasNext || loadingCustomers}
                        className="px-3 py-2 bg-white/10 border border-white/20 text-gray-900 dark:text-white rounded-lg hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                  
                  {/* Pagination Info */}
                  {pagination && (
                    <div className="text-center mt-4 text-sm text-gray-600 dark:text-gray-400">
                      Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, pagination.total)} of {pagination.total} customers
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Success Message - Reading Saved */}
            {showSuccess && !billGenerated && !autoGenerateBill && savedReading && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-xl rounded-2xl p-4 border border-green-500/50">
                <div className="flex items-center space-x-3 mb-3">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                  <div>
                    <h3 className="text-white font-semibold text-base">Reading Submitted Successfully!</h3>
                    <p className="text-gray-300 text-xs">
                      Consumption: {savedReading.unitsConsumed.toFixed(2)} kWh
                      ({savedReading.previousReading} → {savedReading.currentReading} kWh)
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleGenerateBill}
                    disabled={generatingBill}
                    className={`px-4 py-2 text-sm bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg transition-all font-medium flex items-center space-x-2 ${
                      generatingBill
                        ? 'opacity-70 cursor-not-allowed'
                        : 'hover:shadow-lg hover:shadow-blue-500/50'
                    }`}
                  >
                    {generatingBill ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Bill...</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        <span>Generate Bill Now</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-white hover:bg-white/20 transition-all font-medium"
                  >
                    Record Another Reading
                  </button>
                </div>
              </div>
            )}

            {/* Auto-Generating Bill Message */}
            {showSuccess && !billGenerated && autoGenerateBill && generatingBill && (
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl rounded-2xl p-4 border border-blue-500/50">
                <div className="flex items-center space-x-3">
                  <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                  <div>
                    <h3 className="text-white font-semibold text-base">Auto-Generating Bill...</h3>
                    <p className="text-gray-300 text-xs">Reading saved successfully. Creating customer bill automatically...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Bill Generated Success */}
            {billGenerated && (
              <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl rounded-2xl p-4 border border-blue-500/50">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-blue-400" />
                  <div>
                    <h3 className="text-white font-semibold text-base">Bill Generated Successfully!</h3>
                    <p className="text-gray-300 text-xs">Customer bill has been created and is now available for viewing.</p>
                  </div>
                </div>

                {/* Bill Details */}
                <div className="bg-white/5 backdrop-blur-sm rounded-lg p-3 border border-white/10 mb-3">
                  <h4 className="text-white font-semibold text-sm mb-3">Bill Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Bill Number</p>
                      <p className="text-white font-semibold text-xs">{billGenerated.bill_number}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Units Consumed</p>
                      <p className="text-white font-semibold text-xs">{billGenerated.units_consumed} kWh</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Total Amount</p>
                      <p className="text-green-400 font-bold text-xs">₹{billGenerated.total_amount}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Due Date</p>
                      <p className="text-white font-semibold text-xs">{new Date(billGenerated.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleReset}
                  className="px-4 py-2 text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all font-medium flex items-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Record Another Reading</span>
                </button>
              </div>
            )}

            {/* Enter Reading Tab Content - SIMPLIFIED (NO customer list, ONLY form or select message) */}
            {activeTab === 'enter-reading' && (
              <div className="mt-4">
                <div className="max-w-4xl mx-auto">
                  {!selectedCustomer ? (
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-2xl p-12 border border-purple-500/30 text-center">
                      <div className="max-w-2xl mx-auto">
                        <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/50">
                          <Gauge className="w-10 h-10 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                          Ready to Enter Meter Reading
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-8">
                          To enter a meter reading, please select a customer from one of the tabs below:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                          <button
                            onClick={() => setActiveTab('work-orders')}
                            className="group p-6 bg-white dark:bg-white/5 rounded-xl border-2 border-green-500/30 hover:border-green-500 transition-all text-left hover:shadow-lg hover:shadow-green-500/20"
                          >
                            <ClipboardList className="w-8 h-8 text-green-500 mb-3" />
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">My Work Orders</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              Process customer-requested meter readings (priority queue)
                            </p>
                            <div className="flex items-center text-green-500 text-sm font-semibold">
                              <span>View Work Orders</span>
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>

                          <button
                            onClick={() => setActiveTab('all-customers')}
                            className="group p-6 bg-white dark:bg-white/5 rounded-xl border-2 border-green-500/30 hover:border-green-500 transition-all text-left hover:shadow-lg hover:shadow-green-500/20"
                          >
                            <Users className="w-8 h-8 text-green-500 mb-3" />
                            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">All Customers</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              Browse and search all customers without bills for this month
                            </p>
                            <div className="flex items-center text-green-500 text-sm font-semibold">
                              <span>Browse Customers</span>
                              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </div>
                          </button>
                        </div>

                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                          <p className="text-sm text-blue-400 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            <span>Select a customer from either tab, then return here to enter the reading</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-purple-500/30">
                      {/* Customer Info Header */}
                      <div className="mb-6 pb-4 border-b border-purple-500/20">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center">
                                <User className="w-5 h-5 mr-2 text-purple-400" />
                                {selectedCustomer.fullName}
                              </h3>
                              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {selectedCustomer.accountNumber}
                                </div>
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                  <Gauge className="w-3 h-3 mr-1" />
                                  {selectedCustomer.meterNumber}
                                </div>
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {selectedCustomer.city}
                                </div>
                                <div className="flex items-center text-gray-600 dark:text-gray-400">
                                  <Phone className="w-3 h-3 mr-1" />
                                  {selectedCustomer.phone}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedCustomer(null)}
                              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>

                          {lastReading !== null && (
                            <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                              <p className="text-xs text-gray-600 dark:text-gray-400">Last Reading</p>
                              <p className="text-2xl font-bold text-purple-400">{lastReading} kWh</p>
                              {lastReadingDate && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {new Date(lastReadingDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Meter Reading Form */}
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Enter Meter Reading</h3>

                          {/* Current Reading */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Current Reading (kWh) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={readingData.currentReading}
                              onChange={(e) => {
                                setReadingData({ ...readingData, currentReading: e.target.value });
                                if (errors.currentReading) {
                                  setErrors({ ...errors, currentReading: '' });
                                }
                              }}
                              placeholder={lastReading ? `Must be greater than ${lastReading}` : 'Enter current reading'}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                            />
                            {errors.currentReading && (
                              <p className="text-red-400 text-xs mt-1 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors.currentReading}
                              </p>
                            )}
                          </div>

                          {/* Reading Date */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Reading Date *
                            </label>
                            <input
                              type="date"
                              value={readingData.readingDate}
                              onChange={(e) => {
                                setReadingData({ ...readingData, readingDate: e.target.value });
                                if (errors.readingDate) {
                                  setErrors({ ...errors, readingDate: '' });
                                }
                              }}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                            />
                            {errors.readingDate && (
                              <p className="text-red-400 text-xs mt-1 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors.readingDate}
                              </p>
                            )}
                          </div>

                          {/* Reading Time */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Reading Time *
                            </label>
                            <input
                              type="time"
                              value={readingData.readingTime}
                              onChange={(e) => {
                                setReadingData({ ...readingData, readingTime: e.target.value });
                                if (errors.readingTime) {
                                  setErrors({ ...errors, readingTime: '' });
                                }
                              }}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all"
                            />
                            {errors.readingTime && (
                              <p className="text-red-400 text-xs mt-1 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors.readingTime}
                              </p>
                            )}
                          </div>

                          {/* Meter Condition */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Meter Condition *
                            </label>
                            <select
                              value={readingData.meterCondition}
                              onChange={(e) => {
                                setReadingData({ ...readingData, meterCondition: e.target.value });
                                if (errors.meterCondition) {
                                  setErrors({ ...errors, meterCondition: '' });
                                }
                              }}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
                            >
                              <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Select condition</option>
                              <option value="good" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Good - Working properly</option>
                              <option value="fair" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Fair - Minor issues</option>
                              <option value="poor" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Poor - Needs attention</option>
                              <option value="damaged" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Damaged - Requires replacement</option>
                            </select>
                            {errors.meterCondition && (
                              <p className="text-red-400 text-xs mt-1 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors.meterCondition}
                              </p>
                            )}
                          </div>

                          {/* Accessibility */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Meter Accessibility *
                            </label>
                            <select
                              value={readingData.accessibility}
                              onChange={(e) => {
                                setReadingData({ ...readingData, accessibility: e.target.value });
                                if (errors.accessibility) {
                                  setErrors({ ...errors, accessibility: '' });
                                }
                              }}
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
                            >
                              <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Select accessibility</option>
                              <option value="easy" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Easy Access</option>
                              <option value="moderate" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Moderate Access</option>
                              <option value="difficult" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Difficult Access</option>
                              <option value="restricted" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Restricted Access</option>
                            </select>
                            {errors.accessibility && (
                              <p className="text-red-400 text-xs mt-1 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                {errors.accessibility}
                              </p>
                            )}
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                              Notes (Optional)
                            </label>
                            <textarea
                              value={readingData.notes}
                              onChange={(e) => setReadingData({ ...readingData, notes: e.target.value })}
                              rows={3}
                              placeholder="Any additional observations or comments..."
                              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all resize-none"
                            />
                          </div>

                          {/* Success Message */}
                          {submitSuccess && (
                            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-start space-x-3">
                              <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-green-400">Success!</p>
                                <p className="text-xs text-green-300 mt-1">{submitSuccess}</p>
                              </div>
                            </div>
                          )}

                          {/* Error Message */}
                          {errors.submit && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3">
                              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-red-400">Error</p>
                                <p className="text-xs text-red-300 mt-1">{errors.submit}</p>
                              </div>
                            </div>
                          )}

                          {/* Submit Button */}
                          <div className="pt-4">
                            <button
                              onClick={handleSubmit}
                              disabled={submitting}
                              className={`w-full py-3 px-6 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2 ${
                                submitting
                                  ? 'bg-gray-400 cursor-not-allowed'
                                  : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:shadow-lg hover:shadow-purple-500/50 text-white'
                              }`}
                            >
                              {submitting ? (
                                <>
                                  <Loader2 className="w-5 h-5 animate-spin" />
                                  <span>Processing...</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-5 h-5" />
                                  <span>Submit & Generate Bill</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  }
                </div>
              </div>
            )}

            {/* Customer Search - Only show in All Customers tab */}
            {false && activeTab === 'all-customers' && (
              <>
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10">
                  <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Customer Search</h2>
                  <div className="flex space-x-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          if (selectedCustomer) {
                            setSelectedCustomer(null);
                            setLastReading(null);
                            setLastReadingDate(null);
                          }
                          if (errors.search) {
                            setErrors({});
                          }
                        }}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleCustomerSearch();
                          }
                        }}
                        placeholder="Enter account number, meter number, or customer name (min 3 chars)"
                        disabled={searching}
                        className="w-full pl-10 pr-3 py-2 text-sm bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors disabled:opacity-50"
                      />
                    </div>
                    <button
                      onClick={handleCustomerSearch}
                      disabled={!searchQuery || searchQuery.trim().length < 3 || searching}
                      className={`px-4 py-2 text-sm bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg font-medium transition-all flex items-center space-x-2 ${
                        !searchQuery || searchQuery.trim().length < 3 || searching
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:shadow-lg hover:shadow-orange-500/50'
                      }`}
                    >
                      {searching ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Searching...</span>
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          <span>Search</span>
                        </>
                      )}
                    </button>
                  </div>
                  {errors.search && (
                    <p className="text-red-400 text-xs mt-2 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      {errors.search}
                    </p>
                  )}
                </div>

                {/* Customer Information */}
                {selectedCustomer && (
                  <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-4 border border-green-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-base font-bold text-gray-900 dark:text-white">Customer Information</h2>
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <User className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-400 text-xs">Customer Name</p>
                            <p className="text-white font-semibold text-sm">{selectedCustomer?.fullName}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-400 text-xs">Account Number</p>
                            <p className="text-white font-semibold text-sm">{selectedCustomer?.accountNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-400 text-xs">Phone</p>
                            <p className="text-white font-semibold text-sm">{selectedCustomer?.phone}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-400 text-xs">Address</p>
                            <p className="text-white text-sm">{selectedCustomer?.address}, {selectedCustomer?.city}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <Gauge className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-400 text-xs">Meter Number</p>
                            <p className="text-white font-semibold text-sm">{selectedCustomer?.meterNumber}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Building className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-400 text-xs">Connection Type</p>
                            <p className="text-white font-semibold text-sm">{selectedCustomer?.connectionType}</p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Zap className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-400 text-xs">Last Reading</p>
                            <p className="text-white font-semibold text-sm">
                              {lastReading !== null ? `${lastReading} kWh` : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-start space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-gray-400 text-xs">Last Reading Date</p>
                            <p className="text-white text-sm">
                              {lastReadingDate ? new Date(lastReadingDate as string).toLocaleDateString() : 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reading Form */}
                {selectedCustomer && !showSuccess && (
                  <form onSubmit={handleSubmit} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10 space-y-4">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3">Meter Reading Details</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Current Reading */}
                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">Current Reading (kWh) *</label>
                        <input
                          type="text"
                          value={readingData.currentReading}
                          onChange={(e) => {
                            setReadingData({ ...readingData, currentReading: e.target.value });
                            // Clear error when user types
                            if (errors.currentReading) {
                              setErrors({ ...errors, currentReading: undefined });
                            }
                          }}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
                          placeholder="Enter current meter reading"
                        />
                        {errors.currentReading && (
                          <p className="text-red-400 text-xs mt-1 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {errors.currentReading}
                          </p>
                        )}
                        {readingData.currentReading && !errors.currentReading && lastReading !== null && (
                          <div className="mt-2 p-2 bg-green-500/20 rounded-lg border border-green-500/50">
                            <p className="text-green-400 text-xs">
                              Consumption: {calculateConsumption()} kWh
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Reading Date */}
                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">Reading Date *</label>
                        <input
                          type="date"
                          value={readingData.readingDate}
                          onChange={(e) => setReadingData({ ...readingData, readingDate: e.target.value })}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400 transition-colors"
                        />
                      </div>

                      {/* Reading Time */}
                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">Reading Time *</label>
                        <input
                          type="time"
                          value={readingData.readingTime}
                          onChange={(e) => setReadingData({ ...readingData, readingTime: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400 transition-colors"
                        />
                      </div>

                      {/* Meter Condition */}
                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">Meter Condition</label>
                        <select
                          value={readingData.meterCondition}
                          onChange={(e) => setReadingData({ ...readingData, meterCondition: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400 transition-colors font-medium"
                        >
                          <option value="good" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Good</option>
                          <option value="fair" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Fair</option>
                          <option value="poor" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Poor - Needs Replacement</option>
                          <option value="damaged" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Damaged</option>
                        </select>
                      </div>

                      {/* Accessibility */}
                      <div>
                        <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">Meter Accessibility</label>
                        <select
                          value={readingData.accessibility}
                          onChange={(e) => setReadingData({ ...readingData, accessibility: e.target.value })}
                          className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400 transition-colors font-medium"
                        >
                          <option value="accessible" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Accessible</option>
                          <option value="restricted" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Restricted Access</option>
                          <option value="inaccessible" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Inaccessible</option>
                        </select>
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="text-xs text-gray-700 dark:text-gray-300 mb-1 block">Notes (Optional)</label>
                      <textarea
                        value={readingData.notes}
                        onChange={(e) => setReadingData({ ...readingData, notes: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors resize-none"
                        rows={2}
                        placeholder="Add any additional notes or observations..."
                      />
                    </div>

                    {/* Auto-Generate Bill Option */}
                    <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <label className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoGenerateBill}
                          onChange={(e) => setAutoGenerateBill(e.target.checked)}
                          className="w-5 h-5 text-blue-500 rounded focus:ring-blue-400 focus:ring-2 mt-0.5"
                        />
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-blue-400" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">Auto-Generate Bill</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            Automatically generate customer bill immediately after saving the meter reading. If disabled, you can manually generate the bill later.
                          </p>
                        </div>
                      </label>
                    </div>

                    {/* Submit Button */}
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setLastReading(null);
                          setLastReadingDate(null);
                          setErrors({});
                        }}
                        className="px-4 py-2 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-white/20 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className={`px-6 py-2 text-sm bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg transition-all font-medium flex items-center space-x-2 ${
                          isSubmitting
                            ? 'opacity-70 cursor-not-allowed'
                            : 'hover:shadow-lg hover:shadow-green-500/50'
                        }`}
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Submitting...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Submit Reading</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* METER READING MODAL */}
      {showModal && modalCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-white/10">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-500 p-5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <Gauge className="w-6 h-6" />
                  <span>Enter Meter Reading</span>
                </h2>
                <p className="text-white/90 text-sm mt-1">{modalCustomer.fullName}</p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalCustomer(null);
                  setErrors({});
                }}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-white" />
              </button>
            </div>

            {/* Customer Info Banner */}
            <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-b border-blue-500/30 p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Account Number</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{modalCustomer.accountNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Meter Number</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{modalCustomer.meterNumber}</p>
                </div>
                {lastReading !== null && lastReading > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Previous Reading</p>
                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">{lastReading ?? 0} kWh</p>
                    {lastReadingDate && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {new Date(lastReadingDate as string).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Current Reading */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Current Reading (kWh) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  value={readingData.currentReading}
                  onChange={(e) => setReadingData({ ...readingData, currentReading: e.target.value })}
                  onWheel={(e) => e.currentTarget.blur()}
                  onKeyDown={(e) => {
                    // Prevent +, -, e, E characters
                    if (['+', '-', 'e', 'E'].includes(e.key)) {
                      e.preventDefault();
                    }
                  }}
                  placeholder="e.g., 12543 (can be higher or lower than previous)"
                  autoFocus
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors text-lg font-semibold"
                />
                <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">
                  💡 Readings can be lower (meter replacement, rollover) or higher than previous month
                </p>
                {errors.currentReading && (
                  <p className="text-red-400 text-xs mt-1 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    {errors.currentReading}
                  </p>
                )}
              </div>

              {/* Reading Date & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Reading Date
                  </label>
                  <input
                    type="date"
                    value={readingData.readingDate}
                    onChange={(e) => setReadingData({ ...readingData, readingDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-green-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Reading Time
                  </label>
                  <input
                    type="time"
                    value={readingData.readingTime}
                    onChange={(e) => setReadingData({ ...readingData, readingTime: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-green-400 transition-colors"
                  />
                </div>
              </div>

              {/* Meter Condition & Accessibility */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Meter Condition
                  </label>
                  <select
                    value={readingData.meterCondition}
                    onChange={(e) => setReadingData({ ...readingData, meterCondition: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-green-400 dark:focus:border-green-400 font-medium"
                  >
                    <option value="good">Good</option>
                    <option value="faulty">Faulty</option>
                    <option value="damaged">Damaged</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                    Accessibility
                  </label>
                  <select
                    value={readingData.accessibility}
                    onChange={(e) => setReadingData({ ...readingData, accessibility: e.target.value })}
                    className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-green-400 dark:focus:border-green-400 font-medium"
                  >
                    <option value="accessible">Accessible</option>
                    <option value="restricted">Restricted</option>
                    <option value="inaccessible">Inaccessible</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={readingData.notes}
                  onChange={(e) => setReadingData({ ...readingData, notes: e.target.value })}
                  rows={3}
                  placeholder="Any additional observations..."
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-green-400 transition-colors"
                />
              </div>

              {/* Auto-generate Bill Checkbox */}
              <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-lg p-4">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoGenerateBill}
                    onChange={(e) => setAutoGenerateBill(e.target.checked)}
                    className="w-5 h-5 rounded border-gray-300 text-green-500 focus:ring-green-500"
                  />
                  <div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                      Auto-generate bill after saving
                    </span>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Bill will be created automatically for this meter reading
                    </span>
                  </div>
                </label>
              </div>

              {/* Success/Error Messages */}
              {showSuccess && billGenerated && (
                <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <CheckCircle className="w-6 h-6 text-green-400" />
                    <div>
                      <h3 className="text-white font-semibold">Success!</h3>
                      <p className="text-gray-300 text-xs">Meter reading saved and bill generated</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      setShowModal(false);
                      setModalCustomer(null);
                      setShowSuccess(false);
                      setBillGenerated(null);
                      setReadingData({
                        currentReading: '',
                        readingDate: new Date().toISOString().split('T')[0],
                        readingTime: new Date().toTimeString().slice(0, 5),
                        meterCondition: 'good',
                        accessibility: 'accessible',
                        notes: '',
                      });
                      // ✅ CRITICAL: Refresh BOTH tabs simultaneously (not just active tab)
                      console.log('[Modal Close] Refreshing both work orders and all customers...');
                      await Promise.all([
                        fetchCustomersWithoutReading(currentPage),
                        fetchWorkOrders()
                      ]);
                      console.log('[Modal Close] Both lists refreshed successfully');
                    }}
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white text-sm font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              {!showSuccess && (
                <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setModalCustomer(null);
                      setErrors({});
                    }}
                    className="px-5 py-2.5 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 rounded-lg text-gray-900 dark:text-white font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || generatingBill}
                    className={`px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-semibold flex items-center space-x-2 transition-all ${
                      isSubmitting || generatingBill
                        ? 'opacity-70 cursor-not-allowed'
                        : 'hover:shadow-lg hover:shadow-green-500/50'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : generatingBill ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Bill...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Submit Reading</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default function MeterReadingForm() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <MeterReadingFormInner />
    </Suspense>
  );
}


