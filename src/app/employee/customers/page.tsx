'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Users,
  Search,
  Eye,
  Phone,
  Mail,
  MapPin,
  FileText,
  Zap,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Activity,
  TrendingUp,
  Filter,
  X,
  Calendar,
  Home,
  CreditCard,
  RefreshCw
} from 'lucide-react';
import { formatPKPhone } from '@/lib/utils/dataHandlers';

interface Customer {
  id: number;
  accountNumber: string;
  meterNumber: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  connectionType: string;
  status: string;
  connectionDate: string;
  lastBillAmount: string;
  lastPaymentDate: string | null;
  averageMonthlyUsage: string;
  outstandingBalance: string;
  paymentStatus: string;
}

export default function EmployeeCustomers() {
  const { data: session } = useSession();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    overdue: 0,
    avgConsumption: '0'
  });
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  const itemsPerPage = 10;

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchQuery,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      if (selectedFilter !== 'all') {
        params.append('status', selectedFilter);
      }

      const response = await fetch(`/api/customers?${params}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch customers');
      }

      setCustomers(result.data || []);

      // Calculate stats
      const total = result.pagination?.total || 0;
      const active = result.data?.filter((c: Customer) => c.status === 'active').length || 0;
      const overdue = result.data?.filter((c: Customer) => c.paymentStatus === 'overdue').length || 0;
      const avgConsumption = result.data?.length > 0
        ? (result.data.reduce((sum: number, c: Customer) => sum + parseFloat(c.averageMonthlyUsage || '0'), 0) / result.data.length).toFixed(0)
        : '0';

      setStats({
        total,
        active,
        overdue,
        avgConsumption
      });

      // Store pagination info
      setPaginationInfo({
        total: result.pagination?.total || 0,
        totalPages: result.pagination?.totalPages || 0,
        hasNext: currentPage < (result.pagination?.totalPages || 0),
        hasPrev: currentPage > 1
      });

    } catch (err: any) {
      console.error('Error fetching customers:', err);
      setError(err.message || 'Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [currentPage, selectedFilter]);

  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchCustomers();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'suspended': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'inactive': return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const openCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCustomer(null);
  };

  return (
    <DashboardLayout userType="employee" userName={session?.user?.name || 'Employee'}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
                <Users className="w-8 h-8 mr-3 text-blue-400" />
                Customer Database
              </h1>
              <p className="text-gray-600 dark:text-gray-400">View and manage customer information</p>
            </div>
            <button
              onClick={fetchCustomers}
              className="mt-4 sm:mt-0 flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Customers', value: stats.total.toString(), icon: Users, color: 'from-blue-500 to-cyan-500' },
            { label: 'Active', value: stats.active.toString(), icon: CheckCircle, color: 'from-green-500 to-emerald-500' },
            { label: 'Overdue Bills', value: stats.overdue.toString(), icon: AlertCircle, color: 'from-red-500 to-rose-500' },
            { label: 'Avg Consumption', value: `${stats.avgConsumption} kWh`, icon: Activity, color: 'from-purple-500 to-pink-500' }
          ].map((stat, index) => (
            <div key={index} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-xl p-4 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-10 h-10 bg-gradient-to-r ${stat.color} rounded-lg flex items-center justify-center`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</span>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1 max-w-md relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, account (ELX-2024-000001), meter (MTR-KHI-000001), phone..."
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-400 transition-colors"
              />
            </div>
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 font-medium"
            >
              <option value="all">All Customers</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-12 border border-gray-200 dark:border-white/10 text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-400" />
            <p className="text-gray-600 dark:text-gray-400">Loading customers...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-6 text-center">
            <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-400" />
            <p className="text-red-400 font-semibold mb-2">Error</p>
            <p className="text-gray-300">{error}</p>
            <button
              onClick={fetchCustomers}
              className="mt-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Customer Table */}
        {!loading && !error && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-gray-200 dark:border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Customer</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Contact</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Meter Info</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Outstanding Balance</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No customers found
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-white font-semibold text-sm">
                                {customer.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                             </span>
                            </div>
                            <div>
                              <p className="text-white font-medium">{customer.fullName}</p>
                              <p className="text-gray-400 text-sm">{customer.accountNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300 text-sm">{formatPKPhone(customer.phone)}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-300 text-sm">{customer.city}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Zap className="w-4 h-4 text-yellow-400" />
                              <span className="text-white">{customer.meterNumber}</span>
                            </div>
                            <p className="text-gray-400 text-sm mt-1">Usage: {customer.averageMonthlyUsage} kWh/mo</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-white font-semibold">Rs {parseFloat(customer.outstandingBalance || '0').toFixed(2)}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border mt-1 ${getPaymentStatusColor(customer.paymentStatus)}`}>
                              {customer.paymentStatus}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(customer.status)}`}>
                            <span className="capitalize">{customer.status}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => openCustomerDetails(customer)}
                              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 bg-white/5 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Showing {paginationInfo.total > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} to {Math.min(currentPage * itemsPerPage, paginationInfo.total)} of {paginationInfo.total} customers
              </p>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={!paginationInfo.hasPrev}
                  className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="text-white">{currentPage} / {paginationInfo.totalPages || 1}</span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={!paginationInfo.hasNext}
                  className="px-3 py-1 bg-white/10 border border-white/20 rounded text-white hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Customer Details Modal */}
        {showModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gray-900 border-b border-white/10 p-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Customer Details</h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-6">
                {/* Personal Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Users className="w-5 h-5 mr-2 text-blue-400" />
                    Personal Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Full Name</p>
                      <p className="text-white font-medium">{selectedCustomer.fullName}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Account Number</p>
                      <p className="text-white font-medium">{selectedCustomer.accountNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Email</p>
                      <p className="text-white font-medium">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Phone</p>
                      <p className="text-white font-medium">{formatPKPhone(selectedCustomer.phone)}</p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Home className="w-5 h-5 mr-2 text-green-400" />
                    Address
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-gray-400 text-sm">Street Address</p>
                      <p className="text-white font-medium">{selectedCustomer.address}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">City</p>
                      <p className="text-white font-medium">{selectedCustomer.city}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">State</p>
                      <p className="text-white font-medium">{selectedCustomer.state}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Pincode</p>
                      <p className="text-white font-medium">{selectedCustomer.pincode}</p>
                    </div>
                  </div>
                </div>

                {/* Connection Details */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <Zap className="w-5 h-5 mr-2 text-yellow-400" />
                    Connection Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Meter Number</p>
                      <p className="text-white font-medium">{selectedCustomer.meterNumber}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Connection Type</p>
                      <p className="text-white font-medium capitalize">{selectedCustomer.connectionType}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Connection Date</p>
                      <p className="text-white font-medium">{new Date(selectedCustomer.connectionDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Status</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(selectedCustomer.status)}`}>
                        {selectedCustomer.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Billing Information */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    <CreditCard className="w-5 h-5 mr-2 text-purple-400" />
                    Billing & Usage
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Outstanding Balance</p>
                      <p className="text-white font-bold text-xl">Rs {parseFloat(selectedCustomer.outstandingBalance || '0').toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Payment Status</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getPaymentStatusColor(selectedCustomer.paymentStatus)}`}>
                        {selectedCustomer.paymentStatus}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Last Bill Amount</p>
                      <p className="text-white font-medium">Rs {parseFloat(selectedCustomer.lastBillAmount || '0').toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Last Payment Date</p>
                      <p className="text-white font-medium">{selectedCustomer.lastPaymentDate || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Avg Monthly Usage</p>
                      <p className="text-white font-medium">{selectedCustomer.averageMonthlyUsage} kWh</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 p-6 flex justify-end">
                <button
                  onClick={closeModal}
                  className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
