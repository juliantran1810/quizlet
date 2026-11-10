import React from 'react';
import { BookOpen, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-slate-800">Memora</span>
          <span>— Nền tảng học tập thông minh</span>
        </div>
      </div>
    </footer>
  );
}

