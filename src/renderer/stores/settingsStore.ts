import { create } from 'zustand';
import type { RecordingQuality } from '../../shared/types';

export interface AppSettings {
  // 保存先
  defaultSavePath: string;

  // 音質
  defaultQuality: RecordingQuality;

  // デバイス
  defaultMicDeviceId: string | null;
  defaultSpeakerDeviceId: string | null;

  // 音声処理
  echoCancellation: boolean;
  autoGainControl: boolean;
  noiseSuppression: boolean;

  // ホットキー（Phase 3で実装）
  hotkey_startStop: string;
  hotkey_pauseResume: string;

  // テーマ
  theme: 'light' | 'dark' | 'system';
}

interface SettingsState {
  settings: AppSettings;
  loading: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
}

// デフォルト設定
const defaultSettings: AppSettings = {
  defaultSavePath: '',
  defaultQuality: 'high',
  defaultMicDeviceId: null,
  defaultSpeakerDeviceId: null,
  echoCancellation: true,  // デフォルトでON
  autoGainControl: true,   // デフォルトでON
  noiseSuppression: true,  // デフォルトでON
  hotkey_startStop: 'Ctrl+Shift+R',
  hotkey_pauseResume: 'Ctrl+Shift+P',
  theme: 'system'
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: defaultSettings,
  loading: false,

  loadSettings: async () => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    set({ loading: true });

    try {
      const loadedSettings: Partial<AppSettings> = {};

      // 各設定項目を個別にロード
      for (const key of Object.keys(defaultSettings) as Array<keyof AppSettings>) {
        const value = await window.electronAPI.getSetting(key);
        if (value !== null) {
          // 型に応じて変換
          if (key === 'defaultQuality') {
            loadedSettings[key] = value as RecordingQuality;
          } else if (key === 'theme') {
            loadedSettings[key] = value as 'light' | 'dark' | 'system';
          } else if (key === 'echoCancellation' || key === 'autoGainControl' || key === 'noiseSuppression') {
            // boolean値として変換
            loadedSettings[key] = value === 'true';
          } else {
            loadedSettings[key] = value as any;
          }
        }
      }

      set({
        settings: { ...defaultSettings, ...loadedSettings },
        loading: false
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ loading: false });
    }
  },

  updateSetting: async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    try {
      // データベースに保存
      await window.electronAPI.setSetting(key, String(value));

      // ローカル状態を更新
      set(state => ({
        settings: {
          ...state.settings,
          [key]: value
        }
      }));
    } catch (error) {
      console.error(`Failed to update setting ${key}:`, error);
      throw error;
    }
  },

  resetSettings: async () => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    try {
      // すべての設定をデフォルト値に戻す
      for (const [key, value] of Object.entries(defaultSettings)) {
        await window.electronAPI.setSetting(key, String(value));
      }

      set({ settings: defaultSettings });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }
}));
