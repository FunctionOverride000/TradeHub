"use client";

import React from 'react';
import { useLanguage } from './LanguageContext';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-[#1E2329] border border-[#2B3139] rounded-xl p-1">
      <button
        onClick={() => setLanguage('id')}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
          language === 'id' 
            ? 'bg-[#FCD535] text-black' 
            : 'text-[#848E9C] hover:text-white'
        }`}
      >
        ID
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
          language === 'en' 
            ? 'bg-[#FCD535] text-black' 
            : 'text-[#848E9C] hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
}

