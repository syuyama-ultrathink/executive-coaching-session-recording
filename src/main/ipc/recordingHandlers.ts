import { ipcMain, desktopCapturer } from 'electron';
import type { AudioCaptureOptions, RecordingMetadata } from '../../shared/types';
import { IPC_CHANNELS } from '../../shared/constants';
import audioCaptureService from '../services/AudioCaptureService';
import fileService from '../services/FileService';
import { getMainWindow } from '../index';
import { logger } from '../utils/logger';

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
        logger.info('RecordingHandler', 'Start recording requested', options);

        // 音声キャプチャ開始
        logger.debug('RecordingHandler', 'Starting audio capture service...');
        await audioCaptureService.startCapture(options);
        logger.info('RecordingHandler', 'Audio capture service started');

        // 録音開始時刻を記録
        recordingStartTime = Date.now();
        logger.debug('RecordingHandler', 'Recording start time set', { startTime: recordingStartTime });

        // 進捗状況の定期送信を開始
        startProgressReporting();
        logger.debug('RecordingHandler', 'Progress reporting started');

        logger.info('RecordingHandler', 'Recording started successfully');
        return {
          success: true,
          id: 1 // TODO: 実際の録音IDを返す
        };
      } catch (error) {
        logger.error('RecordingHandler', 'Failed to start recording', error);
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
      logger.info('RecordingHandler', 'Stop recording requested');

      // 進捗報告を停止
      logger.debug('RecordingHandler', 'Stopping progress reporting...');
      stopProgressReporting();
      logger.debug('RecordingHandler', 'Progress reporting stopped');

      // 録音時間を計算
      const duration = recordingStartTime
        ? Math.floor((Date.now() - recordingStartTime) / 1000)
        : 0;
      logger.info('RecordingHandler', 'Recording duration calculated', { duration, startTime: recordingStartTime });

      // 音声キャプチャ停止
      logger.debug('RecordingHandler', 'Stopping audio capture service...');
      audioCaptureService.stopCapture();
      logger.info('RecordingHandler', 'Audio capture service stopped');

      // ファイル保存
      logger.debug('RecordingHandler', 'Saving recording files...');
      const metadata = {
        fileName: 'recording',
        quality: 'high' as const,
        memo: ''
      };
      logger.debug('RecordingHandler', 'File metadata', metadata);

      const files = await fileService.saveRecording(metadata, duration);
      logger.info('RecordingHandler', 'Recording files saved', files);

      recordingStartTime = null;
      logger.debug('RecordingHandler', 'Recording state reset');

      logger.info('RecordingHandler', 'Recording stopped successfully');
      return {
        success: true,
        files
      };
    } catch (error) {
      logger.error('RecordingHandler', 'Failed to stop recording', error);
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
      logger.info('RecordingHandler', 'Pause recording requested');
      audioCaptureService.pauseCapture();
      stopProgressReporting();
      logger.info('RecordingHandler', 'Recording paused successfully');

      return { success: true };
    } catch (error) {
      logger.error('RecordingHandler', 'Failed to pause recording', error);
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
      logger.info('RecordingHandler', 'Resume recording requested');
      audioCaptureService.resumeCapture();
      startProgressReporting();
      logger.info('RecordingHandler', 'Recording resumed successfully');

      return { success: true };
    } catch (error) {
      logger.error('RecordingHandler', 'Failed to resume recording', error);
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
    mixData: number[];
    metadata: RecordingMetadata;
  }) => {
    try {
      console.log('IPC: Save recording files', {
        micDataSize: data.micData.length,
        systemDataSize: data.systemData.length,
        mixDataSize: data.mixData.length,
        metadata: data.metadata
      });

      // 配列をBufferに変換
      const micBuffer = Buffer.from(data.micData);
      const systemBuffer = Buffer.from(data.systemData);
      const mixBuffer = Buffer.from(data.mixData);

      // FileServiceでファイル保存とMP3変換
      const result = await fileService.saveRecordingFromBlobs(
        micBuffer,
        systemBuffer,
        mixBuffer,
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
