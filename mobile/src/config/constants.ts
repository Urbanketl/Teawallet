// API Configuration
// In development, connect to the local Express server
// In production, update this to your published backend URL
export const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000' 
  : 'https://your-production-url.com';

// App Colors
export const Colors = {
  primary: '#22c55e',
  primaryDark: '#16a34a',
  primaryLight: '#86efac',
  background: '#f9fafb',
  white: '#ffffff',
  black: '#000000',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
};

// App Dimensions
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography
export const Typography = {
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};