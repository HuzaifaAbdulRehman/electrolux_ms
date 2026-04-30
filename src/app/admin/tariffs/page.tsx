'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  DollarSign,
  Zap,
  Settings,
  Edit2,
  Save,
  Sun,
  Moon,
  CloudRain,
  Home,
  Building,
  Factory,
  TrendingUp,
  BarChart3,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

export default function TariffManagement() {
  const [selectedCategory, setSelectedCategory] = useState('residential');
  const [isEditing, setIsEditing] = useState(false);
  const [editedTariffs, setEditedTariffs] = useState<any>(null);
  
  // Real data state management
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const categories = [
    { id: 'residential', name: 'Residential', icon: Home, color: 'from-blue-500 to-cyan-500' },
    { id: 'commercial', name: 'Commercial', icon: Building, color: 'from-green-500 to-emerald-500' },
    { id: 'industrial', name: 'Industrial', icon: Factory, color: 'from-purple-500 to-pink-500' },
    { id: 'agricultural', name: 'Agricultural', icon: CloudRain, color: 'from-yellow-500 to-orange-500' }
  ];

  // Fetch tariffs from database
  useEffect(() => {
    fetchTariffs();
  }, []);

  const fetchTariffs = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('[TARIFFS] Fetching tariffs from API...');
      const response = await fetch('/api/tariffs');
      console.log('[TARIFFS] Response status:', response.status);
      const result = await response.json();
      console.log('[TARIFFS] API Result:', result);

      if (result.success) {
        console.log('[TARIFFS] Tariffs data:', result.data);
        console.log('[TARIFFS] Number of tariffs:', result.data?.length);
        setTariffs(result.data);
      } else {
        console.error('[TARIFFS] API Error:', result.error);
        setError(result.error || 'Failed to fetch tariffs');
      }
    } catch (err) {
      console.error('[TARIFFS] Network error:', err);
      setError('Network error while fetching tariffs');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentTariff = () => {
    console.log('[TARIFFS] getCurrentTariff called');
    console.log('[TARIFFS] selectedCategory:', selectedCategory);
    console.log('[TARIFFS] All tariffs:', tariffs);
    const found = tariffs.find(t => {
      console.log('[TARIFFS] Checking tariff:', t.id, 'category:', t.category, 'validUntil:', t.validUntil);
      const categoryMatch = t.category.toLowerCase() === selectedCategory;
      const isActive = !t.validUntil;
      console.log('[TARIFFS] categoryMatch:', categoryMatch, 'isActive:', isActive);
      return categoryMatch && isActive;
    });
    console.log('[TARIFFS] Found tariff:', found);
    return found;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // CRITICAL: Null safety check
      if (!editedTariffs) {
        setError('No tariff data to save');
        setSaving(false);
        return;
      }

      // Validate and convert string values to numbers before saving
      const fixedChargeNum = parseFloat(editedTariffs.fixedCharge);
      if (isNaN(fixedChargeNum) || fixedChargeNum < 0 || editedTariffs.fixedCharge === '' || editedTariffs.fixedCharge === '.') {
        setError('Fixed charge must be a valid non-negative number');
        setSaving(false);
        return;
      }

      // CRITICAL: Null safety check for slabs
      if (!editedTariffs.slabs || !Array.isArray(editedTariffs.slabs) || editedTariffs.slabs.length === 0) {
        setError('Slab rates are required');
        setSaving(false);
        return;
      }

      // Validate and convert slab rates
      const validatedSlabs = editedTariffs.slabs.map((slab: any, index: number) => {
        const rateNum = parseFloat(slab.rate);
        if (isNaN(rateNum) || rateNum <= 0 || slab.rate === '' || slab.rate === '.') {
          throw new Error(`Slab ${index + 1} rate must be a positive number`);
        }
        return {
          ...slab,
          ratePerUnit: rateNum  // Backend expects 'ratePerUnit' not 'rate'
        };
      });

      // CRITICAL: Null safety check for timeOfUse
      if (!editedTariffs.timeOfUse || !editedTariffs.timeOfUse.peak || !editedTariffs.timeOfUse.normal || !editedTariffs.timeOfUse.offPeak) {
        setError('Time-of-use rates are required');
        setSaving(false);
        return;
      }

      // Validate and convert time of use rates
      const peakRate = parseFloat(editedTariffs.timeOfUse.peak.rate);
      const normalRate = parseFloat(editedTariffs.timeOfUse.normal.rate);
      const offPeakRate = parseFloat(editedTariffs.timeOfUse.offPeak.rate);

      // Check for NaN in time of use
      if (isNaN(peakRate) || isNaN(normalRate) || isNaN(offPeakRate) ||
          editedTariffs.timeOfUse.peak.rate === '' || editedTariffs.timeOfUse.peak.rate === '.' ||
          editedTariffs.timeOfUse.normal.rate === '' || editedTariffs.timeOfUse.normal.rate === '.' ||
          editedTariffs.timeOfUse.offPeak.rate === '' || editedTariffs.timeOfUse.offPeak.rate === '.') {
        setError('All time-of-use rates must be valid numbers');
        setSaving(false);
        return;
      }

      const currentTariff = getCurrentTariff();

      // Transform frontend format to backend format
      const tariffToSave = {
        category: selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1), // Use selected category, not editedTariffs.category
        fixedCharge: fixedChargeNum,
        effectiveDate: currentTariff?.validFrom || new Date().toISOString().split('T')[0], // Use existing date or today
        validUntil: null, // New version is active
        slabs: validatedSlabs,
        // Flatten time-of-use rates to match backend format
        timeOfUsePeakRate: peakRate,
        timeOfUseNormalRate: normalRate,
        timeOfUseOffpeakRate: offPeakRate,
        // Include default values for required fields
        electricityDutyPercent: 16.0,
        gstPercent: 18.0
      };

      if (currentTariff) {
        // Update existing tariff (creates new version)
        console.log('[TARIFFS] Sending PATCH to /api/tariffs/' + currentTariff.id);
        console.log('[TARIFFS] Data being sent:', JSON.stringify(tariffToSave, null, 2));

        const response = await fetch(`/api/tariffs/${currentTariff.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tariffToSave)
        });

        console.log('[TARIFFS] Response status:', response.status);
        const result = await response.json();
        console.log('[TARIFFS] Response data:', result);

        if (response.ok) {
          setSuccess(`Tariff updated successfully! New version created.`);

          // Refresh data with error handling
          try {
            await fetchTariffs();
          } catch (fetchError) {
            console.error('Failed to refresh tariffs:', fetchError);
            setError('Tariff saved but failed to refresh. Please reload the page.');
          }

          setIsEditing(false);
          setEditedTariffs(null);

          // Clear success message after 5 seconds
          setTimeout(() => setSuccess(null), 5000);
        } else {
          setError(result.error || result.details || 'Failed to update tariff');
        }
      } else {
        // Create new tariff
        const response = await fetch('/api/tariffs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tariffToSave)
        });

        const result = await response.json();

        if (response.ok) {
          setSuccess('Tariff created successfully!');

          // Refresh data with error handling
          try {
            await fetchTariffs();
          } catch (fetchError) {
            console.error('Failed to refresh tariffs:', fetchError);
            setError('Tariff created but failed to refresh. Please reload the page.');
          }

          setIsEditing(false);
          setEditedTariffs(null);

          // Clear success message after 5 seconds
          setTimeout(() => setSuccess(null), 5000);
        } else {
          setError(result.error || result.details || 'Failed to create tariff');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Network error while saving tariff');
      console.error('Error saving tariff:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      // Enter edit mode - copy current tariff to editedTariffs
      const currentTariff = getCurrentTariff();

      // CRITICAL: Null safety check
      if (!currentTariff) {
        setError('No tariff available for the selected category');
        return;
      }

      // Deep clone with proper handling (spread operator is safer than JSON.parse)
      setEditedTariffs({
        ...currentTariff,
        slabs: currentTariff.slabs?.map((s: any) => ({ ...s })) || [],
        timeOfUse: currentTariff.timeOfUse ? {
          peak: { ...currentTariff.timeOfUse.peak },
          normal: { ...currentTariff.timeOfUse.normal },
          offPeak: { ...currentTariff.timeOfUse.offPeak }
        } : null
      });
    }
    setIsEditing(!isEditing);
  };

  const handleCancelEdit = () => {
    setEditedTariffs(null);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  const updateSlabRate = (index: number, value: string) => {
    // CRITICAL: Null safety check
    if (!editedTariffs || !editedTariffs.slabs) {
      setError('Cannot update tariff - no data loaded');
      return;
    }

    // Allow empty string or valid decimal input
    if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
      const newSlabs = [...editedTariffs.slabs];
      newSlabs[index] = { ...newSlabs[index], rate: value };
      setEditedTariffs({ ...editedTariffs, slabs: newSlabs });
      setError(null); // Clear any previous errors
    } else {
      setError('Please enter a valid number');
    }
  };

  const updateFixedCharge = (value: string) => {
    // CRITICAL: Null safety check
    if (!editedTariffs) {
      setError('Cannot update tariff - no data loaded');
      return;
    }

    // Allow empty string or valid decimal input
    if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
      setEditedTariffs({ ...editedTariffs, fixedCharge: value });
      setError(null); // Clear any previous errors
    } else {
      setError('Please enter a valid number');
    }
  };

  const updateTimeOfUseRate = (period: 'peak' | 'normal' | 'offPeak', value: string) => {
    // CRITICAL: Null safety check
    if (!editedTariffs || !editedTariffs.timeOfUse || !editedTariffs.timeOfUse[period]) {
      setError('Cannot update tariff - no data loaded');
      return;
    }

    // Allow empty string or valid decimal input
    if (value === '' || value === '.' || /^\d*\.?\d*$/.test(value)) {
      setEditedTariffs({
        ...editedTariffs,
        timeOfUse: {
          ...editedTariffs.timeOfUse,
          [period]: { ...editedTariffs.timeOfUse[period], rate: value }
        }
      });
      setError(null); // Clear any previous errors
    } else {
      setError('Please enter a valid number');
    }
  };

  const currentTariff = getCurrentTariff();
  const displayTariff = isEditing ? editedTariffs : currentTariff;

  // Keep loading check before any early returns to avoid flashing "No data"
  if (loading) {
    return (
      <DashboardLayout userType="admin" userName="Admin User">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-500" />
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tariffs...</span>
        </div>
      </DashboardLayout>
    );
  }

  if (!displayTariff) {
    return (
      <DashboardLayout userType="admin" userName="Admin User">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-600 dark:text-gray-400">No tariff data available for the selected category.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userType="admin" userName="Admin User">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Tariff Management</h1>
              <p className="text-gray-600 dark:text-gray-400">Configure electricity rates and pricing structures</p>
              {error && (
                <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <span className="text-red-700 dark:text-red-300">{error}</span>
                </div>
              )}
              {success && (
                <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-green-700 dark:text-green-300">{success}</span>
                </div>
              )}
            </div>
            <div className="mt-4 sm:mt-0 flex items-center space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-all flex items-center space-x-2"
                  >
                    <span>Cancel</span>
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all flex items-center space-x-2 disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={handleEditToggle}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all flex items-center space-x-2"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Tariff</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Category</h2>
            {isEditing && (
              <span className="text-xs text-yellow-600 dark:text-yellow-400 px-3 py-1.5 bg-yellow-50 dark:bg-yellow-400/10 rounded-lg border border-yellow-200 dark:border-yellow-400/20 flex items-center space-x-2">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Save or cancel changes to switch category</span>
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => !isEditing && setSelectedCategory(category.id)}
                disabled={isEditing}
                className={`p-4 rounded-xl border-2 transition-all flex items-center space-x-3 ${
                  selectedCategory === category.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : isEditing
                    ? 'border-gray-200 dark:border-white/10 opacity-50 cursor-not-allowed'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 cursor-pointer'
                }`}
              >
                <div className={`w-10 h-10 bg-gradient-to-r ${category.color} rounded-lg flex items-center justify-center ${isEditing && selectedCategory !== category.id ? 'opacity-50' : ''}`}>
                  <category.icon className="w-5 h-5 text-white" />
                </div>
                <span className={`font-medium ${selectedCategory === category.id ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'} ${isEditing && selectedCategory !== category.id ? 'opacity-50' : ''}`}>
                  {category.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading tariffs...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Basic Charges */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Basic Charges</h2>
                {isEditing && (
                  <span className="text-xs text-yellow-400 px-2 py-1 bg-yellow-400/10 rounded-lg border border-yellow-400/20">
                    Editing Mode
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium">Fixed Charge</p>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Monthly base charge</p>
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex items-center space-x-1">
                    <span className="text-lg font-bold text-gray-900 dark:text-white">Rs</span>
                    <input
                      type="text"
                      value={displayTariff.fixedCharge}
                      onChange={(e) => updateFixedCharge(e.target.value)}
                      placeholder="0.00"
                      className="w-24 px-2 py-1 text-lg font-bold bg-gray-50 dark:bg-white/10 border border-yellow-400/50 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                    />
                  </div>
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">Rs {displayTariff.fixedCharge}</p>
                )}
              </div>
            </div>

            {/* Tariff Information */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Tariff Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Category</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">{selectedCategory}</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Status</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-semibold">Active</span>
                  </div>
                </div>
                {currentTariff && (
                  <div>
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Effective Date</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {new Date(currentTariff.validFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Slab Rates */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Slab Rates</h2>
              </div>
              <div className="space-y-3">
                {displayTariff?.slabs && displayTariff.slabs.length > 0 ? (
                  displayTariff.slabs.map((slab: any, index: number) => (
                    <div key={index} className={`flex items-center justify-between p-4 bg-white dark:bg-white/5 rounded-xl transition-all ${
                      isEditing ? 'border-2 border-yellow-400/30' : 'hover:bg-gray-50 dark:bg-gray-50 dark:bg-white/10'
                    }`}>
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                          <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{slab.range}</p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">Consumption range</p>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="flex items-center space-x-1">
                          <span className="text-lg font-bold text-gray-900 dark:text-white">Rs</span>
                          <input
                            type="text"
                            value={slab.rate}
                            onChange={(e) => updateSlabRate(index, e.target.value)}
                            placeholder="0.00"
                            className="w-24 px-2 py-1 text-lg font-bold bg-gray-50 dark:bg-white/10 border border-yellow-400/50 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">/kWh</span>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-xl font-bold text-gray-900 dark:text-white">Rs {slab.rate}/kWh</p>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">per kWh</p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No slab rates configured for this category.
                  </div>
                )}
              </div>
            </div>

            {/* Time of Use Rates */}
            <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Time of Use Rates</h2>
              {displayTariff?.timeOfUse ? (
              <div className="space-y-3">
                <div className={`flex items-center justify-between p-4 bg-gradient-to-r from-red-500/10 to-rose-500/10 rounded-xl border ${
                  isEditing ? 'border-yellow-400/30 border-2' : 'border-red-500/20'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Sun className="w-6 h-6 text-red-400" />
                    <div>
                      <p className="text-white font-medium">Peak Hours</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{displayTariff.timeOfUse.peak?.hours || 'N/A'}</p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Rs</span>
                      <input
                        type="text"
                        value={displayTariff.timeOfUse.peak?.rate || 0}
                        onChange={(e) => updateTimeOfUseRate('peak', e.target.value)}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 text-lg font-bold bg-gray-50 dark:bg-white/10 border border-yellow-400/50 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">/kWh</span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-gray-900 dark:text-white">Rs {displayTariff.timeOfUse.peak?.rate || 0}/kWh</p>
                  )}
                </div>

                <div className={`flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-xl border ${
                  isEditing ? 'border-yellow-400/30 border-2' : 'border-blue-500/20'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Sun className="w-6 h-6 text-blue-400" />
                    <div>
                      <p className="text-white font-medium">Normal Hours</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{displayTariff.timeOfUse.normal?.hours || 'N/A'}</p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Rs</span>
                      <input
                        type="text"
                        value={displayTariff.timeOfUse.normal?.rate || 0}
                        onChange={(e) => updateTimeOfUseRate('normal', e.target.value)}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 text-lg font-bold bg-gray-50 dark:bg-white/10 border border-yellow-400/50 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">/kWh</span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-gray-900 dark:text-white">Rs {displayTariff.timeOfUse.normal?.rate || 0}/kWh</p>
                  )}
                </div>

                <div className={`flex items-center justify-between p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl border ${
                  isEditing ? 'border-yellow-400/30 border-2' : 'border-green-500/20'
                }`}>
                  <div className="flex items-center space-x-3">
                    <Moon className="w-6 h-6 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Off-Peak Hours</p>
                      <p className="text-gray-600 dark:text-gray-400 text-sm">{displayTariff.timeOfUse.offPeak?.hours || 'N/A'}</p>
                    </div>
                  </div>
                  {isEditing ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">Rs</span>
                      <input
                        type="text"
                        value={displayTariff.timeOfUse.offPeak?.rate || 0}
                        onChange={(e) => updateTimeOfUseRate('offPeak', e.target.value)}
                        placeholder="0.00"
                        className="w-24 px-2 py-1 text-lg font-bold bg-gray-50 dark:bg-white/10 border border-yellow-400/50 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-yellow-400"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">/kWh</span>
                    </div>
                  ) : (
                    <p className="text-xl font-bold text-gray-900 dark:text-white">Rs {displayTariff.timeOfUse.offPeak?.rate || 0}/kWh</p>
                  )}
                </div>
              </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No time-of-use rates configured for this category.
                </div>
              )}
            </div>

            {/* Coming Soon Notice */}
            <div className="lg:col-span-2 bg-gradient-to-r from-yellow-400/10 to-orange-500/10 backdrop-blur-xl rounded-2xl p-8 border border-yellow-400/20 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Advanced Tariff Analytics Coming Soon
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                Revenue projections, seasonal adjustments, and detailed consumption analytics will be available soon.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

