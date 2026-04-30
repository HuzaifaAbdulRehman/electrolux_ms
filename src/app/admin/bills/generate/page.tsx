'use client';

import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useToast } from '@/hooks/useToast';
import {
  FileText,
  Calendar,
  Zap,
  Users,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Download,
  PlayCircle,
  Eye,
  Loader2
} from 'lucide-react';

export default function BulkBillGeneration() {
  const toast = useToast();
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationResult, setGenerationResult] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Load preview data when month changes
  const handleLoadPreview = async () => {
    try {
      setLoadingPreview(true);
      setPreviewData(null); // Clear previous data

      console.log('[Load Preview] Fetching preview for:', selectedMonth);

      const response = await fetch(`/api/bills/preview?month=${selectedMonth}-01`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[Load Preview] API Response:', result);

      if (result.success && result.data) {
        // Map API response to expected structure
        setPreviewData({
          total_customers: result.data.summary.totalActiveCustomers,
          with_readings: result.data.summary.customersWithReadings,
          without_readings: result.data.summary.customersWithoutReadings,
          eligible_for_generation: result.data.summary.eligibleForGeneration,
          estimated_revenue: result.data.summary.estimatedRevenue,
          category_breakdown: result.data.categoryBreakdown,
          issues: result.data.issues,
          existing_bills: result.data.existingBills
        });

        toast.success(`Preview loaded: ${result.data.summary.eligibleForGeneration} customers eligible`);
      } else {
        console.error('Preview error:', result.error);
        toast.error(result.error || 'Failed to load preview');
        setPreviewData(null);
      }
    } catch (error: any) {
      console.error('Preview load error:', error);
      toast.error(`Failed to load preview: ${error.message}`);
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handle bulk bill generation
  const handleGenerateBills = async () => {
    setIsGenerating(true);
    setGenerationProgress(0);
    setGenerationResult(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 300);

      const response = await fetch('/api/bills/generate-bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingMonth: selectedMonth + '-01',
        }),
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      const result = await response.json();

      if (response.ok && result.success) {
        setGenerationResult({
          success: true,
          ...result.summary,
          generatedBills: result.generatedBills,
          failed: result.failed
        });
      } else {
        setGenerationResult({
          success: false,
          error: result.error || 'Failed to generate bills',
          details: result.details
        });
      }
    } catch (error) {
      console.error('Bulk generation error:', error);
      setGenerationResult({
        success: false,
        error: 'Network error during bill generation',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setTimeout(() => {
        setIsGenerating(false);
      }, 500);
    }
  };

  const handleDownloadReport = () => {
    // Generate CSV report
    if (!generationResult) return;

    const csvContent = [
      ['Billing Month', 'Total Customers', 'Bills Generated', 'Failed', 'Total Amount'],
      [
        selectedMonth,
        generationResult.totalProcessed,
        generationResult.billsGenerated,
        generationResult.failedCount || 0,
        generationResult.totalAmount || 'N/A'
      ]
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bill-generation-report-${selectedMonth}.csv`;
    a.click();
  };

  return (
    <DashboardLayout userType="admin" userName="Admin">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Bulk Bill Generation</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Generate monthly bills for all customers at once</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>

        {/* Bill Generation Controls */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Select Billing Period</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Month Selection */}
            <div>
              <label className="text-sm text-gray-700 dark:text-gray-300 mb-2 block font-medium">
                Billing Month
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 dark:text-gray-400 pointer-events-none z-10" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(e.target.value);
                    setGenerationResult(null);
                    setPreviewData(null);
                  }}
                  max={new Date().toISOString().slice(0, 7)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-400 transition-all cursor-pointer"
                />
              </div>
            </div>

            {/* Preview Button */}
            <div className="flex items-end">
              <button
                onClick={handleLoadPreview}
                disabled={isGenerating || loadingPreview}
                className={`w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg transition-all font-semibold flex items-center justify-center space-x-2 ${
                  isGenerating || loadingPreview
                    ? 'opacity-70 cursor-not-allowed'
                    : 'hover:shadow-lg hover:shadow-blue-500/30 cursor-pointer'
                }`}
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4" />
                    <span>Load Preview</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Preview Statistics */}
          {previewData && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                <div className="bg-white dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400/50 transition-all">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Customers</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{previewData.total_customers}</p>
                </div>

                <div className="bg-white dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10 hover:border-green-400 dark:hover:border-green-400/50 transition-all">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">With Meter Readings</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">{previewData.with_readings}</p>
                </div>

                <div className="bg-white dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10 hover:border-orange-400 dark:hover:border-orange-400/50 transition-all">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">No Readings</p>
                  <p className="text-xl font-bold text-orange-600 dark:text-orange-400">{previewData.without_readings}</p>
                </div>

                <div className="bg-white dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-400/50 transition-all">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Eligible for Generation</p>
                  <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{previewData.eligible_for_generation}</p>
                </div>
              </div>

              {/* Existing Bills Information */}
              {previewData.existing_bills && previewData.existing_bills.total > 0 && (
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Bills Already Generated</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {previewData.existing_bills.total} bills exist for {selectedMonth}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Amount</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">
                        Rs {previewData.existing_bills.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Status Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
                    <div className="bg-yellow-500/20 backdrop-blur-sm rounded-lg p-3 border border-yellow-500/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Pending</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{previewData.existing_bills.statusCounts.pending}</p>
                    </div>
                    <div className="bg-blue-500/20 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Issued</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{previewData.existing_bills.statusCounts.issued}</p>
                    </div>
                    <div className="bg-green-500/20 backdrop-blur-sm rounded-lg p-3 border border-green-500/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Paid</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{previewData.existing_bills.statusCounts.paid}</p>
                    </div>
                    <div className="bg-red-500/20 backdrop-blur-sm rounded-lg p-3 border border-red-500/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Overdue</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{previewData.existing_bills.statusCounts.overdue}</p>
                    </div>
                    <div className="bg-gray-500/20 backdrop-blur-sm rounded-lg p-3 border border-gray-500/30">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Cancelled</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">{previewData.existing_bills.statusCounts.cancelled}</p>
                    </div>
                  </div>

                  {/* Confirmation Message and Actions */}
                  <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Bills have been generated for this billing period</span>
                    </div>
                    <button
                      onClick={() => window.open(`/admin/bills?month=${selectedMonth}`, '_blank')}
                      className="px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/50 transition-all flex items-center space-x-2 text-sm font-medium"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Bills</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Estimated Revenue */}
              {previewData.estimated_revenue > 0 && (
                <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-lg p-4 border border-gray-200 dark:border-white/10 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {previewData.existing_bills && previewData.existing_bills.total > 0
                          ? 'Additional Revenue'
                          : 'Estimated Revenue'
                        }
                      </p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">Rs {previewData.estimated_revenue.toLocaleString()}</p>
                    </div>
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Issues/Warnings Display */}
              {previewData.issues && previewData.issues.length > 0 && (
                <div className="space-y-3 mb-6">
                  {previewData.issues.map((issue: any, index: number) => (
                    <div
                      key={index}
                      className={`bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border ${
                        issue.type === 'error'
                          ? 'border-red-500/30 dark:border-red-500/50'
                          : issue.type === 'warning'
                          ? 'border-yellow-500/30 dark:border-yellow-500/50'
                          : 'border-blue-500/30 dark:border-blue-500/50'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <AlertCircle
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            issue.type === 'error'
                              ? 'text-red-500'
                              : issue.type === 'warning'
                              ? 'text-yellow-500'
                              : 'text-blue-500'
                          }`}
                        />
                        <div>
                          <h4 className="text-gray-900 dark:text-white font-semibold capitalize mb-1">{issue.type}</h4>
                          <p className="text-gray-600 dark:text-gray-400 text-sm">{issue.message}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateBills}
            disabled={isGenerating || !previewData || (previewData.eligible_for_generation === 0)}
            className={`w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg transition-all font-semibold flex items-center justify-center space-x-2 ${
              isGenerating || !previewData || (previewData.eligible_for_generation === 0)
                ? 'opacity-70 cursor-not-allowed'
                : 'hover:shadow-lg hover:shadow-blue-500/30'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating Bills... {generationProgress}%</span>
              </>
            ) : previewData && previewData.existing_bills && previewData.existing_bills.total > 0 && previewData.eligible_for_generation > 0 ? (
              <>
                <Zap className="w-5 h-5" />
                <span>Generate Bills for Remaining {previewData.eligible_for_generation} Customers</span>
              </>
            ) : previewData && previewData.eligible_for_generation === 0 ? (
              <>
                <CheckCircle className="w-5 h-5" />
                <span>All Bills Already Generated for {selectedMonth}</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                <span>Generate Bills for {selectedMonth}</span>
              </>
            )}
          </button>

          {/* Progress Bar */}
          {isGenerating && (
            <div className="mt-3">
              <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${generationProgress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Generation Result */}
        {generationResult && (
          <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900 dark:text-white font-bold text-lg">Bills Generated Successfully!</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Generation completed for {selectedMonth}
                  </p>
                </div>
              </div>
              <button
                onClick={handleDownloadReport}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all font-semibold flex items-center space-x-2 text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download Report</span>
              </button>
            </div>

            {/* Result Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="bg-white dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Processed</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{generationResult.totalProcessed || 0}</p>
              </div>

              <div className="bg-white dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Bills Generated</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">{generationResult.billsGenerated || 0}</p>
              </div>

              <div className="bg-white dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Failed</p>
                <p className="text-xl font-bold text-red-600 dark:text-red-400">{generationResult.failedCount || 0}</p>
              </div>

              <div className="bg-white dark:bg-white/5 rounded-lg p-3 border border-gray-200 dark:border-white/10">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Success Rate</p>
                <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
                  {generationResult.totalProcessed > 0
                    ? ((generationResult.billsGenerated / generationResult.totalProcessed) * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
            </div>

            {/* Details */}
            {generationResult.details && (
              <div className="mt-4 bg-gray-50 dark:bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-gray-200 dark:border-white/10">
                <h4 className="text-gray-900 dark:text-white font-semibold mb-2">Generation Details</h4>
                <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  {Object.entries(generationResult.details).map(([key, value]: [string, any]) => (
                    <li key={key}>
                      • {key.replace(/_/g, ' ')}: {value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 dark:border-white/10">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">How It Works</h2>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">1</div>
              <p><strong>Select billing month:</strong> Choose the month for which you want to generate bills</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">2</div>
              <p><strong>Load preview:</strong> Check how many customers have meter readings for the selected month</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">3</div>
              <p><strong>Generate bills:</strong> Click the generate button to create bills for all eligible customers</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">4</div>
              <p><strong>Download report:</strong> Get a summary report of the generation process</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

