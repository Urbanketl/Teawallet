// API endpoints
export const API_ENDPOINTS = {
  // Auth
  AUTH_USER: '/api/auth/user',
  AUTH_PROFILE: '/api/auth/user/profile',
  
  // Transactions
  TRANSACTIONS: '/api/transactions',
  PAYMENT_CREATE_ORDER: '/api/transactions/payment/create-order',
  PAYMENT_VERIFY: '/api/transactions/payment/verify',
  
  // Support
  SUPPORT_TICKETS: '/api/support/tickets',
  SUPPORT_FAQ: '/api/support/faq',
  
  // Admin
  ADMIN_USERS: '/api/admin/users',
  ADMIN_STATS: '/api/admin/stats',
  ADMIN_MACHINES: '/api/admin/machines',
  ADMIN_SUPPORT_TICKETS: '/api/admin/support/tickets',
  ADMIN_RFID_CARDS: '/api/admin/rfid/cards',
  ADMIN_RFID_SUGGEST: '/api/admin/rfid/suggest-card-number',
  
  // Analytics
  ANALYTICS_POPULAR_TEAS: '/api/analytics/popular-teas',
  ANALYTICS_PEAK_HOURS: '/api/analytics/peak-hours',
  ANALYTICS_MACHINE_PERFORMANCE: '/api/analytics/machine-performance',
  ANALYTICS_USER_BEHAVIOR: '/api/analytics/user-behavior',
  
  // Legacy endpoints
  RFID_CARD: '/api/rfid/card',
  DISPENSING_HISTORY: '/api/dispensing/history',
} as const;

// App configuration
export const APP_CONFIG = {
  LOW_BALANCE_THRESHOLD: 50.00,
  PAGINATION_LIMIT: 50,
  TOAST_DURATION: 3000,
  REFRESH_INTERVAL: 3000,
} as const;

// Tea types
export const TEA_TYPES = [
  'Regular tea',
] as const;

// Support categories
export const SUPPORT_CATEGORIES = [
  'Technical Issue',
  'Payment Problem',
  'Account Question',
  'Feature Request',
  'Bug Report',
  'General Inquiry',
] as const;

// Machine statuses
export const MACHINE_STATUSES = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  MAINTENANCE: 'maintenance',
} as const;