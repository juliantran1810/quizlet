import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ message = 'Đang tải dữ liệu...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 min-h-[300px]">
      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
      <p className="text-slate-500 font-medium text-sm animate-pulse">{message}</p>
    </div>
  );
}

