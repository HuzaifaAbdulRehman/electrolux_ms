'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  Users,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  Trash2,
  Plus,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Activity,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  MoreVertical,
  User,
  Zap,
  PieChart,
  Loader2,
  Save,
  X,
  Copy,
  Key,
  CreditCard
} from 'lucide-react';
import { formatPKPhone, formatCNIC, onlyDigits } from '@/lib/utils/dataHandlers';

export default function AdminCustomers() {
  const router = useRouter();
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterConnectionType, setFilterConnectionType] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<any>(null);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]); // For statistics
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [createdCustomer, setCreatedCustomer] = useState<any>(null); // Store created customer details with password
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [newCustomer, setNewCustomer] = useState({
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
    zone: '',
    pincode: '',
    landmark: '',
    installationCharges: ''
  });

  const [zones, setZones] = useState<string[]>([]);
  const [zonesLoading, setZonesLoading] = useState(false);
  useEffect(() => {
    const fetchZones = async () => {
      setZonesLoading(true);
      try {
        const resp = await fetch('/api/zones');
        const json = await resp.json();
        if (resp.ok && json?.success && Array.isArray(json.data)) setZones(json.data);
        else setZones(['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']);
      } catch {
        setZones(['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E']);
      } finally {
        setZonesLoading(false);
      }
    };
    fetchZones();
  }, []);

  // Fetch ALL customers for statistics ONCE on mount
  useEffect(() => {
    fetchAllCustomers();
  }, []);

  // Fetch filtered customers when search/filter/page changes
  useEffect(() => {
    fetchCustomers();
  }, [searchQuery, filterStatus, filterConnectionType, pagination.page]);

  const fetchAllCustomers = async () => {
    try {
      const response = await fetch('/api/customers?limit=1000');
      const result = await response.json();
      if (result.success) {
        setAllCustomers(result.data);
      }
    } catch (err) {
      console.error('Error fetching all customers:', err);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch filtered results
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterConnectionType !== 'all') params.append('connectionType', filterConnectionType);
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      const response = await fetch(`/api/customers?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setCustomers(result.data);
        setPagination(prev => ({
          ...prev,
          total: result.pagination.total,
          totalPages: result.pagination.totalPages,
          hasNext: result.pagination.page < result.pagination.totalPages,
          hasPrev: result.pagination.page > 1
        }));
      } else {
        setError(result.error || 'Failed to fetch customers');
      }
    } catch (err) {
      setError('Network error while fetching customers');
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);

      // Auto-set purpose based on property type (like online form)
      const purposeMap: Record<string, string> = {
        'Residential': 'domestic',
        'Commercial': 'business',
        'Industrial': 'industrial',
        'Agricultural': 'agricultural'
      };

      const submitData = {
        ...newCustomer,
        purposeOfConnection: purposeMap[newCustomer.propertyType],
        loadRequired: null // Load will be determined during inspection
      };

      const response = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        const result = await response.json();
        await fetchCustomers(); // Refresh the list
        setShowAddCustomer(false);

        // Show success toast
        toast.success('Customer created successfully!');

        // Show success modal with password
        setCreatedCustomer({
          ...result.data,
          fullName: newCustomer.applicantName,
          email: newCustomer.email,
          phone: newCustomer.phone
        });

        // Reset form
        setNewCustomer({
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
          zone: '',
          pincode: '',
          landmark: '',
          installationCharges: ''
        });
      } else {
        const error = await response.json();
        const errorMessage = error.error || 'Failed to create customer';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (err) {
      const errorMessage = 'Network error while creating customer';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error creating customer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerToEdit) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${customerToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerToEdit)
      });

      const result = await response.json();

      if (result.success) {
        await fetchCustomers(); // Refresh the list
        await fetchAllCustomers(); // Refresh statistics
        setShowEditCustomer(false);
        setCustomerToEdit(null);
        toast.success('Customer updated successfully!');
      } else {
        toast.error(result.error || 'Failed to update customer');
      }
    } catch (err) {
      toast.error('Network error while updating customer');
      console.error('Error updating customer:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/customers/${customerToDelete.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        await fetchCustomers(); // Refresh the list
        await fetchAllCustomers(); // Refresh statistics
        setShowDeleteConfirm(false);
        setCustomerToDelete(null);
        toast.success('Customer deactivated successfully!');
      } else {
        toast.error(result.error || 'Failed to delete customer');
      }
    } catch (err) {
      toast.error('Network error while deleting customer');
      console.error('Error deleting customer:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard`);
    } catch (err) {
      toast.error('Failed to copy to clipboard');
      console.error('Failed to copy:', err);
    }
  };

  const handleExportCustomers = () => {
    if (customers.length === 0) {
      setError('No customers to export');
      return;
    }

    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Address', 'City', 'State', 'Pincode', 'Connection Type', 'Meter Number', 'Status', 'Outstanding Balance', 'Avg Monthly Usage'];
    const csvRows = [
      headers.join(','),
      ...customers.map(customer => [
        customer.id || '',
        `"${customer.fullName || ''}"`,
        customer.email || '',
        customer.phone || '',
        `"${customer.address || ''}"`,
        `"${customer.city || ''}"`,
        `"${customer.state || ''}"`,
        customer.pincode || '',
        customer.connectionType || '',
        customer.meterNumber || '',
        customer.status || 'active',
        customer.outstandingBalance || '0',
        customer.averageMonthlyUsage || '0'
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'inactive': return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'suspended': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const getConnectionTypeColor = (type: string) => {
    switch (type) {
      case 'Residential': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'Commercial': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'Industrial': return 'bg-purple-500/20 text-purple-400 border-purple-500/50';
      case 'Agricultural': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
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

  return (
    <DashboardLayout userType="admin" userName="Admin User">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Customer Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage customer accounts and billing information</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={handleExportCustomers}
                disabled={loading || customers.length === 0}
                className="px-4 py-2 bg-gray-50 dark:bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Download className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowAddCustomer(true)}
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Add Customer</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: 'Total Customers',
              value: loading ? '...' : allCustomers.length.toString(),
              icon: Users,
              color: 'from-blue-500 to-cyan-500'
            },
            {
              label: 'Active Customers',
              value: loading ? '...' : allCustomers.filter(c => c.status === 'active').length.toString(),
              icon: CheckCircle,
              color: 'from-green-500 to-emerald-500'
            },
            {
              label: 'Overdue Payments',
              value: loading ? '...' : allCustomers.filter(c => c.paymentStatus === 'overdue').length.toString(),
              icon: AlertCircle,
              color: 'from-red-500 to-rose-500'
            },
            {
              label: 'Total Outstanding',
              value: loading ? '...' : `Rs ${allCustomers.reduce((sum, c) => sum + (parseFloat(c.outstandingBalance) || 0), 0).toLocaleString()}`,
              icon: DollarSign,
              color: 'from-yellow-500 to-orange-500'
            },
            {
              label: 'Avg Monthly Usage',
              value: loading ? '...' : `${Math.round(allCustomers.reduce((sum, c) => sum + (parseFloat(c.averageMonthlyUsage) || 0), 0) / Math.max(allCustomers.length, 1))} kWh`, 
              icon: Activity, 
              color: 'from-purple-500 to-pink-500' 
            }
          ].map((stat, index) => (
            <div key={index} className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${stat.color} rounded-xl flex items-center justify-center`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Search and Filter */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Filter className="w-5 h-5 text-gray-400" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">All Status</option>
                  <option value="active" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Active</option>
                  <option value="inactive" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Inactive</option>
                  <option value="suspended" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Suspended</option>
                </select>
              </div>
              <div className="flex items-center space-x-2">
                <select
                  value={filterConnectionType}
                  onChange={(e) => setFilterConnectionType(e.target.value)}
                  className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">All Types</option>
                  <option value="Residential" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Residential</option>
                  <option value="Commercial" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Commercial</option>
                  <option value="Industrial" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Industrial</option>
                  <option value="Agricultural" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Agricultural</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading customers...</span>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Billing</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                              <span className="text-white font-semibold text-sm">
                                {customer.fullName?.charAt(0) || 'C'}
                              </span>
                            </div>
                            <div>
                              <p className="text-gray-900 dark:text-white font-medium">{customer.fullName}</p>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">#{customer.accountNumber}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300 text-sm">{customer.email}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300 text-sm">{customer.phone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <MapPin className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                              <span className="text-gray-700 dark:text-gray-300 text-sm">{customer.city}, {customer.state}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectionTypeColor(customer.connectionType)}`}>
                                {customer.connectionType}
                              </span>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Meter: {customer.meterNumber}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Avg: {customer.averageMonthlyUsage} kWh
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Outstanding</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Rs {parseFloat(customer.outstandingBalance || 0).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Last Bill</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">
                                Rs {parseFloat(customer.lastBillAmount || 0).toLocaleString()}
                              </span>
                            </div>
                            <div>
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(customer.paymentStatus)}`}>
                                {customer.paymentStatus || 'Unknown'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(customer.status)}`}>
                            <span className="capitalize">{customer.status || 'Unknown'}</span>
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => setSelectedCustomer(customer.id)}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/10 rounded-lg transition-all"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCustomerToEdit(customer);
                                setShowEditCustomer(true);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/10 rounded-lg transition-all"
                              title="Edit Customer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setCustomerToDelete(customer);
                                setShowDeleteConfirm(true);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                              title="Delete Customer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} customers
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setPagination(prev => ({...prev, page: prev.page - 1}))}
                        disabled={!pagination.hasPrev}
                        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg hover:bg-gray-50 dark:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                        Page {pagination.page} of {pagination.totalPages}
                      </span>
                      <button
                        onClick={() => setPagination(prev => ({...prev, page: prev.page + 1}))}
                        disabled={!pagination.hasNext}
                        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg hover:bg-gray-50 dark:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Customer Detail Modal */}
        {selectedCustomer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Customer Details</h2>
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {(() => {
                const customer = customers.find(c => c.id === selectedCustomer);
                if (!customer) return null;

                return (
                  <div className="space-y-6">
                    {/* Customer Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Full Name</p>
                          <p className="text-lg font-medium text-gray-900 dark:text-white">{customer.fullName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                          <p className="text-gray-900 dark:text-white">{customer.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                          <p className="text-gray-900 dark:text-white">{customer.phone}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                          <p className="text-gray-900 dark:text-white">{customer.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">City, State</p>
                          <p className="text-gray-900 dark:text-white">{customer.city}, {customer.state}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Account Status</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                            {customer.status}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Billing Information */}
                    <div className="pt-6 border-t border-gray-200 dark:border-white/10">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Billing Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
                          <p className="text-gray-900 dark:text-white font-mono">{customer.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Meter Number</p>
                          <p className="text-gray-900 dark:text-white font-mono">{customer.meterNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Connection Type</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getConnectionTypeColor(customer.connectionType)}`}>
                            {customer.connectionType}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Payment Status</p>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(customer.paymentStatus)}`}>
                            {customer.paymentStatus || 'Unknown'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Outstanding Balance</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            Rs {parseFloat(customer.outstandingBalance || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Last Bill Amount</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">
                            Rs {parseFloat(customer.lastBillAmount || 0).toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Average Monthly Usage</p>
                          <p className="text-gray-900 dark:text-white">{customer.averageMonthlyUsage} kWh</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Connection Date</p>
                          <p className="text-gray-900 dark:text-white">{customer.connectionDate}</p>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-center pt-6 border-t border-gray-200 dark:border-white/10">
                      <button
                        onClick={() => router.push(`/customer/view-bills?customerId=${customer.id}`)}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all"
                      >
                        View Bills
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Add Customer Modal - Matches Online Registration Form */}
        {showAddCustomer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Customer (Offline Registration)</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">For walk-in customers - meter will be auto-assigned</p>
                </div>
                <button
                  onClick={() => setShowAddCustomer(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddCustomer} className="space-y-4">
                {/* Personal Information */}
                <div className="border-b border-gray-200 dark:border-white/10 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Applicant Name *</label>
                  <input
                    type="text"
                    required
                        value={newCustomer.applicantName}
                        onChange={(e) => setNewCustomer({...newCustomer, applicantName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Full name as per ID"
                  />
                </div>

                <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Father's Name</label>
                      <input
                        type="text"
                        value={newCustomer.fatherName}
                        onChange={(e) => setNewCustomer({...newCustomer, fatherName: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Father's full name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                      <input
                        type="email"
                        required
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="customer@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone *</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        required
                        value={formatPKPhone(newCustomer.phone)}
                        onChange={(e) => {
                          const raw = onlyDigits(e.target.value).slice(0, 11);
                          setNewCustomer({ ...newCustomer, phone: raw });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 0300-1234567"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Alternate Phone</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={formatPKPhone(newCustomer.alternatePhone)}
                        onChange={(e) => {
                          const raw = onlyDigits(e.target.value).slice(0, 11);
                          setNewCustomer({ ...newCustomer, alternatePhone: raw });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 0300-1234567 (optional)"
                      />
                    </div>

                  </div>
                </div>

                {/* ID Verification */}
                <div className="border-b border-gray-200 dark:border-white/10 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Identity Verification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">National ID (CNIC) *</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        required
                        value={formatCNIC(newCustomer.idNumber)}
                        onChange={(e) => {
                          const raw = onlyDigits(e.target.value).slice(0, 13);
                          setNewCustomer({ ...newCustomer, idNumber: raw });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="42101-1234567-1 (13 digits)"
                      />
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">CNIC must be 13 digits (formatted 5-7-1).</p>
                    </div>
                  </div>
                </div>

                {/* Connection Details */}
                <div className="border-b border-gray-200 dark:border-white/10 pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Connection Details</h3>
                  <div className="mb-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Note:</strong> All connections are Single-Phase. One customer can have only one meter connection.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property Type *</label>
                      <select
                        required
                        value={newCustomer.propertyType}
                        onChange={(e) => {
                          setNewCustomer({
                            ...newCustomer,
                            propertyType: e.target.value as any
                          });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-white"
                      >
                        <option value="Residential">Residential</option>
                        <option value="Commercial">Commercial</option>
                        <option value="Industrial">Industrial</option>
                        <option value="Agricultural">Agricultural</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Installation Charges (Rs) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        value={newCustomer.installationCharges}
                        onChange={(e) => setNewCustomer({ ...newCustomer, installationCharges: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 5000.00"
                      />
                      <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">Enter the installation/connection charges for this customer</p>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="pb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Address Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property Address *</label>
                  <textarea
                    required
                        value={newCustomer.propertyAddress}
                        onChange={(e) => setNewCustomer({...newCustomer, propertyAddress: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                        placeholder="House/Plot number, Street name, Area"
                  />
                </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City *</label>
                    <input
                      type="text"
                      required
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State/Province *</label>
                    <input
                      type="text"
                      required
                      value={newCustomer.state}
                      onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Punjab"
                    />
                  </div>
                  <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zone *</label>
                        <select
                          required
                          value={newCustomer.zone}
                          onChange={(e) => setNewCustomer({ ...newCustomer, zone: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 [&>option]:bg-white [&>option]:text-gray-900 dark:[&>option]:bg-gray-800 dark:[&>option]:text-white"
                        >
                          <option value="">{zonesLoading ? 'Loading zones...' : 'Select Zone'}</option>
                          {zones.map((z) => (
                            <option key={z} value={z}>{z}</option>
                          ))}
                        </select>
                      </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pincode *</label>
                    <input
                      type="text"
                      required
                      pattern="[0-9]{5,6}"
                      minLength={5}
                      maxLength={6}
                      value={newCustomer.pincode}
                      onChange={(e) => setNewCustomer({...newCustomer, pincode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="5-6 digit pincode"
                    />
                  </div>
                </div>

                <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Landmark</label>
                      <input
                        type="text"
                        value={newCustomer.landmark}
                        onChange={(e) => setNewCustomer({...newCustomer, landmark: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nearby landmark (optional)"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4 border-t border-gray-200 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddCustomer(false)}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Create Customer & Auto-Assign Meter</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Customer Created Success Modal */}
        {createdCustomer && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 w-full max-w-lg border-2 border-green-500 dark:border-green-400">
              {/* Success Icon */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Customer Created Successfully!</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                  Please provide the following credentials to the customer
                </p>
              </div>

              {/* Customer Details */}
              <div className="space-y-4 mb-6">
                {/* Account Number */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <CreditCard className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Account Number</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdCustomer.accountNumber, 'Account Number')}
                      className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      title="Copy Account Number"
                    >
                      <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  <p className="text-lg font-mono font-bold text-gray-900 dark:text-white">{createdCustomer.accountNumber}</p>
                </div>

                {/* Temporary Password */}
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border-2 border-yellow-300 dark:border-yellow-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Key className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                      <span className="text-sm font-medium text-yellow-800 dark:text-yellow-400">Temporary Password</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(createdCustomer.temporaryPassword, 'Password')}
                      className="p-1.5 hover:bg-yellow-200 dark:hover:bg-yellow-800 rounded transition-colors"
                      title="Copy Password"
                    >
                      <Copy className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                    </button>
                  </div>
                  <p className="text-lg font-mono font-bold text-yellow-900 dark:text-yellow-200">{createdCustomer.temporaryPassword}</p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-500 mt-2 flex items-center">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Customer should change this password after first login
                  </p>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Name:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{createdCustomer.fullName}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status:</span>
                    <p className="font-medium text-gray-900 dark:text-white capitalize">{createdCustomer.status}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Email:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{createdCustomer.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Phone:</span>
                    <p className="font-medium text-gray-900 dark:text-white">{createdCustomer.phone}</p>
                  </div>
                </div>

                {createdCustomer.status === 'pending_installation' && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-xs text-blue-800 dark:text-blue-300 flex items-start">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                      <span>Meter number will be assigned after installation by employee. Customer can login but cannot view bills until meter is installed.</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    // Copy all details
                    const details = `Account Number: ${createdCustomer.accountNumber}\nPassword: ${createdCustomer.temporaryPassword}\nEmail: ${createdCustomer.email}`;
                    copyToClipboard(details, 'All Details');
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all flex items-center justify-center space-x-2"
                >
                  <Copy className="w-4 h-4" />
                  <span>Copy All Details</span>
                </button>
                <button
                  onClick={() => setCreatedCustomer(null)}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/50 transition-all flex items-center justify-center space-x-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Done</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditCustomer && customerToEdit && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Customer</h2>
                <button
                  onClick={() => {
                    setShowEditCustomer(false);
                    setCustomerToEdit(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                    <input
                      type="text"
                      required
                      value={customerToEdit.fullName}
                      onChange={(e) => setCustomerToEdit({...customerToEdit, fullName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={customerToEdit.email}
                      onChange={(e) => setCustomerToEdit({...customerToEdit, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      value={formatPKPhone(customerToEdit.phone)}
                      onChange={(e) => {
                        const raw = onlyDigits(e.target.value).slice(0, 11);
                        setCustomerToEdit({...customerToEdit, phone: raw});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0300-1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Meter Number</label>
                    <input
                      type="text"
                      value={customerToEdit.meterNumber || ''}
                      onChange={(e) => setCustomerToEdit({...customerToEdit, meterNumber: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Auto-assigned if empty"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
                  <textarea
                    required
                    value={customerToEdit.address}
                    onChange={(e) => setCustomerToEdit({...customerToEdit, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
                    <input
                      type="text"
                      required
                      value={customerToEdit.city}
                      onChange={(e) => setCustomerToEdit({...customerToEdit, city: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">State</label>
                    <input
                      type="text"
                      required
                      value={customerToEdit.state}
                      onChange={(e) => setCustomerToEdit({...customerToEdit, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Pincode</label>
                    <input
                      type="text"
                      required
                      value={customerToEdit.pincode}
                      onChange={(e) => setCustomerToEdit({...customerToEdit, pincode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Connection Type</label>
                    <select
                      required
                      value={customerToEdit.connectionType}
                      onChange={(e) => setCustomerToEdit({...customerToEdit, connectionType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Residential">Residential</option>
                      <option value="Commercial">Commercial</option>
                      <option value="Industrial">Industrial</option>
                      <option value="Agricultural">Agricultural</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <select
                      required
                      value={customerToEdit.status}
                      onChange={(e) => setCustomerToEdit({...customerToEdit, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="active">Active</option>
                      <option value="pending_installation">Pending Installation</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditCustomer(false);
                      setCustomerToEdit(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Update Customer</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && customerToDelete && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md border-2 border-red-500 dark:border-red-400">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Delete Customer?</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                  This will deactivate the customer account. They won't be able to login, but all data will be preserved.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Details:</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{customerToDelete.fullName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{customerToDelete.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Account: {customerToDelete.accountNumber}</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setCustomerToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteCustomer}
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:shadow-lg hover:shadow-red-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Customer</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

