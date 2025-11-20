import type { AudioCaptureOptions, AudioDevice } from '../../shared/types';

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
    console.log('Starting audio capture with options:', options);

    // Phase 1: スタブ実装
    // 実際の録音は後のPhaseで実装
    this.isCapturing = true;

    // モックストリーム（実際には音声データが流れる）
    return {
      micStream: null,
      speakerStream: null
    };
  }

  /**
   * 録音停止
   */
  stopCapture(): void {
    console.log('Stopping audio capture');
    this.isCapturing = false;
    this.currentRecordingId = null;
  }

  /**
   * 一時停止
   */
  pauseCapture(): void {
    console.log('Pausing audio capture');
    // TODO: ストリームの一時停止
  }

  /**
   * 再開
   */
  resumeCapture(): void {
    console.log('Resuming audio capture');
    // TODO: ストリームの再開
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
