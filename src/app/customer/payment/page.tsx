'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

import DashboardLayout from '@/components/DashboardLayout';
import { safeNumber, formatCurrency, safeDate, formatUnits } from '@/lib/utils/dataHandlers';
import {
  CreditCard,
  DollarSign,
  Smartphone,
  Building2,
  Wallet,
  Shield,
  Lock,
  CheckCircle,
  AlertCircle,
  Clock,
  FileText,
  Download,
  QrCode,
  ArrowRight,
  Eye,
  EyeOff,
  Zap,
  X
} from 'lucide-react';

export default function OnlinePayment() {
  const { data: session } = useSession();
  const router = useRouter();

  // State management
  const [selectedMethod, setSelectedMethod] = useState('credit_card');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [customAmount, setCustomAmount] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentStep, setPaymentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data from API
  const [currentBill, setCurrentBill] = useState<any>(null);
  const [unpaidBills, setUnpaidBills] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [paymentResult, setPaymentResult] = useState<any>(null);

  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    saveCard: false
  });

  // Fetch current bill and recent transactions on mount
  useEffect(() => {
    fetchBillAndTransactions();
  }, []);

  const fetchBillAndTransactions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch ALL unpaid bills (generated and issued, not just one)
      const billResponse = await fetch('/api/bills?status=generated,issued&limit=100');
      const billResult = await billResponse.json();

      if (billResult.success && billResult.data.length > 0) {
        const bills = billResult.data;
        setUnpaidBills(bills);
        // Set first bill as default
        setCurrentBill(bills[0]);
        setPaymentAmount(safeNumber(bills[0].totalAmount, 0).toString());
      } else {
        setError('No pending bills found');
        setUnpaidBills([]);
      }

      // Fetch recent payments
      const paymentsResponse = await fetch('/api/payments?limit=5');
      const paymentsResult = await paymentsResponse.json();

      if (paymentsResult.success) {
        setRecentTransactions(paymentsResult.data);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load payment information');
    } finally {
      setLoading(false);
    }
  };

  // Handle bill selection change
  const handleBillSelection = (billId: number) => {
    const selectedBill = unpaidBills.find(b => b.id === billId);
    if (selectedBill) {
      setCurrentBill(selectedBill);
      setPaymentAmount(safeNumber(selectedBill.totalAmount, 0).toString());
      setError(null);
    }
  };

  const paymentMethods = [
    {
      id: 'credit_card',
      name: 'Credit Card',
      icon: CreditCard,
      description: 'Visa, Mastercard, etc.',
      color: 'from-blue-500 to-cyan-500',
      popular: true
    },
    {
      id: 'debit_card',
      name: 'Debit Card',
      icon: CreditCard,
      description: 'Bank debit card payment',
      color: 'from-indigo-500 to-blue-500',
      popular: true
    },
    {
      id: 'bank_transfer',
      name: 'Bank Transfer / IBFT',
      icon: Building2,
      description: 'Direct bank transfer',
      color: 'from-green-500 to-emerald-500',
      popular: false
    },
    {
      id: 'wallet',
      name: 'JazzCash',
      icon: Smartphone,
      description: 'JazzCash mobile wallet',
      color: 'from-red-500 to-orange-500',
      popular: true
    },
    {
      id: 'upi',
      name: 'EasyPaisa',
      icon: Wallet,
      description: 'EasyPaisa mobile wallet',
      color: 'from-green-600 to-emerald-600',
      popular: true
    },
    {
      id: 'cash',
      name: 'Cash Payment',
      icon: DollarSign,
      description: 'Paid at office counter',
      color: 'from-yellow-500 to-amber-500',
      popular: false
    },
    {
      id: 'cheque',
      name: 'Cheque',
      icon: FileText,
      description: 'Bank cheque payment',
      color: 'from-gray-500 to-slate-500',
      popular: false
    }
  ];

  const quickAmounts = [100, 200, 500, 1000];

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = (matches && matches[0]) || '';
    const parts = [];

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }

    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    if (formatted.replace(/\s/g, '').length <= 16) {
      setCardDetails({ ...cardDetails, cardNumber: formatted });
    }
  };

  const handlePayment = async () => {
    try {
      // Validation
      const amount = parseFloat(paymentAmount);
      const billAmount = safeNumber(currentBill?.totalAmount, 0);

      if (!currentBill) {
        setError('No bill selected');
        return;
      }

      if (isNaN(amount) || amount < 1) {
        setError('Payment amount must be at least Rs. 1');
        return;
      }

      if (amount > billAmount) {
        setError(`Payment amount cannot exceed bill amount (${formatCurrency(billAmount, 'Rs.')})`);
        return;
      }

      setProcessingPayment(true);
      setError(null);

      // Call payment API
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billId: currentBill.id,
          paymentMethod: selectedMethod,
          amount: amount,
          paymentDate: paymentDate, // Send custom payment date
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Payment failed');
      }

      // Payment successful
      setPaymentResult(result.data);
      setPaymentStep(3); // Success step

    } catch (err: any) {
      console.error('Payment error:', err);
      setError(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading payment information...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Empty state or error - no pending bills yet
  if (!currentBill) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center max-w-md">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Pending Bills</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">{error ? error : 'Once a bill is issued, it will appear here for payment.'}</p>
            <button
              onClick={() => router.push('/customer/view-bills')}
              className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              View Bill History
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Record Payment</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select payment method and amount to record your bill payment</p>
            </div>
            <div className="mt-3 sm:mt-0 flex items-center space-x-2">
              <div className="flex items-center space-x-2 px-3 py-2 bg-blue-500/20 rounded-lg border border-blue-500/50">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-blue-400 font-semibold text-sm">Manual Entry</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 mb-4 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-400 font-semibold">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Total Outstanding Balance Display */}
        {unpaidBills.length > 0 && (
          <div className="bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/30 rounded-lg">
                  <DollarSign className="w-6 h-6 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Outstanding Balance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatCurrency(
                      unpaidBills.reduce((sum, bill) => sum + safeNumber(bill.totalAmount, 0), 0),
                      'Rs.'
                    )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Unpaid Bills</p>
                <p className="text-xl font-bold text-orange-400">{unpaidBills.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4">

        {/* Payment Steps */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            {[
              { step: 1, label: 'Bill Details' },
              { step: 2, label: 'Payment Method' },
              { step: 3, label: 'Confirmation' }
            ].map((item, index) => (
              <React.Fragment key={item.step}>
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                    paymentStep >= item.step
                      ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white'
                      : 'bg-white/10 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-white/20'
                  }`}>
                    {paymentStep > item.step ? <CheckCircle className="w-4 h-4" /> : item.step}
                  </div>
                  <span className={`hidden sm:block text-sm ${paymentStep >= item.step ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    {item.label}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`flex-1 h-1 mx-3 rounded-full transition-all ${
                    paymentStep > item.step ? 'bg-gradient-to-r from-yellow-400 to-orange-500' : 'bg-white/10'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Payment Form */}
          <div className="lg:col-span-2 space-y-4">
            {paymentStep === 1 && (
              /* Combined Bill Details & Quick Pay */
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10 flex flex-col h-full">
                {/* Bill Summary Section */}
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-yellow-400" />
                    Bill Details
                  </h2>

                  <div className="space-y-4">
                    {/* Bill Selection Dropdown - NEW */}
                    {unpaidBills.length > 1 && (
                      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                        <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                          Select Bill to Pay ({unpaidBills.length} unpaid bills)
                        </label>
                        <select
                          value={currentBill?.id || ''}
                          onChange={(e) => handleBillSelection(parseInt(e.target.value, 10))}
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400 transition-colors"
                        >
                          {unpaidBills.map((bill) => (
                            <option key={bill.id} value={bill.id}>
                              {bill.billNumber} - {new Date(bill.billingMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - Rs. {safeNumber(bill.totalAmount, 0).toFixed(2)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Bill Number - Prominent Display */}
                    <div className="p-4 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-xl border border-yellow-400/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bill Number</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{currentBill?.billNumber || 'N/A'}</p>
                    </div>

                    {/* Amount & Due Date - Equal Emphasis */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                        <div className="flex items-center mb-2">
                          <DollarSign className="w-4 h-4 text-green-400 mr-1" />
                          <p className="text-xs text-gray-600 dark:text-gray-400">Amount Due</p>
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(safeNumber(currentBill?.totalAmount, 0), 'Rs.')}</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-xl border border-blue-500/20">
                        <div className="flex items-center mb-2">
                          <Clock className="w-4 h-4 text-blue-400 mr-1" />
                          <p className="text-xs text-gray-600 dark:text-gray-400">Due Date</p>
                        </div>
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">{safeDate(currentBill?.dueDate)}</p>
                      </div>
                    </div>

                    {/* Additional Details - Subtle */}
                    <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                      <div className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-white/10">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Zap className="w-4 h-4 mr-2 text-purple-400" />
                          Units Consumed
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{formatUnits(safeNumber(currentBill?.unitsConsumed, 0))}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                          <Clock className="w-4 h-4 mr-2 text-blue-400" />
                          Billing Month
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{currentBill?.billingMonth ? new Date(currentBill.billingMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Pay Options Section */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                    <Wallet className="w-5 h-5 mr-2 text-purple-400" />
                    Quick Pay Amount
                  </h3>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {quickAmounts.map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setPaymentAmount(amount.toString())}
                        className={`py-4 rounded-xl font-semibold transition-all border-2 ${
                          paymentAmount === amount.toString()
                            ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-yellow-400 shadow-lg shadow-orange-500/30'
                            : 'bg-white/5 text-gray-900 dark:text-white hover:bg-white/10 border-gray-300 dark:border-white/20 hover:border-yellow-400/50'
                        }`}
                      >
                        {formatCurrency(amount, 'Rs.')}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
                    <div className="flex items-center space-x-3 mb-3">
                      <input
                        type="checkbox"
                        checked={customAmount}
                        onChange={(e) => setCustomAmount(e.target.checked)}
                        className="w-4 h-4 text-yellow-400 rounded focus:ring-yellow-400"
                      />
                      <label className="text-gray-700 dark:text-gray-300 text-sm font-medium">Enter custom amount</label>
                    </div>
                    {customAmount && (
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/10 border-2 border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors font-semibold text-lg"
                          placeholder="Enter amount"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Proceed Button at Bottom */}
                <div className="mt-auto">
                  <button
                    onClick={() => setPaymentStep(2)}
                    className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all font-semibold flex items-center justify-center space-x-2"
                  >
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {paymentStep === 2 && (
              <>
                {/* Payment Methods */}
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Select Payment Method</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                    {paymentMethods.map((method) => (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`relative p-4 rounded-xl border transition-all ${
                          selectedMethod === method.id
                            ? 'border-yellow-400/50 bg-white/10'
                            : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:border-gray-300 dark:border-white/20'
                        }`}
                      >
                        {method.popular && (
                          <span className="absolute -top-2 -right-2 px-2 py-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-xs rounded-full font-semibold">
                            Popular
                          </span>
                        )}
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 bg-gradient-to-r ${method.color} rounded-lg flex items-center justify-center`}>
                            <method.icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <p className="text-white font-medium">{method.name}</p>
                            <p className="text-gray-600 dark:text-gray-400 text-xs">{method.description}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Card Payment Form */}
                  {selectedMethod === 'card' && (
                    <div className="space-y-4">
                      <h3 className="text-white font-semibold">Card Details</h3>

                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Card Number</label>
                          <div className="relative">
                            <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
                            <input
                              type="text"
                              value={cardDetails.cardNumber}
                              onChange={handleCardNumberChange}
                              className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
                              placeholder="1234 5678 9012 3456"
                              maxLength={19}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Card Holder Name</label>
                          <input
                            type="text"
                            value={cardDetails.cardName}
                            onChange={(e) => setCardDetails({ ...cardDetails, cardName: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
                            placeholder="Huzaifa"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">Expiry Date</label>
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={cardDetails.expiryMonth}
                                onChange={(e) => setCardDetails({ ...cardDetails, expiryMonth: e.target.value })}
                                className="px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
                                placeholder="MM"
                                maxLength={2}
                              />
                              <input
                                type="text"
                                value={cardDetails.expiryYear}
                                onChange={(e) => setCardDetails({ ...cardDetails, expiryYear: e.target.value })}
                                className="px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
                                placeholder="YY"
                                maxLength={2}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block">CVV</label>
                            <div className="relative">
                              <input
                                type={showCardDetails ? 'text' : 'password'}
                                value={cardDetails.cvv}
                                onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value })}
                                className="w-full pr-12 px-4 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
                                placeholder="123"
                                maxLength={3}
                              />
                              <button
                                type="button"
                                onClick={() => setShowCardDetails(!showCardDetails)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white"
                              >
                                {showCardDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={cardDetails.saveCard}
                            onChange={(e) => setCardDetails({ ...cardDetails, saveCard: e.target.checked })}
                            className="w-5 h-5"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Save card for future payments</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Payment Date Picker - NEW */}
                  <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                    <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-blue-500" />
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400 transition-colors"
                    />
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      Select the date when payment was actually made (defaults to today)
                    </p>
                  </div>

                  <div className="flex space-x-4 mt-6">
                    <button
                      onClick={() => setPaymentStep(1)}
                      className="flex-1 py-3 bg-gray-50 dark:bg-gray-50 dark:bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white hover:bg-gray-100 dark:bg-gray-100 dark:bg-white/20 transition-all font-semibold"
                    >
                      Back
                    </button>
                    <button
                      onClick={handlePayment}
                      disabled={processingPayment}
                      className={`flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center space-x-2 ${
                        processingPayment ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-emerald-500/50'
                      }`}
                    >
                      {processingPayment ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-5 h-5" />
                          <span>Pay {formatCurrency(parseFloat(paymentAmount), 'Rs.')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}

            {paymentStep === 3 && (
              /* Success Screen */
              <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10 text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">Your payment has been processed successfully</p>

                <div className="bg-white dark:bg-white/5 rounded-xl p-4 mb-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Transaction ID</span>
                      <span className="text-gray-900 dark:text-white font-semibold">{paymentResult?.transactionId || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Receipt Number</span>
                      <span className="text-gray-900 dark:text-white font-semibold">{paymentResult?.receiptNumber || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                      <span className="text-gray-900 dark:text-white font-semibold">{formatCurrency(parseFloat(paymentAmount), 'Rs.')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Payment Method</span>
                      <span className="text-gray-900 dark:text-white capitalize">{selectedMethod.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Date & Time</span>
                      <span className="text-gray-900 dark:text-white">{new Date().toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={() => router.push('/customer/view-bills')}
                    className="flex-1 py-3 bg-white dark:bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-xl text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <FileText className="w-5 h-5" />
                    <span>View Bills</span>
                  </button>
                  <button
                    onClick={() => {
                      setPaymentStep(1);
                      setPaymentResult(null);
                      fetchBillAndTransactions();
                    }}
                    className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-xl hover:shadow-lg hover:shadow-orange-500/50 transition-all font-semibold"
                  >
                    Pay Another Bill
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Payment Summary */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Payment Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Bill Amount</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(safeNumber(currentBill?.totalAmount, 0), 'Rs.')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Late Fee</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(0, 'Rs.')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Processing Fee</span>
                  <span className="text-gray-900 dark:text-white">{formatCurrency(0, 'Rs.')}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-white/10 pt-3 flex justify-between">
                  <span className="text-gray-900 dark:text-white font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold text-green-400">{formatCurrency(parseFloat(paymentAmount || '0'), 'Rs.')}</span>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-2xl p-5 border border-green-500/20">
              <div className="flex items-center space-x-2 mb-3">
                <Shield className="w-5 h-5 text-green-400" />
                <h3 className="text-white font-semibold text-sm">Secure Payment</h3>
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-xs mb-3">
                Your payment information is encrypted and secure. We use industry-standard security measures.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-700 dark:text-gray-300 text-xs">256-bit SSL encryption</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-700 dark:text-gray-300 text-xs">PCI DSS compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-3 h-3 text-green-400" />
                  <span className="text-gray-700 dark:text-gray-300 text-xs">No card details stored</span>
                </div>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Recent Transactions</h3>
              <div className="space-y-3">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="p-3 bg-white dark:bg-white/5 rounded-lg">
                      <div className="flex justify-between mb-1">
                        <span className="text-gray-900 dark:text-white font-medium">{formatCurrency(safeNumber(transaction.paymentAmount, 0), 'Rs.')}</span>
                        <span className="text-green-400 text-xs capitalize">{transaction.status || 'Success'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400 text-xs">{safeDate(transaction.paymentDate)}</span>
                        <span className="text-gray-600 dark:text-gray-400 text-xs capitalize">{transaction.paymentMethod || 'N/A'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600 dark:text-gray-400 text-sm text-center py-4">No recent transactions</p>
                )}
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

