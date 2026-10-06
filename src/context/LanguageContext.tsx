import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../i18n/en.js';
import { ne } from '../i18n/ne.js';

type Language = 'en' | 'ne';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: typeof en;
  formatCurrency: (amount: number, showPrefix?: boolean) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    return (localStorage.getItem('sharenep_lang') as Language) || 'en';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('sharenep_lang', newLang);
  };

  const toggleLang = () => {
    setLang(lang === 'en' ? 'ne' : 'en');
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = lang === 'ne' ? ne : en;

  const formatCurrency = (amount: number, showPrefix = true): string => {
    if (isNaN(amount) || amount === null || amount === undefined) return showPrefix ? 'NPR 0.00' : '0.00';
    const formatted = amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return showPrefix ? `NPR ${formatted}` : formatted;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t, formatCurrency }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
};
