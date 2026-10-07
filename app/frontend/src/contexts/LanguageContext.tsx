import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Language, getLanguage, setLanguage as setLangStorage } from '@/lib/i18n';

interface LanguageContextType {
  lang: Language;
  toggleLang: () => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  toggleLang: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Language>(getLanguage());

  const toggleLang = useCallback(() => {
    const newLang = lang === 'en' ? 'sr' : 'en';
    setLangStorage(newLang);
    setLang(newLang);
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}