import React, { createContext, useContext, useState, useEffect } from 'react';
import initialSettings from '../mocks/settings.json';

export interface AppSettings {
  autoEmissionCalc: boolean;
  evidenceRequired: boolean;
  badgeAutoAward: boolean;
  emailNotifications: boolean;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  updateAllSettings: (newSettings: AppSettings) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    // Attempt to load from localStorage first for in-memory persistence across reloads
    const saved = localStorage.getItem('ecosphere_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse settings from localStorage', e);
      }
    }
    return initialSettings;
  });

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('ecosphere_settings', JSON.stringify(updated));
      return updated;
    });
  };

  const updateAllSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('ecosphere_settings', JSON.stringify(newSettings));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateAllSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
