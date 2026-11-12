import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, AVAILABLE_LANGUAGES } from '../locales/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Đọc ngôn ngữ đã lưu từ localStorage hoặc lấy mặc định là 'vi'
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('memora_language');
    if (saved && AVAILABLE_LANGUAGES.some((l) => l.code === saved)) {
      return saved;
    }
    return 'vi';
  });

  const setLanguage = (langCode) => {
    if (AVAILABLE_LANGUAGES.some((l) => l.code === langCode)) {
      setLanguageState(langCode);
      localStorage.setItem('memora_language', langCode);
    }
  };

  // Hàm lấy chuỗi dịch thuật theo đường dẫn dạng 'section.key' (ví dụ: 'nav.my_decks')
  const t = (path, fallback = '') => {
    if (!path) return fallback;
    const parts = path.split('.');
    
    // Thử tìm trong ngôn ngữ hiện tại
    let current = translations[language];
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = null;
        break;
      }
    }
    if (current && typeof current === 'string') {
      return current;
    }

    // Nếu không thấy, tự động fallback sang Tiếng Việt ('vi')
    let fallbackTrans = translations.vi;
    for (const part of parts) {
      if (fallbackTrans && typeof fallbackTrans === 'object' && part in fallbackTrans) {
        fallbackTrans = fallbackTrans[part];
      } else {
        fallbackTrans = null;
        break;
      }
    }
    if (fallbackTrans && typeof fallbackTrans === 'string') {
      return fallbackTrans;
    }

    return fallback || path;
  };

  const formatCategory = (cat) => {
    if (!cat) return t('category.general');
    const clean = String(cat).trim().toLowerCase();
    if (clean === 'all' || clean.includes('tất cả')) return t('category.all');
    if (clean.includes('trung') || clean.includes('chinese') || clean.includes('hsk')) return t('category.chinese');
    if (clean.includes('anh') || clean.includes('english')) return t('category.english');
    if (clean.includes('nhật') || clean.includes('japanese')) return t('category.japanese');
    if (clean.includes('hàn') || clean.includes('korean')) return t('category.korean');
    if (clean.includes('công nghệ') || clean.includes('tech')) return t('category.tech');
    if (clean.includes('khoa học') || clean.includes('science')) return t('category.science');
    if (clean.includes('lịch sử') || clean.includes('history')) return t('category.history');
    if (clean.includes('y dược') || clean.includes('medicine')) return t('category.medicine');
    if (clean.includes('general') || clean.includes('chung')) return t('category.general');
    return cat;
  };

  const currentLanguage =
    AVAILABLE_LANGUAGES.find((l) => l.code === language) || AVAILABLE_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        formatCategory,
        languages: AVAILABLE_LANGUAGES,
        currentLanguage,
      }}
    >
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

export default LanguageContext;
