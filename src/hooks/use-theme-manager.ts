import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

export const useThemeManager = () => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const { setTheme } = useTheme();

  useEffect(() => {
    // Load theme from localStorage on mount
    const theme = localStorage.getItem('app-theme') || 'default';
    setCurrentTheme(theme);
    applyTheme(theme);
  }, []);

  const applyTheme = (themeId: string) => {
    const htmlElement = document.documentElement;
    
    // Remove all theme classes
    htmlElement.classList.remove('dark', 'forest', 'purple', 'default');
    
    // Apply appropriate classes based on theme
    if (themeId === 'default') {
      setTheme('dark');
      htmlElement.classList.add('dark');
    } else if (themeId === 'forest') {
      setTheme('dark');
      htmlElement.classList.add('dark', 'forest');
    } else if (themeId === 'purple') {
      setTheme('dark');
      htmlElement.classList.add('dark', 'purple');
    }
  };

  const changeTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('app-theme', themeId);
    applyTheme(themeId);
  };

  return { currentTheme, changeTheme };
};
