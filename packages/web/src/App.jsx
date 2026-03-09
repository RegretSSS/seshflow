import { useEffect, useState } from 'react';
import Board from './components/Board';
import { LOCALE_STORAGE_KEY, getMessage } from './i18n';
import './styles/App.css';

function detectLocale() {
  const saved = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (saved === 'zh' || saved === 'en') {
    return saved;
  }
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function App() {
  const [locale, setLocale] = useState(() => detectLocale());

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = getMessage(locale, 'title');
  }, [locale]);

  return (
    <div className="app">
      <Board locale={locale} onLocaleChange={setLocale} />
    </div>
  );
}

export default App;
