import { db } from '@/lib/drizzle/db';
import { customers } from '@/lib/drizzle/schema';
import { sql } from 'drizzle-orm';

/**
 * City code mapping for meter number generation
 */
const CITY_CODES: Record<string, string> = {
  'Karachi': 'KHI',
  'Lahore': 'LHE', 
  'Islamabad': 'ISB',
  'Rawalpindi': 'RWP',
  'Faisalabad': 'FSD',
  'Multan': 'MLT',
  'Peshawar': 'PES',
  'Quetta': 'QTA',
  'Hyderabad': 'HYD',
  'Gujranwala': 'GJW',
  'Sialkot': 'SKT',
  'Sargodha': 'SRG',
  'Bahawalpur': 'BWP',
  'Sukkur': 'SKR',
  'Larkana': 'LKN',
  'Nawabshah': 'NWS',
  'Mirpur Khas': 'MKS',
  'Jacobabad': 'JBD',
  'Shikarpur': 'SKP',
  'Khairpur': 'KHP'
};

/**
 * Get city code from city name
 */
export function getCityCode(city: string): string {
  const normalizedCity = city.trim();
  return CITY_CODES[normalizedCity] || 'GEN'; // GEN for general/other cities
}

/**
 * Generate next sequential meter number
 * Format: MTR-{CITY_CODE}-{6_DIGIT_SEQUENCE}
 * Example: MTR-KHI-000017
 */
export async function generateMeterNumber(city: string): Promise<string> {
  const cityCode = getCityCode(city);

  try {
    // Get all customers with meter numbers for this city and find max manually
    const existingMeters = await db
      .select({ meterNumber: customers.meterNumber })
      .from(customers)
      .where(sql`${customers.meterNumber} LIKE ${`MTR-${cityCode}-%`}`);

    let maxId = 0;

    // Parse existing meter numbers to find the highest sequence
    for (const meter of existingMeters) {
      if (meter.meterNumber) {
        const match = meter.meterNumber.match(/^MTR-[A-Z]{3}-(\d{6})$/);
        if (match) {
          const id = parseInt(match[1], 10);
          if (id > maxId) {
            maxId = id;
          }
        }
      }
    }

    const nextId = maxId + 1;
    const paddedId = String(nextId).padStart(6, '0');

    return `MTR-${cityCode}-${paddedId}`;

  } catch (error) {
    console.error('Error generating meter number:', error);
    // Fallback: use timestamp-based ID
    const timestamp = Date.now();
    const fallbackId = String(timestamp).slice(-6);
    return `MTR-${cityCode}-${fallbackId}`;
  }
}

/**
 * Validate meter number format
 */
export function isValidMeterNumber(meterNumber: string): boolean {
  const pattern = /^MTR-[A-Z]{3}-\d{6}$/;
  return pattern.test(meterNumber);
}

/**
 * Check if meter number exists and is available for registration
 */
export async function isMeterNumberAvailable(meterNumber: string): Promise<boolean> {
  try {
    const result = await db
      .select({ id: customers.id })
      .from(customers)
      .where(sql`${customers.meterNumber} = ${meterNumber}`)
      .limit(1);
    
    return result.length === 0;
  } catch (error) {
    console.error('Error checking meter number availability:', error);
    return false;
  }
}

/**
 * Get meter number info (city, sequence)
 */
export function parseMeterNumber(meterNumber: string): { cityCode: string; sequence: number } | null {
  const match = meterNumber.match(/^MTR-([A-Z]{3})-(\d{6})$/);
  if (!match) return null;
  
  return {
    cityCode: match[1],
    sequence: parseInt(match[2], 10)
  };
}

