// utils/themeStyles.ts

export const themeStyles = {
  // Card/Container Styles
  card: {
    base: 'rounded-2xl p-6 transition-all duration-200',
    light: 'bg-white border border-gray-200 shadow-sm hover:shadow-md',
    dark: 'bg-white/5 backdrop-blur-xl border border-white/10 hover:border-white/20'
  },

  // Text Styles
  text: {
    h1: 'text-3xl font-bold text-gray-900 dark:text-white',
    h2: 'text-2xl font-bold text-gray-900 dark:text-white',
    h3: 'text-xl font-semibold text-gray-900 dark:text-white',
    h4: 'text-lg font-semibold text-gray-800 dark:text-gray-100',
    body: 'text-gray-700 dark:text-gray-300',
    secondary: 'text-gray-600 dark:text-gray-400',
    muted: 'text-gray-500 dark:text-gray-500',
    link: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
  },

  // Input Styles
  input: {
    base: 'w-full px-4 py-3 rounded-lg transition-colors focus:outline-none',
    light: 'bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
    dark: 'bg-white/10 border border-white/20 text-white placeholder-gray-400 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/20'
  },

  // Button Styles
  button: {
    primary: {
      base: 'px-6 py-3 rounded-lg font-semibold transition-all duration-200',
      light: 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-lg hover:shadow-blue-500/30',
      dark: 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:shadow-lg hover:shadow-orange-500/30'
    },
    secondary: {
      base: 'px-6 py-3 rounded-lg font-medium transition-all duration-200',
      light: 'bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200',
      dark: 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20'
    },
    ghost: {
      base: 'px-4 py-2 rounded-lg transition-all duration-200',
      light: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
      dark: 'text-gray-400 hover:text-white hover:bg-white/10'
    }
  },

  // Status Colors (works in both themes)
  status: {
    success: {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-400',
      border: 'border-green-300 dark:border-green-700'
    },
    warning: {
      bg: 'bg-yellow-100 dark:bg-yellow-900/30',
      text: 'text-yellow-700 dark:text-yellow-400',
      border: 'border-yellow-300 dark:border-yellow-700'
    },
    error: {
      bg: 'bg-red-100 dark:bg-red-900/30',
      text: 'text-red-700 dark:text-red-400',
      border: 'border-red-300 dark:border-red-700'
    },
    info: {
      bg: 'bg-blue-100 dark:bg-blue-900/30',
      text: 'text-blue-700 dark:text-blue-400',
      border: 'border-blue-300 dark:border-blue-700'
    }
  },

  // Table Styles
  table: {
    container: 'overflow-x-auto rounded-lg',
    base: 'w-full',
    header: 'bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700',
    headerCell: 'px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider',
    body: 'bg-white dark:bg-gray-800/30 divide-y divide-gray-200 dark:divide-gray-700',
    row: 'hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors',
    cell: 'px-6 py-4 text-sm text-gray-900 dark:text-gray-100'
  },

  // Badge Styles
  badge: {
    base: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
    primary: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  },

  // Navigation Styles
  nav: {
    item: {
      base: 'flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200',
      active: {
        light: 'bg-blue-50 text-blue-600 border border-blue-200',
        dark: 'bg-gradient-to-r from-yellow-400/20 to-orange-500/20 text-white border border-yellow-400/50'
      },
      inactive: {
        light: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
        dark: 'text-gray-300 hover:text-white hover:bg-white/10'
      }
    }
  }
};

// Helper function to combine styles
export const cn = (...classes: (string | undefined | false)[]) => {
  return classes.filter(Boolean).join(' ');
};

// Get theme-aware card style
export const getCardStyle = (isDark: boolean) => {
  return cn(themeStyles.card.base, isDark ? themeStyles.card.dark : themeStyles.card.light);
};

// Get theme-aware input style
export const getInputStyle = (isDark: boolean) => {
  return cn(themeStyles.input.base, isDark ? themeStyles.input.dark : themeStyles.input.light);
};

// Get theme-aware button style
export const getButtonStyle = (variant: 'primary' | 'secondary' | 'ghost', isDark: boolean) => {
  const button = themeStyles.button[variant];
  return cn(button.base, isDark ? button.dark : button.light);
};

// Chart configuration helper
export const getChartConfig = (isDark: boolean) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'bottom' as const,
      labels: {
        color: isDark ? 'rgba(255, 255, 255, 0.8)' : 'rgba(31, 41, 55, 0.9)',
        padding: 15,
        font: {
          size: 12
        }
      }
    },
    tooltip: {
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
      titleColor: isDark ? '#ffffff' : '#111827',
      bodyColor: isDark ? '#ffffff' : '#111827',
      borderColor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(209, 213, 219, 0.5)',
      borderWidth: 1,
      padding: 12,
      boxPadding: 6,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      grid: {
        display: true,
        color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(156, 163, 175, 0.15)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(209, 213, 219, 0.3)'
      },
      ticks: {
        color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(55, 65, 81, 0.9)',
        font: {
          size: 11
        }
      }
    },
    y: {
      grid: {
        display: true,
        color: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(156, 163, 175, 0.15)',
        borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(209, 213, 219, 0.3)'
      },
      ticks: {
        color: isDark ? 'rgba(255, 255, 255, 0.7)' : 'rgba(55, 65, 81, 0.9)',
        font: {
          size: 11
        }
      }
    }
  }
});

export default themeStyles;

