import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/constants';
import databaseService from '../services/DatabaseService';
import fileService from '../services/FileService';

export function registerFileHandlers() {
  /**
   * 録音一覧取得
   */
  ipcMain.handle(IPC_CHANNELS.GET_RECORDINGS, async (_event) => {
    try {
      const recordings = await databaseService.getRecordings(false);
      return recordings;
    } catch (error) {
      console.error('Failed to get recordings:', error);
      return [];
    }
  });

  /**
   * 録音削除（論理削除）
   */
  ipcMain.handle(IPC_CHANNELS.DELETE_RECORDING, async (_event, id: number) => {
    try {
      await fileService.deleteRecording(id);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete recording:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * 録音リネーム
   */
  ipcMain.handle(
    IPC_CHANNELS.RENAME_RECORDING,
    async (_event, id: number, newName: string) => {
      try {
        await fileService.renameRecording(id, newName);
        return { success: true };
      } catch (error) {
        console.error('Failed to rename recording:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );
}
