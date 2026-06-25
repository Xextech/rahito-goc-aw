import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, Translation, translations } from '../locales';

interface LanguageContextProps {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translation;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('rahito_lang');
    if (saved === 'es' || saved === 'pl') return saved as Language;
    
    // Default to Spanish if user email suggests or fallback
    return 'es';
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem('rahito_lang', newLang);
  };

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
