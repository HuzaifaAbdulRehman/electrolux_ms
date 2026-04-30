// Theme-aware class names for consistent styling across the application

export const theme = {
  // Layout and containers
  page: {
    wrapper: 'min-h-screen transition-colors duration-300',
    content: 'space-y-6'
  },

  // Cards
  card: {
    base: 'bg-white dark:bg-white/5 backdrop-blur-xl rounded-2xl p-6 border border-gray-200 dark:border-white/10',
    hover: 'hover:border-gray-300 dark:hover:border-white/20',
    gradient: 'bg-gradient-to-r from-gray-50 to-white dark:from-white/5 dark:to-white/10'
  },

  // Typography
  text: {
    h1: 'text-3xl font-bold text-gray-900 dark:text-white',
    h2: 'text-2xl font-bold text-gray-900 dark:text-white',
    h3: 'text-xl font-semibold text-gray-900 dark:text-white',
    h4: 'text-lg font-semibold text-gray-800 dark:text-gray-100',
    body: 'text-gray-700 dark:text-gray-300',
    muted: 'text-gray-600 dark:text-gray-400',
    small: 'text-sm text-gray-600 dark:text-gray-400',
    xs: 'text-xs text-gray-500 dark:text-gray-500'
  },

  // Buttons
  button: {
    primary: 'px-6 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg hover:shadow-lg hover:shadow-orange-500/50 transition-all',
    secondary: 'px-4 py-2 bg-gray-100 dark:bg-white/10 backdrop-blur-sm border border-gray-300 dark:border-white/20 rounded-lg text-gray-700 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all',
    ghost: 'px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-all'
  },

  // Forms
  input: {
    base: 'w-full px-4 py-2 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:border-blue-500 dark:focus:border-yellow-400',
    select: 'px-4 py-2 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 dark:focus:border-yellow-400'
  },

  // Status indicators
  status: {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    info: 'text-blue-600 dark:text-blue-400'
  },

  // Badges
  badge: {
    success: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
  },

  // Tables
  table: {
    wrapper: 'overflow-x-auto',
    base: 'w-full',
    header: 'bg-gray-50 dark:bg-white/5',
    headerCell: 'px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-400 uppercase tracking-wider',
    row: 'bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10',
    cell: 'px-6 py-4 text-sm text-gray-900 dark:text-gray-100'
  },

  // Dividers
  divider: 'border-gray-200 dark:border-white/10'
};

export default theme;

