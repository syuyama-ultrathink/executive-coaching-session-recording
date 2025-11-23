import type { AudioCaptureOptions, AudioDevice } from '../../shared/types';
import { logger } from '../utils/logger';

interface AudioStream {
  micStream: NodeJS.ReadableStream | null;
  speakerStream: NodeJS.ReadableStream | null;
}

class AudioCaptureService {
  private isCapturing = false;
  private currentRecordingId: number | null = null;

  /**
   * 録音開始
   * TODO: 実際の音声キャプチャ実装
   */
  async startCapture(options: AudioCaptureOptions): Promise<AudioStream> {
    logger.info('AudioCaptureService', 'startCapture called', options);

    // Phase 1: スタブ実装
    // 実際の録音は後のPhaseで実装
    this.isCapturing = true;
    logger.debug('AudioCaptureService', 'Capture state set to true');

    // モックストリーム（実際には音声データが流れる）
    logger.warn('AudioCaptureService', 'Using stub implementation - no actual audio capture');
    return {
      micStream: null,
      speakerStream: null
    };
  }

  /**
   * 録音停止
   */
  stopCapture(): void {
    logger.info('AudioCaptureService', 'stopCapture called');
    this.isCapturing = false;
    this.currentRecordingId = null;
    logger.debug('AudioCaptureService', 'Capture state reset');
  }

  /**
   * 一時停止
   */
  pauseCapture(): void {
    logger.info('AudioCaptureService', 'pauseCapture called');
    // TODO: ストリームの一時停止
    logger.warn('AudioCaptureService', 'Pause not implemented - using stub');
  }

  /**
   * 再開
   */
  resumeCapture(): void {
    logger.info('AudioCaptureService', 'resumeCapture called');
    // TODO: ストリームの再開
    logger.warn('AudioCaptureService', 'Resume not implemented - using stub');
  }

  /**
   * 利用可能なデバイス一覧取得
   * TODO: 実際のデバイス検出実装
   */
  getDevices(): { microphones: AudioDevice[]; speakers: AudioDevice[] } {
    // Phase 1: モックデータ
    return {
      microphones: [
        {
          id: 'default-mic',
          name: 'Default Microphone',
          maxInputChannels: 2,
          maxOutputChannels: 0
        }
      ],
      speakers: [
        {
          id: 'default-speaker',
          name: 'Default Speaker',
          maxInputChannels: 0,
          maxOutputChannels: 2
        }
      ]
    };
  }

  /**
   * 録音中かどうか
   */
  isRecording(): boolean {
    return this.isCapturing;
  }

  /**
   * 現在の録音IDを設定
   */
  setRecordingId(id: number): void {
    this.currentRecordingId = id;
  }
}

export default new AudioCaptureService();
