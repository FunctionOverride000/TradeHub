"use client";

import React, { createContext, useContext } from 'react';
import { translations } from './translations';

interface LanguageContextType {
  language: 'en';
  setLanguage: (lang: 'en') => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const language = 'en' as const;
  const setLanguage = () => {}; // No-op: English only

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translations.en }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}