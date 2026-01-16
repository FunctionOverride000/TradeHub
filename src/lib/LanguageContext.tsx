"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

// Tipe bahasa yang didukung
type Language = 'id' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof translations.id; // Helper untuk auto-complete teks
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en'); // Default to English for global audience

  // 1. Cek Local Storage saat website dimuat (agar pilihan user tersimpan)
  useEffect(() => {
    if (typeof window !== 'undefined') {
        const savedLang = localStorage.getItem('app_language') as Language;
        if (savedLang && (savedLang === 'id' || savedLang === 'en')) {
          setLanguageState(savedLang);
        }
    }
  }, []);

  // 2. Fungsi ganti bahasa
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
        localStorage.setItem('app_language', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook agar mudah dipakai di halaman lain: const { t } = useLanguage();
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}