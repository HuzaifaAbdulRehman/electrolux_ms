'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { formatPKPhone, onlyDigits } from '@/lib/utils/dataHandlers';
import {
  Building,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Eye,
  Download,
  Upload,
  Mail,
  Phone,
  MapPin,
  Award,
  CheckCircle,
  XCircle,
  UserPlus,
  Activity,
  Loader2,
  AlertCircle,
  Save,
  X
} from 'lucide-react';

export default function EmployeeManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditEmployee, setShowEditEmployee] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showViewDetails, setShowViewDetails] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<any>(null);
  const [employeeToDelete, setEmployeeToDelete] = useState<any>(null);
  const [employeeToView, setEmployeeToView] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [employees, setEmployees] = useState<any[]>([]);
  const [allEmployees, setAllEmployees] = useState<any[]>([]); // For statistics
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    employeeName: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
    assignedZone: ''
  });
  const [createdEmployeeCreds, setCreatedEmployeeCreds] = useState<any>(null);
  const itemsPerPage = 10;

  // Fetch ALL employees for statistics ONCE on mount
  useEffect(() => {
    fetchAllEmployees();
  }, []);

  // Fetch filtered employees when search/filter changes
  useEffect(() => {
    fetchEmployees();
  }, [searchQuery, selectedFilter]);

  const fetchAllEmployees = async () => {
    try {
      const response = await fetch('/api/employees?limit=1000');
      const result = await response.json();
      if (result.success) {
        setAllEmployees(result.data);
      }
    } catch (err) {
      console.error('Error fetching all employees:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch filtered results
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedFilter !== 'all') params.append('department', selectedFilter);

      const response = await fetch(`/api/employees?${params.toString()}`);
      const result = await response.json();

      if (result.success) {
        setEmployees(result.data);
      } else {
        setError(result.error || 'Failed to fetch employees');
      }
    } catch (err) {
      setError('Network error while fetching employees');
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee)
      });

      if (response.ok) {
        const result = await response.json();
        await fetchEmployees(); // Refresh the list
        await fetchAllEmployees(); // Refresh statistics
        setShowAddModal(false);
        setCreatedEmployeeCreds(result.data);
        setNewEmployee({
          employeeName: '',
          email: '',
          phone: '',
          designation: '',
          department: '',
          assignedZone: ''
        });
      } else {
        const error = await response.json();
        setError(error.error || 'Failed to create employee');
      }
    } catch (err) {
      setError('Network error while creating employee');
      console.error('Error creating employee:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeToEdit) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/employees/${employeeToEdit.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employeeToEdit)
      });

      const result = await response.json();

      if (result.success) {
        await fetchEmployees(); // Refresh the list
        await fetchAllEmployees(); // Refresh statistics
        setShowEditEmployee(false);
        setEmployeeToEdit(null);
        setSuccess('Employee updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to update employee');
      }
    } catch (err) {
      setError('Network error while updating employee');
      console.error('Error updating employee:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/employees/${employeeToDelete.id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        await fetchEmployees(); // Refresh the list
        await fetchAllEmployees(); // Refresh statistics
        setShowDeleteConfirm(false);
        setEmployeeToDelete(null);
        setSuccess('Employee deactivated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to delete employee');
      }
    } catch (err) {
      setError('Network error while deleting employee');
      console.error('Error deleting employee:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleExportEmployees = () => {
    if (employees.length === 0) {
      setError('No employees to export');
      return;
    }

    // Create CSV content
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Designation', 'Department', 'Zone', 'Hire Date', 'Status'];
    const csvRows = [
      headers.join(','),
      ...employees.map(emp => [
        emp.id || '',
        `"${emp.employeeName || ''}"`,
        emp.email || '',
        emp.phone || '',
        `"${emp.designation || ''}"`,
        `"${emp.department || ''}"`,
        `"${emp.assignedZone || ''}"`,
        emp.hireDate || '',
        emp.status || 'active'
      ].join(','))
    ];

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'inactive': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const filteredEmployees = employees.filter(employee =>
    employee.employeeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    employee.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <DashboardLayout userType="admin" userName="Admin User">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Employee Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage your workforce and track performance</p>
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              <button
                onClick={handleExportEmployees}
                disabled={loading || employees.length === 0}
                className="px-4 py-2 bg-gray-50 dark:bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/20 transition-all flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-5 h-5" />
                <span>Export CSV</span>
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/50 transition-all flex items-center space-x-2"
              >
                <UserPlus className="w-5 h-5" />
                <span>Add Employee</span>
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

      {/* Employee Credentials Modal */}
      {createdEmployeeCreds && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
            <div className="text-center mb-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Employee Created!</h2>
              <p className="text-gray-600 dark:text-gray-400">Provide these credentials to the employee</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Name</p>
                <p className="font-semibold text-gray-900 dark:text-white">{createdEmployeeCreds.name}</p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Email (Username)</p>
                <p className="font-mono text-gray-900 dark:text-white">{createdEmployeeCreds.email}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-1">Temporary Password</p>
                <p className="font-mono text-xl font-bold text-yellow-900 dark:text-yellow-100">{createdEmployeeCreds.temporaryPassword}</p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">Employee should change this after first login</p>
              </div>
            </div>

            <div className="mt-6 flex items-center space-x-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdEmployeeCreds.temporaryPassword);
                  setSuccess('Password copied');
                  setTimeout(() => setSuccess(null), 2000);
                }}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Copy Password
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`Email: ${createdEmployeeCreds.email}\nPassword: ${createdEmployeeCreds.temporaryPassword}`);
                  setSuccess('Credentials copied');
                  setTimeout(() => setSuccess(null), 2000);
                }}
                className="flex-1 px-4 py-3 bg-blue-500 text_white rounded-lg hover:bg-blue-600 transition-all"
              >
                Copy All Details
              </button>
              <button
                onClick={() => setCreatedEmployeeCreds(null)}
                className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Close
              </button>
            </div>
          </div>
          </div>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              label: 'Total Employees',
              value: loading ? '...' : allEmployees.length.toString(),
              icon: Building,
              color: 'from-blue-500 to-cyan-500'
            },
            {
              label: 'Active Staff',
              value: loading ? '...' : allEmployees.filter(e => e.status === 'active').length.toString(),
              icon: CheckCircle,
              color: 'from-green-500 to-emerald-500'
            },
            {
              label: 'Work Orders',
              value: loading ? '...' : allEmployees.reduce((sum, e) => sum + (e.workOrdersCount || 0), 0).toString(),
              icon: Award,
              color: 'from-purple-500 to-pink-500'
            },
            {
              label: 'Meter Readings',
              value: loading ? '...' : allEmployees.reduce((sum, e) => sum + (e.readingsCount || 0), 0).toString(), 
              icon: Activity, 
              color: 'from-indigo-500 to-blue-500' 
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
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
                placeholder="Search employees..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 transition-colors"
              >
                <option value="all" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">All Departments</option>
                <option value="Operations" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Operations</option>
                <option value="Field Operations" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Field Operations</option>
                <option value="Customer Service" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Customer Service</option>
                <option value="Technical Support" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Technical Support</option>
                <option value="Billing" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Billing</option>
                <option value="Maintenance" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Maintenance</option>
                <option value="Technical" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">Technical</option>
              </select>
            </div>
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              <span className="ml-3 text-gray-600 dark:text-gray-400">Loading employees...</span>
            </div>
          ) : (
            <>
          <div className="overflow-x-auto">
            <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Performance</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                {paginatedEmployees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-pink-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-sm">
                                {employee.employeeName?.charAt(0) || 'E'}
                          </span>
                        </div>
                        <div>
                              <p className="text-gray-900 dark:text-white font-medium">{employee.employeeName}</p>
                              <p className="text-gray-600 dark:text-gray-400 text-sm">{employee.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{employee.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          <span className="text-gray-700 dark:text-gray-300 text-sm">{employee.phone}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                            <p className="text-gray-900 dark:text-white font-medium">{employee.department}</p>
                            {employee.assignedZone && (
                              <div className="flex items-center space-x-1 mt-1">
                                <MapPin className="w-3 h-3 text-gray-500" />
                                <span className="text-gray-600 dark:text-gray-400 text-xs">{employee.assignedZone}</span>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Work Orders</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{employee.workOrdersCount || 0}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-600 dark:text-gray-400">Readings</span>
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{employee.readingsCount || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(employee.status)}`}>
                            <span className="capitalize">{employee.status?.replace('-', ' ') || 'Unknown'}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                            <button
                              onClick={() => {
                                setEmployeeToView(employee);
                                setShowViewDetails(true);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/10 rounded-lg transition-all"
                              title="View Details"
                            >
                          <Eye className="w-4 h-4" />
                        </button>
                            <button
                              onClick={() => {
                                setEmployeeToEdit(employee);
                                setShowEditEmployee(true);
                              }}
                              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white hover:bg-gray-50 dark:bg-white/10 rounded-lg transition-all"
                              title="Edit Employee"
                            >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEmployeeToDelete(employee);
                            setShowDeleteConfirm(true);
                          }}
                          className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                          title="Delete Employee"
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
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredEmployees.length)} of {filteredEmployees.length} employees
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg hover:bg-gray-50 dark:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
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

        {/* Add Employee Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Employee</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddEmployee} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.employeeName}
                    onChange={(e) => setNewEmployee({...newEmployee, employeeName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    required
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    required
                    value={formatPKPhone(newEmployee.phone)}
                    onChange={(e) => {
                      const raw = onlyDigits(e.target.value).slice(0, 11);
                      setNewEmployee({...newEmployee, phone: raw});
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    placeholder="0300-1234567"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Designation</label>
                  <input
                    type="text"
                    required
                    value={newEmployee.designation}
                    onChange={(e) => setNewEmployee({...newEmployee, designation: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department</label>
                  <select
                    required
                    value={newEmployee.department}
                    onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    <option value="" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Select Department</option>
                    <option value="Operations" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Operations</option>
                    <option value="Field Operations" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Field Operations</option>
                    <option value="Customer Service" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Customer Service</option>
                    <option value="Technical Support" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Technical Support</option>
                    <option value="Technical" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Technical</option>
                    <option value="Billing" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Billing</option>
                    <option value="Maintenance" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned Zone (Optional)</label>
                  <input
                    type="text"
                    value={newEmployee.assignedZone}
                    onChange={(e) => setNewEmployee({...newEmployee, assignedZone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Create Employee</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Employee Details Modal */}
        {showViewDetails && employeeToView && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Employee Details</h2>
                <button
                  onClick={() => { setShowViewDetails(false); setEmployeeToView(null); }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{employeeToView.employeeName}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                    <p className="text-gray-900 dark:text-white break-words">{employeeToView.email}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                    <p className="text-gray-900 dark:text-white">{employeeToView.phone}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Department</p>
                    <p className="text-gray-900 dark:text-white">{employeeToView.department || '—'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Designation</p>
                    <p className="text-gray-900 dark:text-white">{employeeToView.designation || '—'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Assigned Zone</p>
                    <p className="text-gray-900 dark:text-white">{employeeToView.assignedZone || '—'}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                    <p className="text-gray-900 dark:text-white capitalize">{(employeeToView.status || 'active').replace('-', ' ')}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Work Orders</p>
                    <p className="text-gray-900 dark:text-white">{employeeToView.workOrdersCount || 0}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Readings</p>
                    <p className="text-gray-900 dark:text-white">{employeeToView.readingsCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  onClick={() => { setShowViewDetails(false); setEmployeeToView(null); }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
            <CheckCircle className="w-5 h-5" />
            <span>{success}</span>
          </div>
        )}

        {/* Edit Employee Modal */}
        {showEditEmployee && employeeToEdit && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Employee</h2>
                <button
                  onClick={() => {
                    setShowEditEmployee(false);
                    setEmployeeToEdit(null);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditEmployee} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee Name</label>
                    <input
                      type="text"
                      required
                      value={employeeToEdit.employeeName}
                      onChange={(e) => setEmployeeToEdit({...employeeToEdit, employeeName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                    <input
                      type="email"
                      required
                      value={employeeToEdit.email}
                      onChange={(e) => setEmployeeToEdit({...employeeToEdit, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      value={formatPKPhone(employeeToEdit.phone)}
                      onChange={(e) => {
                        const raw = onlyDigits(e.target.value).slice(0, 11);
                        setEmployeeToEdit({...employeeToEdit, phone: raw});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="0300-1234567"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Designation</label>
                    <input
                      type="text"
                      required
                      value={employeeToEdit.designation}
                      onChange={(e) => setEmployeeToEdit({...employeeToEdit, designation: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Department</label>
                    <input
                      type="text"
                      required
                      value={employeeToEdit.department}
                      onChange={(e) => setEmployeeToEdit({...employeeToEdit, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Assigned Zone</label>
                    <input
                      type="text"
                      value={employeeToEdit.assignedZone || ''}
                      onChange={(e) => setEmployeeToEdit({...employeeToEdit, assignedZone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-white/10 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                    <select
                      required
                      value={employeeToEdit.status}
                      onChange={(e) => setEmployeeToEdit({...employeeToEdit, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditEmployee(false);
                      setEmployeeToEdit(null);
                    }}
                    className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-white/10 rounded-lg hover:bg-gray-200 dark:bg-white/20 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg hover:shadow-lg hover:shadow-pink-500/50 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Update Employee</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && employeeToDelete && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md border-2 border-red-500 dark:border-red-400">
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center">Delete Employee?</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 text-center">
                  This will deactivate the employee account. They won't be able to login, but all work history will be preserved.
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Employee Details:</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{employeeToDelete.employeeName}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{employeeToDelete.email}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{employeeToDelete.designation} - {employeeToDelete.department}</p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setEmployeeToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEmployee}
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
                      <span>Delete Employee</span>
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

