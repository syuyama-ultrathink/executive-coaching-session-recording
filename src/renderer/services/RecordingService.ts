/**
 * 録音サービス（Rendererプロセス）
 * MediaRecorder APIを使用してマイクとシステムオーディオを録音
 */

class RecordingService {
  private micRecorder: MediaRecorder | null = null;
  private systemRecorder: MediaRecorder | null = null;
  private micChunks: Blob[] = [];
  private systemChunks: Blob[] = [];
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;

  /**
   * マイク録音開始
   */
  async startMicRecording(): Promise<void> {
    try {
      // マイクストリーム取得
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 48000,
        },
      });

      // MediaRecorder作成
      this.micRecorder = new MediaRecorder(this.micStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.micChunks = [];

      this.micRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.micChunks.push(event.data);
        }
      };

      this.micRecorder.start(100); // 100msごとにデータを取得
      console.log('Microphone recording started');
    } catch (error) {
      console.error('Failed to start microphone recording:', error);
      throw error;
    }
  }

  /**
   * システムオーディオ録音開始
   */
  async startSystemRecording(): Promise<void> {
    try {
      // Electron desktopCapturerを使用してシステムオーディオを取得
      if (!window.electronAPI?.getDesktopSources) {
        throw new Error('desktopCapturer is not available');
      }

      const sources = await window.electronAPI.getDesktopSources();

      // 画面全体のソースを取得（最初のソースを使用）
      const source = sources[0];

      if (!source) {
        throw new Error('No desktop source found');
      }

      // getUserMediaを使ってストリームを取得
      // @ts-ignore - chromeMediaSourceとchromeMediaSourceIdはElectron固有
      this.systemStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id
          }
        },
        video: {
          mandatory: {
            chromeMediaSource: 'desktop',
            chromeMediaSourceId: source.id,
            minWidth: 1280,
            maxWidth: 1280,
            minHeight: 720,
            maxHeight: 720
          }
        }
      });

      // ビデオトラックを停止（オーディオのみ使用）
      const videoTracks = this.systemStream.getVideoTracks();
      videoTracks.forEach(track => track.stop());

      // オーディオトラックのみを含む新しいストリームを作成
      const audioTracks = this.systemStream.getAudioTracks();
      if (audioTracks.length === 0) {
        throw new Error('No audio track found in desktop stream');
      }

      this.systemStream = new MediaStream(audioTracks);

      // MediaRecorder作成
      this.systemRecorder = new MediaRecorder(this.systemStream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.systemChunks = [];

      this.systemRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.systemChunks.push(event.data);
        }
      };

      this.systemRecorder.start(100);
      console.log('System audio recording started');
    } catch (error) {
      console.error('Failed to start system audio recording:', error);
      throw error;
    }
  }

  /**
   * 録音停止
   */
  async stopRecording(): Promise<{ micBlob: Blob; systemBlob: Blob }> {
    return new Promise((resolve, reject) => {
      let micStopped = false;
      let systemStopped = false;
      let micBlob: Blob | null = null;
      let systemBlob: Blob | null = null;

      const checkComplete = () => {
        if (micStopped && systemStopped) {
          resolve({
            micBlob: micBlob!,
            systemBlob: systemBlob!,
          });
        }
      };

      // マイク停止
      if (this.micRecorder && this.micRecorder.state !== 'inactive') {
        this.micRecorder.onstop = () => {
          micBlob = new Blob(this.micChunks, { type: 'audio/webm' });
          micStopped = true;
          this.stopMicStream();
          checkComplete();
        };
        this.micRecorder.stop();
      } else {
        micBlob = new Blob([], { type: 'audio/webm' });
        micStopped = true;
      }

      // システムオーディオ停止
      if (this.systemRecorder && this.systemRecorder.state !== 'inactive') {
        this.systemRecorder.onstop = () => {
          systemBlob = new Blob(this.systemChunks, { type: 'audio/webm' });
          systemStopped = true;
          this.stopSystemStream();
          checkComplete();
        };
        this.systemRecorder.stop();
      } else {
        systemBlob = new Blob([], { type: 'audio/webm' });
        systemStopped = true;
      }

      checkComplete();
    });
  }

  /**
   * 一時停止
   */
  pauseRecording(): void {
    if (this.micRecorder && this.micRecorder.state === 'recording') {
      this.micRecorder.pause();
    }
    if (this.systemRecorder && this.systemRecorder.state === 'recording') {
      this.systemRecorder.pause();
    }
  }

  /**
   * 再開
   */
  resumeRecording(): void {
    if (this.micRecorder && this.micRecorder.state === 'paused') {
      this.micRecorder.resume();
    }
    if (this.systemRecorder && this.systemRecorder.state === 'paused') {
      this.systemRecorder.resume();
    }
  }

  /**
   * マイクストリーム停止
   */
  private stopMicStream(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  /**
   * システムオーディオストリーム停止
   */
  private stopSystemStream(): void {
    if (this.systemStream) {
      this.systemStream.getTracks().forEach((track) => track.stop());
      this.systemStream = null;
    }
  }

  /**
   * 録音中かどうか
   */
  isRecording(): boolean {
    return (
      (this.micRecorder?.state === 'recording') ||
      (this.systemRecorder?.state === 'recording')
    );
  }

  /**
   * 音声レベル取得（リアルタイム）
   */
  getMicLevel(): number {
    // TODO: AudioContext AnalyserNodeを使用して実装
    return Math.random() * 100;
  }

  getSystemLevel(): number {
    // TODO: AudioContext AnalyserNodeを使用して実装
    return Math.random() * 100;
  }
}

export default new RecordingService();
