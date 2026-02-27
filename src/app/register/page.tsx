'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Zap } from 'lucide-react';

export default function RegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Small delay for smoother transition (300ms)
    const timer = setTimeout(() => {
      router.replace('/apply-connection');
    }, 300);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="p-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl shadow-lg">
            <Zap className="w-16 h-16 text-white" />
          </div>
        </div>
        <Loader2 className="w-10 h-10 text-yellow-500 animate-spin mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome to ElectroLux
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Taking you to the connection application form...
        </p>
      </div>
    </div>
  );
}

