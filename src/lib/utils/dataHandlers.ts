/**
 * DATA HANDLERS UTILITY
 *
 * Comprehensive utility functions to handle NULL, NaN, undefined values
 * throughout the application. Use these to prevent displaying "NaN" or "null"
 * in the UI.
 */

// ========== NUMBER HANDLERS ==========

/**
 * Safely convert any value to a number, with fallback
 * @param value - The value to convert
 * @param defaultValue - Default value if conversion fails (default: 0)
 * @returns A valid number or the default value
 */
export const safeNumber = (value: unknown, defaultValue: number = 0): number => {
  // Handle null, undefined, empty string
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }

  // Try to convert to number
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);

  // Return default if NaN
  return isNaN(num) || !isFinite(num) ? defaultValue : num;
};

/**
 * Format number with fallback and decimal places
 * @param value - Number to format
 * @param decimals - Number of decimal places (default: 2)
 * @param defaultValue - Default if value is invalid (default: '0.00')
 * @returns Formatted number string
 */
export const formatNumber = (
  value: unknown,
  decimals: number = 2,
  defaultValue: string = '0.00'
): string => {
  const num = safeNumber(value);
  if (num === 0 && (value === null || value === undefined || value === '')) {
    return defaultValue;
  }
  return num.toFixed(decimals);
};

/**
 * Format currency with symbol
 * @param value - Amount to format
 * @param symbol - Currency symbol (default: 'Rs.')
 * @param decimals - Decimal places (default: 0 - whole numbers only)
 * @returns Formatted currency string
 */
export const formatCurrency = (
  value: unknown,
  symbol: string = 'Rs.',
  decimals: number = 0
): string => {
  const num = Math.round(safeNumber(value));
  return `${symbol} ${num.toLocaleString('en-PK', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}`;
};

/**
 * Format large numbers with K, M, B suffixes
 * @param value - Number to format
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted string (e.g., "1.5K", "2.3M")
 */
export const formatCompactNumber = (value: unknown, decimals: number = 1): string => {
  const num = safeNumber(value);

  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + 'B';
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + 'M';
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + 'K';
  }
  return num.toFixed(decimals);
};

// ========== STRING HANDLERS ==========

/**
 * Safely convert any value to string with fallback
 * @param value - Value to convert
 * @param defaultValue - Default if value is invalid (default: 'N/A')
 * @returns String or default value
 */
export const safeString = (value: unknown, defaultValue: string = 'N/A'): string => {
  if (value === null || value === undefined || value === '') {
    return defaultValue;
  }
  return String(value);
};

/**
 * Truncate string to max length with ellipsis
 * @param value - String to truncate
 * @param maxLength - Maximum length
 * @param ellipsis - Ellipsis string (default: '...')
 * @returns Truncated string
 */
export const truncateString = (
  value: unknown,
  maxLength: number,
  ellipsis: string = '...'
): string => {
  const str = safeString(value, '');
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - ellipsis.length) + ellipsis;
};

// ========== DATE HANDLERS ==========

/**
 * Safely format date with fallback
 * @param value - Date value (string, Date object, or timestamp)
 * @param defaultValue - Default if invalid (default: 'N/A')
 * @param format - Format options
 * @returns Formatted date string
 */
export const safeDate = (
  value: unknown,
  defaultValue: string = 'N/A',
  format: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' }
): string => {
  if (!value) return defaultValue;

  try {
    const date = new Date(value as string | number | Date);
    if (isNaN(date.getTime())) return defaultValue;
    return date.toLocaleDateString('en-PK', format);
  } catch {
    return defaultValue;
  }
};

/**
 * Format date for display (short format)
 * @param value - Date value
 * @returns Formatted date (e.g., "Jan 15, 2024")
 */
export const formatDate = (value: unknown): string => {
  return safeDate(value, 'N/A', { year: 'numeric', month: 'short', day: 'numeric' });
};

/**
 * Format date with time
 * @param value - Date value
 * @returns Formatted datetime (e.g., "Jan 15, 2024, 3:30 PM")
 */
export const formatDateTime = (value: unknown): string => {
  return safeDate(value, 'N/A', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ========== PERCENTAGE HANDLERS ==========

/**
 * Format value as percentage
 * @param value - Decimal value (e.g., 0.15 for 15%)
 * @param decimals - Decimal places (default: 1)
 * @returns Formatted percentage (e.g., "15.0%")
 */
export const formatPercentage = (value: unknown, decimals: number = 1): string => {
  const num = safeNumber(value) * 100;
  return `${num.toFixed(decimals)}%`;
};

// ========== ARRAY HANDLERS ==========

/**
 * Safely get array with fallback to empty array
 * @param value - Value that should be an array
 * @returns Array or empty array
 */
export const safeArray = <T = unknown>(value: unknown): T[] => {
  return Array.isArray(value) ? value : [];
};

/**
 * Calculate average of array values
 * @param values - Array of numbers
 * @param decimals - Decimal places (default: 2)
 * @returns Average or 0 if array is empty
 */
export const calculateAverage = (values: unknown[], decimals: number = 2): number => {
  const arr = safeArray(values).map(v => safeNumber(v));
  if (arr.length === 0) return 0;

  const sum = arr.reduce((acc, val) => acc + val, 0);
  const avg = sum / arr.length;
  return parseFloat(avg.toFixed(decimals));
};

/**
 * Calculate sum of array values
 * @param values - Array of numbers
 * @param decimals - Decimal places (default: 2)
 * @returns Sum or 0 if array is empty
 */
export const calculateSum = (values: unknown[], decimals: number = 2): number => {
  const arr = safeArray(values).map(v => safeNumber(v));
  const sum = arr.reduce((acc, val) => acc + val, 0);
  return parseFloat(sum.toFixed(decimals));
};

// ========== OBJECT HANDLERS ==========

/**
 * Safely get nested object property
 * @param obj - Object to traverse
 * @param path - Dot-separated path (e.g., 'user.profile.name')
 * @param defaultValue - Default if path not found
 * @returns Value at path or default
 */
export const safeGet = (obj: unknown, path: string, defaultValue: unknown = null): unknown => {
  try {
    return path.split('.').reduce((current: any, key) => current?.[key], obj) ?? defaultValue;
  } catch {
    return defaultValue;
  }
};

// ========== VALIDATION HELPERS ==========

/**
 * Check if value is valid (not null, undefined, NaN, empty string)
 * @param value - Value to check
 * @returns true if valid, false otherwise
 */
export const isValid = (value: unknown): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === 'number' && (isNaN(value) || !isFinite(value))) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
};

/**
 * Get first valid value from array of values
 * @param values - Array of potential values
 * @param defaultValue - Final fallback
 * @returns First valid value or default
 */
export const firstValid = (...values: unknown[]): unknown => {
  for (const value of values) {
    if (isValid(value)) return value;
  }
  return values[values.length - 1];
};

// ========== PHONE NUMBER HANDLERS ==========

/**
 * Extract only digits from a string
 * @param value - String containing digits
 * @returns String with only digits
 */
export const onlyDigits = (value: string): string => {
  return value.replace(/\D+/g, '');
};

/**
 * Format Pakistani phone number with dashes (0300-1234567)
 * @param value - Phone number string
 * @param maxLength - Maximum digits allowed (default: 11)
 * @returns Formatted phone number
 */
export const formatPKPhone = (value: string, maxLength: number = 11): string => {
  const digits = onlyDigits(value).slice(0, maxLength);
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 4)}-${digits.slice(4)}`;
};

/**
 * Format CNIC with dashes (42101-1234567-1)
 * @param value - CNIC string
 * @returns Formatted CNIC
 */
export const formatCNIC = (value: string): string => {
  const digits = onlyDigits(value).slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
};

/**
 * Validate Pakistani phone number
 * @param value - Phone number string
 * @returns true if valid (10-11 digits)
 */
export const isValidPKPhone = (value: string): boolean => {
  const digits = onlyDigits(value);
  return digits.length >= 10 && digits.length <= 11;
};

/**
 * Validate CNIC
 * @param value - CNIC string
 * @returns true if valid (13 digits)
 */
export const isValidCNIC = (value: string): boolean => {
  const digits = onlyDigits(value);
  return digits.length === 13;
};

// ========== BILL-SPECIFIC HELPERS ==========

/**
 * Format units consumed
 * @param value - Units value
 * @returns Formatted units (e.g., "450 kWh")
 */
export const formatUnits = (value: unknown): string => {
  const units = safeNumber(value);
  return `${units.toLocaleString()} kWh`;
};

/**
 * Format meter reading
 * @param value - Meter reading value
 * @returns Formatted reading (e.g., "12,345")
 */
export const formatMeterReading = (value: unknown): string => {
  const reading = safeNumber(value);
  return reading.toLocaleString();
};

/**
 * Calculate bill status badge color
 * @param status - Bill status
 * @returns Tailwind color classes
 */
export const getBillStatusColor = (status: string): string => {
  const s = safeString(status, '').toLowerCase();
  switch (s) {
    case 'paid':
      return 'bg-green-100 text-green-800 border-green-300';
    case 'pending':
    case 'issued':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'overdue':
      return 'bg-red-100 text-red-800 border-red-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

/**
 * Tariff slab interface (display format)
 */
export interface TariffSlab {
  units: number;
  rate: number;
  amount: number;
  range: string;
}

/**
 * Database tariff slab interface
 */
export interface DBTariffSlab {
  id: number;
  tariffId: number;
  slabOrder: number;
  startUnits: number;
  endUnits: number | null;
  ratePerUnit: string | number;
  createdAt: string | Date;
}

/**
 * Calculate tariff slab breakdown from units consumed and tariff slabs from database
 * This mimics the calculation done in the backend bill generation
 * @param unitsConsumed - Total units consumed
 * @param tariffSlabs - Array of tariff slabs from database (optional - uses default Pakistani residential rates)
 * @returns Array of tariff slabs with units, rate, and amount
 */
export const calculateTariffSlabs = (
  unitsConsumed: number,
  tariffSlabs?: DBTariffSlab[]
): TariffSlab[] => {
  // Default Pakistani residential tariff structure if not provided
  const defaultSlabs: DBTariffSlab[] = [
    { id: 1, tariffId: 1, slabOrder: 1, startUnits: 0, endUnits: 100, ratePerUnit: 5.0, createdAt: new Date() },
    { id: 2, tariffId: 1, slabOrder: 2, startUnits: 100, endUnits: 200, ratePerUnit: 8.0, createdAt: new Date() },
    { id: 3, tariffId: 1, slabOrder: 3, startUnits: 200, endUnits: 300, ratePerUnit: 12.0, createdAt: new Date() },
    { id: 4, tariffId: 1, slabOrder: 4, startUnits: 300, endUnits: 500, ratePerUnit: 18.0, createdAt: new Date() },
    { id: 5, tariffId: 1, slabOrder: 5, startUnits: 500, endUnits: null, ratePerUnit: 22.0, createdAt: new Date() },
  ];

  const slabs = tariffSlabs || defaultSlabs;

  const result: TariffSlab[] = [];
  let remainingUnits = safeNumber(unitsConsumed, 0);

  // Sort by slab order to ensure correct calculation
  const sortedSlabs = [...slabs].sort((a, b) => a.slabOrder - b.slabOrder);

  for (const slab of sortedSlabs) {
    if (remainingUnits <= 0) break;

    // Calculate units that fall in this slab
    const slabCapacity = slab.endUnits === null
      ? remainingUnits // For unlimited slabs, consume all remaining units
      : Math.max(0, slab.endUnits - slab.startUnits);

    const slabUnits = slab.endUnits === null
      ? remainingUnits
      : Math.min(remainingUnits, slabCapacity);

    if (slabUnits > 0) {
      const rate = typeof slab.ratePerUnit === 'string'
        ? parseFloat(slab.ratePerUnit)
        : slab.ratePerUnit;

      const amount = slabUnits * rate;

      result.push({
        units: slabUnits,
        rate: rate,
        amount: amount,
        range: slab.endUnits === null
          ? `${slab.startUnits}+ kWh`
          : `${slab.startUnits}-${slab.endUnits} kWh`
      });

      remainingUnits -= slabUnits;
    }
  }

  return result;
};

// ========== EXPORT ALL ==========

export default {
  // Numbers
  safeNumber,
  formatNumber,
  formatCurrency,
  formatCompactNumber,

  // Strings
  safeString,
  truncateString,

  // Dates
  safeDate,
  formatDate,
  formatDateTime,

  // Percentages
  formatPercentage,

  // Arrays
  safeArray,
  calculateAverage,
  calculateSum,

  // Objects
  safeGet,

  // Validation
  isValid,
  firstValid,

  // Phone & ID
  onlyDigits,
  formatPKPhone,
  formatCNIC,
  isValidPKPhone,
  isValidCNIC,

  // Bill-specific
  formatUnits,
  formatMeterReading,
  getBillStatusColor,
  calculateTariffSlabs
};

