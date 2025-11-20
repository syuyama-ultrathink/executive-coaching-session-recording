import { ipcMain, desktopCapturer } from 'electron';
import type { AudioCaptureOptions, RecordingMetadata } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants';
import audioCaptureService from '../services/AudioCaptureService';
import fileService from '../services/FileService';
import { getMainWindow } from '../index';

// 現在の録音状態
let recordingStartTime: number | null = null;
let recordingInterval: NodeJS.Timeout | null = null;

export function registerRecordingHandlers() {
  /**
   * 録音開始
   */
  ipcMain.handle(
    IPC_CHANNELS.START_RECORDING,
    async (_event, options: AudioCaptureOptions & RecordingMetadata) => {
      try {
        console.log('IPC: Start recording', options);

        // 音声キャプチャ開始
        await audioCaptureService.startCapture(options);

        // 録音開始時刻を記録
        recordingStartTime = Date.now();

        // 進捗状況の定期送信を開始
        startProgressReporting();

        return {
          success: true,
          id: 1 // TODO: 実際の録音IDを返す
        };
      } catch (error) {
        console.error('Failed to start recording:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  );

  /**
   * 録音停止
   */
  ipcMain.handle(IPC_CHANNELS.STOP_RECORDING, async (_event) => {
    try {
      console.log('IPC: Stop recording');

      // 進捗報告を停止
      stopProgressReporting();

      // 録音時間を計算
      const duration = recordingStartTime
        ? Math.floor((Date.now() - recordingStartTime) / 1000)
        : 0;

      // 音声キャプチャ停止
      audioCaptureService.stopCapture();

      // ファイル保存
      const files = await fileService.saveRecording(
        {
          fileName: 'recording',
          quality: 'high',
          memo: ''
        },
        duration
      );

      recordingStartTime = null;

      return {
        success: true,
        files
      };
    } catch (error) {
      console.error('Failed to stop recording:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * 録音一時停止
   */
  ipcMain.handle(IPC_CHANNELS.PAUSE_RECORDING, async (_event) => {
    try {
      console.log('IPC: Pause recording');
      audioCaptureService.pauseCapture();
      stopProgressReporting();

      return { success: true };
    } catch (error) {
      console.error('Failed to pause recording:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * 録音再開
   */
  ipcMain.handle(IPC_CHANNELS.RESUME_RECORDING, async (_event) => {
    try {
      console.log('IPC: Resume recording');
      audioCaptureService.resumeCapture();
      startProgressReporting();

      return { success: true };
    } catch (error) {
      console.error('Failed to resume recording:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

  /**
   * デバイス一覧取得
   */
  ipcMain.handle(IPC_CHANNELS.GET_DEVICES, async (_event) => {
    try {
      const devices = audioCaptureService.getDevices();
      return devices;
    } catch (error) {
      console.error('Failed to get devices:', error);
      return {
        microphones: [],
        speakers: []
      };
    }
  });

  /**
   * デスクトップソース取得（システムオーディオキャプチャ用）
   */
  ipcMain.handle('get-desktop-sources', async (_event) => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        thumbnailSize: { width: 0, height: 0 }
      });
      return sources;
    } catch (error) {
      console.error('Failed to get desktop sources:', error);
      return [];
    }
  });

  /**
   * 録音ファイル保存（RendererからBlobデータを受け取る）
   */
  ipcMain.handle('save-recording-files', async (_event, data: {
    micData: number[];
    systemData: number[];
    metadata: RecordingMetadata;
  }) => {
    try {
      console.log('IPC: Save recording files', {
        micDataSize: data.micData.length,
        systemDataSize: data.systemData.length,
        metadata: data.metadata
      });

      // 配列をBufferに変換
      const micBuffer = Buffer.from(data.micData);
      const systemBuffer = Buffer.from(data.systemData);

      // FileServiceでファイル保存とMP3変換
      const result = await fileService.saveRecordingFromBlobs(
        micBuffer,
        systemBuffer,
        data.metadata
      );

      return {
        success: true,
        ...result
      };
    } catch (error) {
      console.error('Failed to save recording files:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });
}

/**
 * 進捗状況の定期送信を開始
 */
function startProgressReporting() {
  if (recordingInterval) {
    clearInterval(recordingInterval);
  }

  recordingInterval = setInterval(() => {
    const mainWindow = getMainWindow();
    if (!mainWindow || !recordingStartTime) {
      return;
    }

    const duration = Math.floor((Date.now() - recordingStartTime) / 1000);

    // Phase 1: モックレベルデータ
    const micLevel = Math.random() * 100;
    const speakerLevel = Math.random() * 100;

    mainWindow.webContents.send(IPC_CHANNELS.RECORDING_PROGRESS, {
      duration,
      micLevel,
      speakerLevel
    });
  }, 100); // 100msごとに更新
}

/**
 * 進捗状況の定期送信を停止
 */
function stopProgressReporting() {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    recordingInterval = null;
  }
}
