'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  TrendingUp,
  Bell,
  X,
  Zap
} from 'lucide-react';

function AdminBillsInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const monthParam = searchParams.get('month');

  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState(monthParam || new Date().toISOString().slice(0, 7));
  const [selectedBill, setSelectedBill] = useState<any | null>(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    paymentMethod: 'bank_transfer',
    transactionRef: '',
    notes: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    totalAmount: 0,
    pending: 0,
    issued: 0,
    paid: 0,
    overdue: 0
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchBills();
  }, [selectedMonth, filterStatus, searchQuery, currentPage, itemsPerPage]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedMonth) params.append('month', selectedMonth + '-01');
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchQuery) params.append('search', searchQuery);
      params.append('page', currentPage.toString());
      params.append('limit', itemsPerPage.toString());

      const response = await fetch(`/api/bills?${params.toString()}`);
      const result = await response.json();

      console.log('[Admin Bills] API Response:', result);

      if (result.success) {
        setBills(result.data);

        // Set pagination data
        if (result.pagination) {
          setTotalPages(result.pagination.totalPages);
        }

        // Use aggregate stats from API response
        if (result.stats) {
          setStats({
            total: result.stats.total,
            totalAmount: result.stats.totalAmount,
            pending: result.stats.pending,
            issued: result.stats.issued,
            paid: result.stats.paid,
            overdue: result.stats.overdue
          });
        } else {
          // Fallback to calculating from current page data (shouldn't happen with updated API)
          const total = result.data.length;
          const totalAmount = result.data.reduce((sum: number, bill: any) =>
            sum + parseFloat(bill.totalAmount || '0'), 0
          );
          const pending = result.data.filter((b: any) => b.status === 'pending').length;
          const issued = result.data.filter((b: any) => b.status === 'issued').length;
          const paid = result.data.filter((b: any) => b.status === 'paid').length;
          const overdue = result.data.filter((b: any) => b.status === 'overdue').length;

          setStats({ total, totalAmount, pending, issued, paid, overdue });
        }
      } else {
        setError(result.error || 'Failed to fetch bills');
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Network error while fetching bills');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'issued': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'issued': return <FileText className="w-4 h-4" />;
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'overdue': return <AlertCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const handleViewBill = (bill: any) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const handleStatusUpdate = async (billId: number, newStatus: string, paymentData?: any) => {
    try {
      setError(null);

      const requestBody: any = {
        status: newStatus,
        paidDate: newStatus === 'paid' ? new Date().toISOString() : null
      };

      // Include payment details if marking as paid
      if (newStatus === 'paid' && paymentData) {
        requestBody.paymentMethod = paymentData.paymentMethod;
        requestBody.transactionRef = paymentData.transactionRef;
        requestBody.notes = paymentData.notes;
      }

      const response = await fetch(`/api/bills/${billId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      const result = await response.json();

      if (result.success) {
        // Refresh bills list
        await fetchBills();

        // Update selected bill if modal is still open
        if (selectedBill && selectedBill.id === billId) {
          setSelectedBill({ ...selectedBill, status: newStatus });
        }
      } else {
        setError(result.error || 'Failed to update bill status');
        alert('Failed to update bill status: ' + (result.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error updating bill status:', err);
      setError('Network error while updating bill status');
      alert('Network error while updating bill status');
    }
  };

  const handleMarkAsPaid = async () => {
    // CRITICAL CHECK: Verify bill isn't already paid (prevent double payment)
    if (selectedBill.status === 'paid') {
      alert('⚠️ This bill is already marked as PAID.\n\nPlease refresh the page to see the latest status.');
      setShowPaymentModal(false);
      return;
    }

    // Validate payment details
    if (!paymentDetails.transactionRef.trim()) {
      alert('Please enter a transaction reference number');
      return;
    }

    if (paymentDetails.transactionRef.length < 5) {
      alert('Transaction reference must be at least 5 characters');
      return;
    }

    // Re-fetch bill status to check for race condition
    try {
      const checkResponse = await fetch(`/api/bills/${selectedBill.id}`);
      const checkResult = await checkResponse.json();

      if (checkResult.success && checkResult.data.status === 'paid') {
        alert('⚠️ This bill was just paid by the customer!\n\nPayment already recorded. Refreshing...');
        setShowPaymentModal(false);
        setShowBillModal(false);
        await fetchBills();
        return;
      }
    } catch (err) {
      console.error('Error checking bill status:', err);
    }

    // Confirm action
    const confirmMessage = `Confirm marking Bill #${selectedBill.id} as PAID?\n\n` +
      `Amount: Rs ${parseFloat(selectedBill.totalAmount).toLocaleString()}\n` +
      `Payment Method: ${paymentDetails.paymentMethod.replace('_', ' ').toUpperCase()}\n` +
      `Transaction Ref: ${paymentDetails.transactionRef}\n\n` +
      `⚠️ IMPORTANT: Ensure payment is actually received!\n` +
      `This action will be logged in the audit trail.`;

    if (!confirm(confirmMessage)) {
      return;
    }

    // Call API with payment details
    await handleStatusUpdate(selectedBill.id, 'paid', {
      paymentMethod: paymentDetails.paymentMethod,
      transactionRef: paymentDetails.transactionRef,
      notes: paymentDetails.notes
    });

    // Close modals and reset form
    setShowPaymentModal(false);
    setShowBillModal(false);
    setPaymentDetails({
      paymentMethod: 'bank_transfer',
      transactionRef: '',
      notes: ''
    });

    alert('✅ Payment recorded successfully!\n\nBill marked as paid and payment record created in database.');
  };

  const handleExport = () => {
    const csvContent = [
      ['Bill ID', 'Account Number', 'Customer Name', 'Billing Period', 'Units Consumed', 'Total Amount', 'Status', 'Due Date'],
      ...bills.map(bill => [
        bill.id,
        bill.accountNumber,
        bill.customerName || '',
        bill.billingPeriod,
        bill.unitsConsumed,
        bill.totalAmount,
        bill.status,
        bill.dueDate
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bills-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <DashboardLayout userType="admin" userName="Admin User">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Bills Management</h1>
              <p className="text-gray-600 dark:text-gray-400">View and manage generated bills</p>
            </div>
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
              <FileText className="w-9 h-9 text-white" />
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Bills</p>
              <FileText className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Amount</p>
              <DollarSign className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">Rs {stats.totalAmount.toLocaleString()}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Paid</p>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.paid}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Issued</p>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.issued}</p>
          </div>

          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-gray-600 dark:text-gray-400 text-sm">Overdue</p>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by account number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Month Filter */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors [&>option]:bg-white [&>option]:dark:bg-gray-800 [&>option]:text-gray-900 [&>option]:dark:text-white"
              >
                <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">All Status</option>
                <option value="pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Pending</option>
                <option value="issued" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Issued</option>
                <option value="paid" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Paid</option>
                <option value="overdue" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Overdue</option>
              </select>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              disabled={bills.length === 0}
              className="px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              <span>Export CSV</span>
            </button>

            {/* Bulk Generate Button - Navigate to existing page */}
            <button
              onClick={() => router.push('/admin/bills/generate')}
              className="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-purple-500/50 transition-all flex items-center justify-center space-x-2 font-semibold"
            >
              <Zap className="w-5 h-5" />
              <span>Bulk Generation</span>
            </button>
          </div>
        </div>

        {/* Bills Table */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading bills...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Error Loading Bills</h3>
              <p className="text-gray-600 dark:text-gray-400">{error}</p>
            </div>
          ) : bills.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Bills Found</h3>
              <p className="text-gray-600 dark:text-gray-400">No bills match your current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Bill ID</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Account Number</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Period</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Units</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Due Date</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                  {bills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-medium">#{bill.id}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{bill.accountNumber}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{bill.customerName || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(bill.billingPeriod).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{bill.unitsConsumed} kWh</td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">Rs {parseFloat(bill.totalAmount).toLocaleString()}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(bill.status)}`}>
                          {getStatusIcon(bill.status)}
                          <span className="ml-1 capitalize">{bill.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {new Date(bill.dueDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleViewBill(bill)}
                          className="text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-1 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded"
                          title="View Bill Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!loading && !error && bills.length > 0 && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Items per page selector */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Show</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page
                  }}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  per page
                </span>
              </div>

              {/* Page info */}
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, stats.total)} of {stats.total} bills
              </div>

              {/* Page navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>

                {/* Page numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          currentPage === pageNum
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Last
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bill Details Modal */}
        {showBillModal && selectedBill && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowBillModal(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full my-8 flex flex-col max-h-[calc(100vh-4rem)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header - Fixed */}
              <div className="flex-shrink-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Bill Details</h2>
                    <p className="text-purple-100 mt-1">Bill ID: #{selectedBill.id}</p>
                  </div>
                  <button
                    onClick={() => setShowBillModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Scrollable */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Status Badge */}
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(selectedBill.status)}`}>
                    {getStatusIcon(selectedBill.status)}
                    <span className="ml-2 capitalize">{selectedBill.status}</span>
                  </span>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Bill Number</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{selectedBill.billNumber || 'N/A'}</p>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Customer Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedBill.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Customer Name</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedBill.customerName || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Billing Period */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Billing Period</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Billing Month</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedBill.billingPeriod).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedBill.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Consumption & Charges */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Consumption & Charges</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Units Consumed</span>
                      <span className="text-lg font-bold text-gray-900 dark:text-white">{selectedBill.unitsConsumed} kWh</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Base Amount</span>
                      <span className="font-semibold text-gray-900 dark:text-white">Rs {parseFloat(selectedBill.baseAmount || 0).toLocaleString()}</span>
                    </div>
                    {selectedBill.additionalCharges && parseFloat(selectedBill.additionalCharges) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Additional Charges</span>
                        <span className="font-semibold text-gray-900 dark:text-white">Rs {parseFloat(selectedBill.additionalCharges).toLocaleString()}</span>
                      </div>
                    )}
                    {selectedBill.taxAmount && parseFloat(selectedBill.taxAmount) > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Tax Amount</span>
                        <span className="font-semibold text-gray-900 dark:text-white">Rs {parseFloat(selectedBill.taxAmount).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="border-t border-gray-300 dark:border-white/20 pt-3 mt-3">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount</span>
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">Rs {parseFloat(selectedBill.totalAmount).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tariff Information */}
                {selectedBill.tariffId && (
                  <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                    <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Tariff Information</h3>
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Tariff ID</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">#{selectedBill.tariffId}</p>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10">
                  <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-3">Timestamps</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Issue Date</p>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        {new Date(selectedBill.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    {selectedBill.paidDate && (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Paid Date</p>
                        <p className="text-base font-semibold text-green-600 dark:text-green-400">
                          {new Date(selectedBill.paidDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Modal Footer - Admin Actions - Fixed */}
              <div className="flex-shrink-0 bg-gray-50 dark:bg-white/5 p-6 rounded-b-2xl border-t border-gray-200 dark:border-white/10">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                  {/* Status Update Actions */}
                  <div className="flex flex-wrap gap-2">
                    {selectedBill.status !== 'paid' && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm flex items-center space-x-1"
                        title="Mark as Paid"
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Mark Paid</span>
                      </button>
                    )}
                    {selectedBill.status === 'pending' && (
                      <button
                        onClick={() => handleStatusUpdate(selectedBill.id, 'issued')}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm flex items-center space-x-1"
                        title="Issue Bill"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Issue Bill</span>
                      </button>
                    )}
                    {(selectedBill.status === 'issued' || selectedBill.status === 'overdue') && (
                      <button
                        onClick={() => {
                          alert('Payment reminder will be sent to customer via email/SMS (future feature)');
                        }}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm flex items-center space-x-1"
                        title="Send Reminder"
                      >
                        <Bell className="w-4 h-4" />
                        <span>Send Reminder</span>
                      </button>
                    )}
                  </div>

                  {/* Close Button */}
                  <button
                    onClick={() => setShowBillModal(false)}
                    className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Confirmation Modal */}
        {showPaymentModal && selectedBill && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto"
            onClick={() => setShowPaymentModal(false)}
          >
            <div
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold">Record Payment</h2>
                    <p className="text-green-100 text-sm mt-1">Bill #{selectedBill.id} - Rs {parseFloat(selectedBill.totalAmount).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-4">
                {/* Warning Message */}
                <div className="bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <p className="font-semibold mb-1">Important: Payment Verification Required</p>
                      <p>Ensure payment is received and verified before marking as paid. This action creates an audit trail.</p>
                    </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={paymentDetails.paymentMethod}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, paymentMethod: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash Payment</option>
                    <option value="cheque">Cheque</option>
                    <option value="online_payment">Online Payment Gateway</option>
                    <option value="mobile_wallet">Mobile Wallet (JazzCash/Easypaisa)</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Transaction Reference */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Transaction Reference / Receipt Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={paymentDetails.transactionRef}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, transactionRef: e.target.value })}
                    placeholder="e.g., TXN-20251026-1234"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 5 characters. Use bank transaction ID, receipt number, or cheque number.</p>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    value={paymentDetails.notes}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, notes: e.target.value })}
                    placeholder="Any additional information about the payment..."
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  />
                </div>

                {/* Customer Info Summary */}
                <div className="bg-gray-50 dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10">
                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">PAYMENT SUMMARY</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Account:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedBill.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Customer:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{selectedBill.customerName || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-300 dark:border-white/20 pt-2 mt-2">
                      <span className="font-bold text-gray-900 dark:text-white">Amount:</span>
                      <span className="font-bold text-green-600 dark:text-green-400">Rs {parseFloat(selectedBill.totalAmount).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 dark:bg-white/5 p-6 rounded-b-2xl border-t border-gray-200 dark:border-white/10">
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleMarkAsPaid}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all font-semibold flex items-center justify-center space-x-2"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <span>Confirm Payment</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AdminBills() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <AdminBillsInner />
    </Suspense>
  );
}

