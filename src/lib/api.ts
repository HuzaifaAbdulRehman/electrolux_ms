import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// API helper functions
export const apiClient = {
  // Dashboard
  getDashboard: () => api.get('/api/dashboard'),

  // Customers
  getCustomers: (params?: any) => api.get('/api/customers', { params }),
  getCustomer: (id: number) => api.get(`/api/customers/${id}`),
  createCustomer: (data: any) => api.post('/api/customers', data),
  updateCustomer: (id: number, data: any) => api.patch(`/api/customers/${id}`, data),
  deleteCustomer: (id: number) => api.delete(`/api/customers/${id}`),

  // Bills
  getBills: (params?: any) => api.get('/api/bills', { params }),
  getBill: (id: number) => api.get(`/api/bills/${id}`),
  generateBill: (data: any) => api.post('/api/bills/generate', data),

  // Payments
  getPayments: (params?: any) => api.get('/api/payments', { params }),
  processPayment: (data: any) => api.post('/api/payments', data),

  // Meter Readings
  getMeterReadings: (params?: any) => api.get('/api/meter-readings', { params }),
  recordMeterReading: (data: any) => api.post('/api/meter-readings', data),

  // Employees
  getEmployees: (params?: any) => api.get('/api/employees', { params }),
  createEmployee: (data: any) => api.post('/api/employees', data),

  // Tariffs
  getTariffs: () => api.get('/api/tariffs'),
  createTariff: (data: any) => api.post('/api/tariffs', data),

  // Work Orders
  getWorkOrders: (params?: any) => api.get('/api/work-orders', { params }),
  createWorkOrder: (data: any) => api.post('/api/work-orders', data),
  updateWorkOrder: (id: number, data: any) => api.patch(`/api/work-orders/${id}`, data),
};

export default api;

