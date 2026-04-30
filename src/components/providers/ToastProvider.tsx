'use client';

import { Toaster } from 'react-hot-toast';

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--toast-bg, #1f2937)',
          color: 'var(--toast-color, #f9fafb)',
          border: '1px solid var(--toast-border, #374151)',
          borderRadius: '8px',
          padding: '12px 16px',
          fontSize: '14px',
          fontWeight: '500',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        },
        success: {
          iconTheme: {
            primary: '#10b981',
            secondary: '#f9fafb',
          },
          style: {
            background: '#064e3b',
            color: '#d1fae5',
            border: '1px solid #10b981',
          },
        },
        error: {
          iconTheme: {
            primary: '#ef4444',
            secondary: '#f9fafb',
          },
          style: {
            background: '#7f1d1d',
            color: '#fecaca',
            border: '1px solid #ef4444',
          },
        },
        loading: {
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#f9fafb',
          },
          style: {
            background: '#1e3a8a',
            color: '#dbeafe',
            border: '1px solid #3b82f6',
          },
        },
      }}
    />
  );
}

