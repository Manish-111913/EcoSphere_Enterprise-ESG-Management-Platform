import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/apiClient';
import { useAuth } from './auth';
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
  reloadSettings: () => Promise<void>;
}

interface SettingView {
  key: string;
  value: unknown;
}

// Map the UI toggle keys onto their backend setting keys.
const KEY_MAP: Record<keyof AppSettings, string[]> = {
  autoEmissionCalc: ['auto_emission_calc'],
  evidenceRequired: ['evidence_required_csr', 'evidence_required_challenge'],
  badgeAutoAward: ['badge_auto_award'],
  emailNotifications: ['email_notifications_enabled'],
};

const READ_KEY: Record<keyof AppSettings, string> = {
  autoEmissionCalc: 'auto_emission_calc',
  evidenceRequired: 'evidence_required_csr',
  badgeAutoAward: 'badge_auto_award',
  emailNotifications: 'email_notifications_enabled',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuth();
  const [settings, setSettings] = useState<AppSettings>(initialSettings as AppSettings);

  const reloadSettings = useCallback(async () => {
    try {
      const rows = await api.get<SettingView[]>('/settings');
      const byKey = new Map(rows.map((r) => [r.key, r.value]));
      setSettings((prev) => {
        const next = { ...prev };
        (Object.keys(READ_KEY) as (keyof AppSettings)[]).forEach((k) => {
          const v = byKey.get(READ_KEY[k]);
          if (typeof v === 'boolean') next[k] = v;
        });
        return next;
      });
    } catch {
      /* not authorized / offline — keep current values */
    }
  }, []);

  // Load live settings once the user is authenticated.
  useEffect(() => {
    if (isLoggedIn) void reloadSettings();
  }, [isLoggedIn, reloadSettings]);

  const persist = async (key: keyof AppSettings, value: boolean) => {
    for (const backendKey of KEY_MAP[key]) {
      try {
        await api.put(`/settings/${backendKey}`, { value });
      } catch (e) {
        console.error(`Failed to update setting ${backendKey}`, e);
      }
    }
  };

  const updateSetting = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value })); // optimistic
    void persist(key, value as boolean);
  };

  const updateAllSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    (Object.keys(newSettings) as (keyof AppSettings)[]).forEach((k) => void persist(k, newSettings[k]));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, updateAllSettings, reloadSettings }}>
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
