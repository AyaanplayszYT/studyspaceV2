import { useEffect, useState } from 'react';

const getThemeVariables = (themeId: string): Record<string, string> => {
  const themes: Record<string, Record<string, string>> = {
    default: {
      '--background': '240 100% 8%',
      '--foreground': '240 100% 98%',
      '--primary': '240 100% 60%',
      '--primary-foreground': '240 100% 98%',
      '--secondary': '240 100% 30%',
      '--secondary-foreground': '240 100% 98%',
      '--muted': '240 30% 20%',
      '--muted-foreground': '240 100% 80%',
      '--accent': '240 100% 60%',
      '--accent-foreground': '240 100% 98%',
      '--destructive': '0 65% 45%',
      '--destructive-foreground': '240 100% 98%',
      '--border': '240 30% 20%',
      '--input': '240 30% 15%',
      '--ring': '240 100% 60%',
      '--card': '240 100% 10%',
      '--card-foreground': '240 100% 98%',
    },
    forest: {
      '--background': '139 34% 18%',
      '--foreground': '139 30% 95%',
      '--primary': '139 34% 40%',
      '--primary-foreground': '139 34% 95%',
      '--secondary': '139 40% 50%',
      '--secondary-foreground': '139 34% 20%',
      '--muted': '139 30% 30%',
      '--muted-foreground': '139 30% 75%',
      '--accent': '139 40% 55%',
      '--accent-foreground': '139 34% 18%',
      '--destructive': '0 65% 45%',
      '--destructive-foreground': '139 30% 95%',
      '--border': '139 34% 25%',
      '--input': '139 34% 22%',
      '--ring': '139 34% 40%',
      '--card': '139 34% 20%',
      '--card-foreground': '139 30% 95%',
    },
    purple: {
      '--background': '270 60% 12%',
      '--foreground': '270 30% 95%',
      '--primary': '270 60% 50%',
      '--primary-foreground': '270 30% 95%',
      '--secondary': '270 70% 60%',
      '--secondary-foreground': '270 60% 12%',
      '--muted': '270 40% 25%',
      '--muted-foreground': '270 30% 75%',
      '--accent': '280 80% 65%',
      '--accent-foreground': '270 60% 12%',
      '--destructive': '0 65% 45%',
      '--destructive-foreground': '270 30% 95%',
      '--border': '270 60% 20%',
      '--input': '270 60% 16%',
      '--ring': '270 60% 50%',
      '--card': '270 60% 14%',
      '--card-foreground': '270 30% 95%',
    },
  };
  return themes[themeId] || themes.default;
};

const applyTheme = (themeId: string) => {
  const htmlElement = document.documentElement;
  
  console.log('[THEME] Applying theme:', themeId);
  
  // Remove all theme classes
  htmlElement.classList.remove('dark', 'forest', 'purple', 'default');
  
  // Always add 'dark' base class
  htmlElement.classList.add('dark');
  
  // Apply appropriate theme-specific class
  if (themeId === 'forest') {
    htmlElement.classList.add('forest');
  } else if (themeId === 'purple') {
    htmlElement.classList.add('purple');
  }
  
  console.log('[THEME] Applied classes:', htmlElement.className);
  
  // Also apply variables as inline styles to ensure they take effect
  const variables = getThemeVariables(themeId);
  Object.entries(variables).forEach(([key, value]) => {
    htmlElement.style.setProperty(key, value, 'important');
  });
  
  console.log('[THEME] Set inline style variables for:', themeId);
  
  // Force browser to recalculate styles
  void htmlElement.offsetHeight;
};

export const useThemeManager = () => {
  const [currentTheme, setCurrentTheme] = useState('default');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('app-theme') || 'default';
    console.log('[THEME] Loaded from localStorage:', savedTheme);
    setCurrentTheme(savedTheme);
    applyTheme(savedTheme);
    setMounted(true);
  }, []);

  const changeTheme = (themeId: string) => {
    console.log('[THEME] Change theme called with:', themeId);
    setCurrentTheme(themeId);
    localStorage.setItem('app-theme', themeId);
    applyTheme(themeId);
  };

  // Ensure theme is reapplied whenever currentTheme changes
  useEffect(() => {
    if (mounted) {
      applyTheme(currentTheme);
    }
  }, [currentTheme, mounted]);

  return { currentTheme, changeTheme };
};


