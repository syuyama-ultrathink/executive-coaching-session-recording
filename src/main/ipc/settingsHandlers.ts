import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import databaseService from '../services/DatabaseService';

export function registerSettingsHandlers() {
  /**
   * 設定取得
   */
  ipcMain.handle(IPC_CHANNELS.GET_SETTING, async (_event, key: string) => {
    try {
      const value = await databaseService.getSetting(key);
      return value;
    } catch (error) {
      console.error('Failed to get setting:', error);
      return null;
    }
  });

  /**
   * 設定保存
   */
  ipcMain.handle(
    IPC_CHANNELS.SET_SETTING,
    async (_event, key: string, value: string) => {
      try {
        await databaseService.setSetting(key, value);
        return { success: true };
      } catch (error) {
        console.error('Failed to set setting:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
}
