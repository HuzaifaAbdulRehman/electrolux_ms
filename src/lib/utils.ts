/**
 * Utility functions for ElectroLux EMS
 */

/**
 * Combines class names conditionally
 * Simple version without external dependencies
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Formats date to readable string
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Validates email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Detects user role from email
 * @employee -> Employee
 * @admin -> Admin
 * normal email -> Customer
 */
export function detectUserRole(email: string): 'customer' | 'employee' | 'admin' {
  const lowerEmail = email.toLowerCase();

  if (lowerEmail.includes('@admin')) {
    return 'admin';
  }

  if (lowerEmail.includes('@employee')) {
    return 'employee';
  }

  return 'customer';
}

/**
 * Validates password strength
 * Returns strength level and message
 */
export function validatePasswordStrength(password: string): {
  strength: 'weak' | 'medium' | 'strong';
  message: string;
  score: number;
} {
  let score = 0;

  // Length check
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;

  // Character variety checks
  if (/[a-z]/.test(password)) score++; // lowercase
  if (/[A-Z]/.test(password)) score++; // uppercase
  if (/[0-9]/.test(password)) score++; // numbers
  if (/[^A-Za-z0-9]/.test(password)) score++; // special chars

  if (score <= 2) {
    return {
      strength: 'weak',
      message: 'Password is weak. Add uppercase, numbers, and special characters.',
      score,
    };
  }

  if (score <= 4) {
    return {
      strength: 'medium',
      message: 'Password is medium. Consider adding more variety.',
      score,
    };
  }

  return {
    strength: 'strong',
    message: 'Password is strong!',
    score,
  };
}

/**
 * Formats phone number
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');

  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone;
}

/**
 * Truncates text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

