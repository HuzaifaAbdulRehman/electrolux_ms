'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Calculator,
  Zap,
  TrendingUp,
  Info,
  FileText,
  RefreshCw,
  Loader2,
  BadgeDollarSign
} from 'lucide-react';

export default function BillCalculator() {
  const { data: session } = useSession();
  const router = useRouter();
  const [units, setUnits] = useState('');
  const [connectionType, setConnectionType] = useState('Residential');
  const [calculated, setCalculated] = useState(false);
  const [tariffRates, setTariffRates] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch tariffs from API
  useEffect(() => {
    fetchTariffs();
  }, []);

  // Set initial connection type when tariffs are loaded
  useEffect(() => {
    if (Object.keys(tariffRates).length > 0 && !tariffRates[connectionType]) {
      setConnectionType(Object.keys(tariffRates)[0]);
    }
  }, [tariffRates]);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/tariffs');
      if (!response.ok) throw new Error('Failed to fetch tariffs');

      const result = await response.json();
      if (result.success && result.data.length > 0) {
        const tariffsMap: any = {};

        result.data.forEach((tariff: any) => {
          // Transform slabs from normalized structure
          const slabs = tariff.slabs.map((slab: any) => ({
            min: slab.startUnits,
            max: slab.endUnits ?? Infinity,
            rate: slab.ratePerUnit,
            label: slab.range
          }));

          tariffsMap[tariff.category] = {
            name: tariff.category,
            slabs,
            fixedCharge: tariff.fixedCharge,
            electricityDutyPercent: tariff.electricityDutyPercent || 0,
            gstPercent: tariff.gstPercent || 18
          };
        });

        setTariffRates(tariffsMap);
      } else {
        throw new Error('No tariff data available');
      }
    } catch (err: any) {
      console.error('Error fetching tariffs:', err);
      setError(err.message || 'Failed to load tariffs');
    } finally {
      setLoading(false);
    }
  };

  // Single calculation function - fixes the slab calculation bug
  const calculateCharges = (units: number, tariff: any) => {
    let energyCharge = 0;
    let consumedUnits = 0;

    if (tariff.slabs) {
      for (const slab of tariff.slabs) {
        if (consumedUnits >= units) break;

        const slabStart = slab.min;
        const slabEnd = slab.max === Infinity ? units : slab.max;

        // FIXED: Calculate actual units in this slab, accounting for gaps in slab boundaries
        const unitsInSlab = Math.max(0, Math.min(units - consumedUnits, slabEnd - Math.max(slabStart, consumedUnits)));

        if (unitsInSlab > 0) {
          energyCharge += unitsInSlab * slab.rate;
          consumedUnits += unitsInSlab;
        }
      }
    }

    // Round all monetary values to whole numbers (no decimal paisa)
    energyCharge = Math.round(energyCharge);
    const fixedCharge = Math.round(tariff.fixedCharge || 0);

    // Apply electricity duty on baseAmount only (not on fixed charges)
    const electricityDuty = Math.round(energyCharge * (tariff.electricityDutyPercent / 100));

    // Apply GST on (baseAmount + fixedCharges + electricityDuty)
    const gst = Math.round((energyCharge + fixedCharge + electricityDuty) * (tariff.gstPercent / 100));

    const subtotal = Math.round(energyCharge + fixedCharge);
    const totalAmount = Math.round(energyCharge + fixedCharge + electricityDuty + gst);

    return { energyCharge, fixedCharge, subtotal, electricityDuty, gst, totalAmount };
  };

  const calculateBill = () => {
    const unitsConsumed = parseFloat(units);
    if (!unitsConsumed || unitsConsumed <= 0) {
      alert('Please enter valid units');
      return;
    }

    setCalculated(true);
  };

  const resetCalculator = () => {
    setUnits('');
    setConnectionType(Object.keys(tariffRates)[0] || 'Residential');
    setCalculated(false);
  };

  // Loading state
  if (loading) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Loading tariff rates...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Info className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Tariffs</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchTariffs}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:shadow-lg transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate all charges using the single calculation function
  const unitsConsumed = parseFloat(units) || 0;
  const selectedTariff = tariffRates[connectionType];

  if (!selectedTariff) {
    return (
      <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">No tariff data available for selected connection type</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { energyCharge, fixedCharge, subtotal, electricityDuty, gst, totalAmount } = calculateCharges(unitsConsumed, selectedTariff);

  return (
    <DashboardLayout userType="customer" userName={session?.user?.name || 'Customer'}>
      <div className="h-full flex flex-col overflow-hidden">
        {/* Compact Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10 mb-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 flex items-center">
                <Calculator className="w-6 h-6 mr-2 text-yellow-500" />
                Bill Calculator
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Calculate your electricity bill with accurate tariff rates
              </p>
            </div>
            <button
              onClick={resetCalculator}
              className="mt-3 sm:mt-0 px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center space-x-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Main Content - Scrollable */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-4">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input Section */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-500" />
              Enter Details
            </h2>

            <div className="space-y-4">
              {/* Connection Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Connection Type
                </label>
                <select
                  value={connectionType}
                  onChange={(e) => setConnectionType(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400 text-base font-medium"
                >
                  {Object.keys(tariffRates).map((category) => (
                    <option key={category} value={category} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white py-2">
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Units Consumed */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Units Consumed (kWh)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={units}
                    onChange={(e) => setUnits(e.target.value)}
                    placeholder="Enter units consumed"
                    className="w-full px-4 py-3 pl-12 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-yellow-400 text-base"
                  />
                  <Zap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" />
                </div>
              </div>

              {/* Calculate Button */}
              <button
                onClick={calculateBill}
                className="w-full px-6 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all flex items-center justify-center space-x-2 font-semibold text-lg"
              >
                <Calculator className="w-5 h-5" />
                <span>Calculate Bill</span>
              </button>
            </div>

            {/* Tariff Info */}
            <div className="mt-4 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                <Info className="w-3 h-3 mr-1 text-blue-400" />
                Current Tariff Rates - {selectedTariff.name}
              </h3>
              <div className="space-y-1">
                {selectedTariff.slabs.map((slab: any, index: number) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">{slab.label}</span>
                    <span className="text-gray-900 dark:text-white font-medium">Rs. {slab.rate}/unit</span>
                  </div>
                ))}
                <div className="flex justify-between text-xs pt-1 border-t border-blue-500/20">
                  <span className="text-gray-600 dark:text-gray-400">Fixed Charge</span>
                  <span className="text-gray-900 dark:text-white font-medium">Rs. {selectedTariff.fixedCharge}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-gray-200 dark:border-white/10">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-green-500" />
              Bill Breakdown
            </h2>

            {calculated && unitsConsumed > 0 ? (
              <div className="space-y-4">
                {/* Bill Details */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-white/10">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-yellow-500" />
                      <span className="text-gray-600 dark:text-gray-400">Energy Charges</span>
                    </div>
                    <span className="text-gray-900 dark:text-white font-semibold">Rs. {energyCharge}</span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-600 dark:text-gray-400">Fixed Charges</span>
                    <span className="text-gray-900 dark:text-white font-semibold">Rs. {fixedCharge}</span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white font-semibold">Rs. {subtotal}</span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-600 dark:text-gray-400">Electricity Duty ({selectedTariff.electricityDutyPercent}%)</span>
                    <span className="text-gray-900 dark:text-white font-semibold">Rs. {electricityDuty}</span>
                  </div>

                  <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-white/10">
                    <span className="text-gray-600 dark:text-gray-400">GST ({selectedTariff.gstPercent}%)</span>
                    <span className="text-gray-900 dark:text-white font-semibold">Rs. {gst}</span>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center pt-4">
                    <div className="flex items-center space-x-2">
                      <BadgeDollarSign className="w-5 h-5 text-green-500" />
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Total Amount</span>
                    </div>
                    <span className="text-3xl font-bold text-green-600 dark:text-green-400">Rs. {totalAmount}</span>
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Units Consumed</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{unitsConsumed}</p>
                    <p className="text-xs text-yellow-400">kWh</p>
                  </div>

                  <div className="p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Average Rate</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      Rs. {Math.round(totalAmount / unitsConsumed)}
                    </p>
                    <p className="text-xs text-green-400">per kWh</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-3">
                  <Calculator className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Calculate Your Bill
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-sm">
                  Enter connection type and units to get accurate estimate
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Additional Information - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 backdrop-blur-xl rounded-xl p-4 border border-blue-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Info className="w-4 h-4 text-blue-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">How It Works</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Bills calculated using slab-based tariff rates encouraging conservation.
            </p>
          </div>

          <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 backdrop-blur-xl rounded-xl p-4 border border-green-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Save Money</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Reduce consumption to stay in lower slabs for more savings!
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Accurate Estimates</h3>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Official tariff rates with all applicable taxes included.
            </p>
          </div>
        </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

