'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Zap,
  AlertTriangle,
  Lightbulb,
  Shield,
  Phone
} from 'lucide-react';
import { calculateTariffSlabs, safeNumber as utilSafeNumber, safeString as utilSafeString, formatCurrency } from '@/lib/utils/dataHandlers';

// Utility function to safely handle numbers and avoid NaN/NULL
const safeNumber = (value: any, defaultValue: number = 0): number => {
  if (value === null || value === undefined || value === '') return defaultValue;
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? defaultValue : num;
};

const safeString = (value: any, defaultValue: string = 'N/A'): string => {
  return value === null || value === undefined || value === '' ? defaultValue : String(value);
};

interface BillData {
  billNumber: string;
  issueDate: string;
  dueDate: string;
  status: string;
  customer: {
    name: string;
    accountNumber: string;
    meterNumber: string;
    address: string;
    connectionType: string;
    billingMonth: string;
  };
  reading: {
    previous: number;
    current: number;
    previousDate: string;
    currentDate: string;
    unitsConsumed: number;
  };
  charges: {
    slabs: Array<{
      range: string;
      units: number;
      rate: number;
      amount: number;
    }>;
    energyCharge: number;
    fixedCharge: number;
    subtotal: number;
    electricityDuty: number;
    gst: number;
    total: number;
  };
  history: Array<{
    month: string;
    units: number;
    amount: number;
  }>;
}

function BillViewInner() {
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const billId = searchParams.get('id');
  const [billData, setBillData] = useState<BillData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (billId) {
      fetchBillData(billId);
    } else {
      // If no bill ID, fetch the most recent bill
      fetchRecentBill();
    }
  }, [billId]);

  const fetchRecentBill = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/bills?limit=1');
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        await formatBillData(result.data[0]);
      }
    } catch (error) {
      console.error('Error fetching recent bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillData = async (id: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bills?id=${id}`);
      const result = await response.json();
      if (result.success && result.data.length > 0) {
        await formatBillData(result.data[0]);
      }
    } catch (error) {
      console.error('Error fetching bill:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBillData = async (bill: any) => {
    // Fetch customer profile
    const customerResponse = await fetch('/api/customers/profile');
    const customerResult = await customerResponse.json();
    const customer = customerResult.data;

    // Fetch 6-month history
    const historyResponse = await fetch('/api/bills?limit=6');
    const historyResult = await historyResponse.json();

    const history = historyResult.data.slice(0, 6).reverse().map((b: any) => ({
      month: new Date(b.billingMonth).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      units: parseFloat(safeNumber(b.unitsConsumed).toFixed(2)),
      amount: parseFloat(safeNumber(b.totalAmount).toFixed(2))
    }));

    // Calculate slab breakdown using shared utility function with real tariff slabs from DB
    const units = parseFloat(safeNumber(bill.unitsConsumed).toFixed(2));
    const slabs = calculateTariffSlabs(units, bill.tariffSlabs).map(slab => ({
      ...slab,
      units: parseFloat(slab.units.toFixed(2)),
      rate: parseFloat(slab.rate.toFixed(2)),
      amount: parseFloat(slab.amount.toFixed(2))
    }));

    const energyCharge = parseFloat(safeNumber(bill.baseAmount).toFixed(2));
    const fixedCharge = parseFloat(safeNumber(bill.fixedCharges).toFixed(2));
    const subtotal = parseFloat((energyCharge + fixedCharge).toFixed(2));
    const electricityDuty = parseFloat(safeNumber(bill.electricityDuty).toFixed(2));
    const gst = parseFloat(safeNumber(bill.gstAmount).toFixed(2));
    const total = parseFloat(safeNumber(bill.totalAmount).toFixed(2));

    setBillData({
      billNumber: safeString(bill.billNumber, 'N/A'),
      issueDate: new Date(bill.issueDate).toLocaleDateString(),
      dueDate: new Date(bill.dueDate).toLocaleDateString(),
      status: safeString(bill.status, 'PENDING').toUpperCase(),
      customer: {
        name: safeString(customer?.fullName, session?.user?.name || 'Customer'),
        accountNumber: safeString(customer?.accountNumber, 'N/A'),
        meterNumber: safeString(customer?.meterNumber, 'N/A'),
        address: safeString(customer?.address, 'Address not available'),
        connectionType: safeString(customer?.connectionType, 'Residential'),
        billingMonth: new Date(bill.billingMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      },
      reading: {
        previous: parseFloat(safeNumber(bill.previousReading, 0).toFixed(2)),
        current: parseFloat(safeNumber(bill.currentReading, 0).toFixed(2)),
        previousDate: bill.readingDate ? new Date(new Date(bill.readingDate).setMonth(new Date(bill.readingDate).getMonth() - 1)).toLocaleDateString() : new Date(bill.billingMonth).toLocaleDateString(),
        currentDate: bill.readingDate ? new Date(bill.readingDate).toLocaleDateString() : new Date(bill.issueDate).toLocaleDateString(),
        unitsConsumed: units
      },
      charges: {
        slabs,
        energyCharge,
        fixedCharge,
        subtotal,
        electricityDuty,
        gst,
        total
      },
      history
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  if (!billData) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Bill Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400">The requested bill could not be loaded or you have no bills yet.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          html, body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
          }
          body, .print-container, .bg-white {
            background: white !important;
            box-shadow: none !important;
            color: #222 !important;
          }
          .bg-gradient-to-r {
            background: linear-gradient(to right, #facc15, #f97316) !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color: #fff !important;
          }
          .bg-gray-800 {
            background: #1f2937 !important;
            color: #fff !important;
          }
          h1, h2 {
            color: #fff !important;
            font-weight: bold !important;
          }
          /* PAID watermark - ensure it prints */
          .text-9xl {
            font-size: 12rem !important;
            color: #16a34a !important;
            opacity: 0.1 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print, nav, .sidebar, button {
            display: none !important;
          }
          .page-break {
            display: block !important;
            page-break-before: always !important;
            break-before: page !important;
            height: 0 !important;
          }
          @page {
            margin: 0.3cm;
          }
        }
      `}</style>

      {/* Bill Content */}
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 print-container">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 lg:px-6">
          {/* Print Button */}
          <div className="mb-4 no-print">
            <button
              onClick={() => window.print()}
              className="px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
            >
              Print Bill
            </button>
          </div>

          {/* Bill Container - Page 1 */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden relative">
            {/* PAID Watermark - Only shows when bill is paid */}
            {billData.status === 'PAID' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="transform -rotate-45 opacity-10">
                  <p className="text-9xl font-black text-green-600" style={{ fontSize: '12rem', letterSpacing: '0.5rem' }}>
                    PAID
                  </p>
                </div>
              </div>
            )}
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">ELECTROLUX</h1>
                  <p className="text-white/90 text-xs">Electricity Management System</p>
                </div>
                <div className="text-right text-xs text-white">
                  <p>1-800-ELECTRIC</p>
                  <p>www.electrolux.com</p>
                </div>
              </div>
            </div>

            {/* Bill Title */}
            <div className="bg-gray-800 px-6 py-2">
              <h2 className="text-xl font-bold text-white text-center">ELECTRICITY BILL</h2>
            </div>

            {/* Bill Body */}
            <div className="px-6 py-3 space-y-3">
              {/* Customer & Bill Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Information */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400">
                    CUSTOMER INFORMATION
                  </h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Name:</span>
                      <span className="text-gray-900 font-semibold">{billData.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Account No:</span>
                      <span className="text-gray-900 font-semibold">{billData.customer.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Meter No:</span>
                      <span className="text-gray-900 font-semibold">{billData.customer.meterNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Connection Type:</span>
                      <span className="text-gray-900 font-semibold">{billData.customer.connectionType}</span>
                    </div>
                    <div className="pt-2">
                      <p className="text-gray-600 font-medium mb-1">Address:</p>
                      <p className="text-gray-900 text-sm">{billData.customer.address}</p>
                    </div>
                  </div>
                </div>

                {/* Bill Details */}
                <div>
                  <h3 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400">
                    BILLING DETAILS
                  </h3>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Bill Number:</span>
                      <span className="text-gray-900 font-semibold">{billData.billNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Billing Month:</span>
                      <span className="text-gray-900 font-semibold">{billData.customer.billingMonth}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Issue Date:</span>
                      <span className="text-gray-900 font-semibold">{billData.issueDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Due Date:</span>
                      <span className="text-red-600 font-bold">{billData.dueDate}</span>
                    </div>
                    <div className="flex justify-between pt-2">
                      <span className="text-gray-600 font-medium">Payment Status:</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        billData.status === 'PAID'
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : billData.status === 'OVERDUE'
                          ? 'bg-red-100 text-red-800 border border-red-300'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-300'
                      }`}>
                        {billData.status === 'PAID' && '✓ '}
                        {billData.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Meter Reading */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400">
                  METER READING
                </h3>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-xs text-gray-600">Previous</p>
                    <p className="text-lg font-bold text-gray-900">{billData.reading.previous.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{billData.reading.previousDate}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-xs text-gray-600">Current</p>
                    <p className="text-lg font-bold text-gray-900">{billData.reading.current.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{billData.reading.currentDate}</p>
                  </div>
                  <div className="bg-yellow-50 p-2 rounded">
                    <p className="text-xs text-gray-600">Consumed</p>
                    <p className="text-lg font-bold text-orange-600">{billData.reading.unitsConsumed.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-gray-500">kWh</p>
                  </div>
                </div>
              </div>

              {/* Charges Breakdown */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-2 pb-1 border-b-2 border-yellow-400">
                  CHARGES BREAKDOWN
                </h3>

                {/* Slab Details */}
                <div className="mb-2">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-2 py-1 text-left text-gray-700 font-semibold">Range</th>
                        <th className="px-2 py-1 text-right text-gray-700 font-semibold">Units</th>
                        <th className="px-2 py-1 text-right text-gray-700 font-semibold">Rate</th>
                        <th className="px-2 py-1 text-right text-gray-700 font-semibold">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {billData.charges.slabs.map((slab, index) => (
                        <tr key={index}>
                          <td className="px-2 py-1 text-gray-600">{slab.range}</td>
                          <td className="px-2 py-1 text-right text-gray-900">{slab.units.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                          <td className="px-2 py-1 text-right text-gray-900">{formatCurrency(slab.rate, 'Rs.')}</td>
                          <td className="px-2 py-1 text-right text-gray-900 font-semibold">{formatCurrency(slab.amount, 'Rs.')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 p-2 rounded space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Energy Charges:</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(billData.charges.energyCharge, 'Rs.')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Fixed Charges:</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(billData.charges.fixedCharge, 'Rs.')}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-300">
                    <span className="text-gray-700 font-medium">Subtotal:</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(billData.charges.subtotal, 'Rs.')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Electricity Duty:</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(billData.charges.electricityDuty, 'Rs.')}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">GST (18%):</span>
                    <span className="text-gray-900 font-semibold">{formatCurrency(billData.charges.gst, 'Rs.')}</span>
                  </div>
                  <div className="flex justify-between text-base pt-2 border-t-2 border-gray-400">
                    <span className="text-gray-900 font-bold">TOTAL AMOUNT:</span>
                    <span className="text-orange-600 font-bold text-lg">{formatCurrency(billData.charges.total, 'Rs.')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* PAGE BREAK */}
          <div className="page-break"></div>

          {/* Page 2: Usage History & Payment Info */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden mt-6 print:mt-0 relative">
            {/* PAID Watermark - Page 2 */}
            {billData.status === 'PAID' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                <div className="transform -rotate-45 opacity-10">
                  <p className="text-9xl font-black text-green-600" style={{ fontSize: '12rem', letterSpacing: '0.5rem' }}>
                    PAID
                  </p>
                </div>
              </div>
            )}
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 px-6 py-2">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-white">USAGE HISTORY & PAYMENT INFO</h2>
                  <p className="text-white/90 text-xs">{billData.billNumber} | {billData.customer.billingMonth}</p>
                </div>
                <p className="text-white text-xs">Page 2 of 2</p>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Payment Notice */}
                <div className="space-y-2">
                  <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded">
                    <h3 className="text-sm font-bold text-orange-900 mb-2">PAYMENT DUE</h3>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-orange-800">Amount:</span>
                        <span className="text-xl font-bold text-orange-600">{formatCurrency(billData.charges.total, 'Rs.')}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-orange-700">Due Date:</span>
                        <span className="font-bold text-orange-900">{billData.dueDate}</span>
                      </div>
                      <p className="text-xs text-orange-700 mt-2 pt-2 border-t border-orange-200">
                        Pay online at www.electrolux.com/pay or via mobile app
                      </p>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 p-2 rounded text-xs">
                    <p className="text-blue-800">
                      <span className="font-bold">Avg. Daily:</span> {billData.reading.unitsConsumed ? (billData.reading.unitsConsumed / 30).toFixed(2) : '0.00'} kWh
                      <span className="mx-2">•</span>
                      <span className="font-bold">Tariff:</span> {billData.customer.connectionType} Slab
                    </p>
                  </div>
                </div>

                {/* Right: 6-Month Usage History Chart */}
                <div>
                  <h3 className="text-xs font-bold text-gray-900 mb-2 pb-1 border-b border-yellow-400 flex items-center">
                    <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                    6-MONTH USAGE HISTORY
                  </h3>
                  <div className="grid grid-cols-6 gap-1">
                    {billData.history.map((record, index) => {
                      const maxUnits = Math.max(...billData.history.map(h => h.units), 1);
                      const heightPercent = (record.units / maxUnits) * 100;
                      const isCurrentMonth = index === billData.history.length - 1;
                      return (
                        <div key={index} className="text-center">
                          <div className="h-14 flex flex-col justify-end mb-1">
                            <div
                              className={`w-full rounded-t transition-all ${
                                isCurrentMonth ? 'bg-yellow-500' : 'bg-blue-400'
                              }`}
                              style={{ height: `${heightPercent}%` }}
                            ></div>
                          </div>
                          <p className={`text-xs font-semibold ${isCurrentMonth ? 'text-yellow-600' : 'text-gray-700'}`}>
                            {record.units.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 })}
                          </p>
                          <p className="text-xs text-gray-500">{record.month.split(' ')[0]}</p>
                          <p className={`text-xs ${isCurrentMonth ? 'text-yellow-600 font-semibold' : 'text-gray-500'}`}>
                            {formatCurrency(record.amount, 'Rs.', 0)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Important Information */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-4">
                <div className="bg-green-50 border-l-2 border-green-500 p-1.5">
                  <h3 className="text-xs font-bold text-green-900 mb-0.5 flex items-center">
                    <Lightbulb className="w-3 h-3 mr-1" />
                    ENERGY SAVING TIPS
                  </h3>
                  <p className="text-xs text-green-800 leading-tight">
                    Use LED bulbs, set AC to 24°C, shift usage to off-peak hours (10PM-6AM)
                  </p>
                </div>

                <div className="bg-blue-50 border-l-2 border-blue-500 p-1.5">
                  <h3 className="text-xs font-bold text-blue-900 mb-0.5 flex items-center">
                    <Shield className="w-3 h-3 mr-1" />
                    SAFETY
                  </h3>
                  <p className="text-xs text-blue-800 leading-tight">
                    Report power outages, damaged wires, or meter tampering immediately
                  </p>
                </div>

                <div className="bg-purple-50 border-l-2 border-purple-500 p-1.5">
                  <h3 className="text-xs font-bold text-purple-900 mb-0.5 flex items-center">
                    <Phone className="w-3 h-3 mr-1" />
                    CUSTOMER SUPPORT
                  </h3>
                  <p className="text-xs text-purple-800 leading-tight">
                    24/7 Helpline: 1-800-ELECTRIC | Emergency: 911
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-4 pt-3 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  This is a computer-generated bill. For queries, visit www.electrolux.com or call customer service.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function BillView() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <BillViewInner />
    </Suspense>
  );
}

