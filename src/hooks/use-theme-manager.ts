import { useEffect, useState } from 'react';

export const useThemeManager = () => {
  const [currentTheme, setCurrentTheme] = useState('default');

  useEffect(() => {
    // Load theme from localStorage on mount
    const theme = localStorage.getItem('app-theme') || 'default';
    setCurrentTheme(theme);
    applyTheme(theme);
  }, []);

  const applyTheme = (themeId: string) => {
    const htmlElement = document.documentElement;
    
    // Remove all theme classes
    htmlElement.classList.remove('forest', 'default');
    
    // Add the new theme class
    if (themeId === 'forest') {
      htmlElement.classList.add('forest');
    } else {
      htmlElement.classList.add('default');
    }
  };

  const changeTheme = (themeId: string) => {
    setCurrentTheme(themeId);
    localStorage.setItem('app-theme', themeId);
    applyTheme(themeId);
  };

  return { currentTheme, changeTheme };
};
