/**
 * 録音サービス（Rendererプロセス）
 * MediaRecorder APIを使用してマイクとシステムオーディオを録音
 */

class RecordingService {
  private micRecorder: MediaRecorder | null = null;
  private systemRecorder: MediaRecorder | null = null;
  private mixRecorder: MediaRecorder | null = null;
  private micChunks: Blob[] = [];
  private systemChunks: Blob[] = [];
  private mixChunks: Blob[] = [];
  private micStream: MediaStream | null = null;
  private systemStream: MediaStream | null = null;

  // Web Audio API for level monitoring and volume control
  private audioContext: AudioContext | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private systemAnalyser: AnalyserNode | null = null;
  private micDataArray: Uint8Array | null = null;
  private systemDataArray: Uint8Array | null = null;

  // Gain nodes for volume control (user-adjustable)
  private micGainNode: GainNode | null = null;
  private systemGainNode: GainNode | null = null;

  // Auto-balance gain nodes (for automatic volume balancing)
  private micAutoGainNode: GainNode | null = null;
  private systemAutoGainNode: GainNode | null = null;

  // Destination nodes for recording with gain applied
  private micDestination: MediaStreamAudioDestinationNode | null = null;
  private systemDestination: MediaStreamAudioDestinationNode | null = null;
  private mixDestination: MediaStreamAudioDestinationNode | null = null;

  // Volume statistics for auto-balancing
  private micRmsHistory: number[] = [];
  private systemRmsHistory: number[] = [];
  private volumeMonitorInterval: number | null = null;

  /**
   * マイク録音開始
   */
  async startMicRecording(
    deviceId?: string,
    audioProcessing?: {
      echoCancellation?: boolean;
      autoGainControl?: boolean;
      noiseSuppression?: boolean;
    }
  ): Promise<void> {
    try {
      // マイクストリーム取得
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: audioProcessing?.echoCancellation ?? true,
        autoGainControl: audioProcessing?.autoGainControl ?? true,
        noiseSuppression: audioProcessing?.noiseSuppression ?? true,
        sampleRate: 48000,
      };

      console.log('Audio processing settings:', {
        echoCancellation: audioConstraints.echoCancellation,
        autoGainControl: audioConstraints.autoGainControl,
        noiseSuppression: audioConstraints.noiseSuppression
      });

      // デバイスIDが指定されている場合は、そのデバイスを使用
      if (deviceId) {
        audioConstraints.deviceId = { exact: deviceId };
        console.log('Using specific microphone device:', deviceId);
      } else {
        console.log('Using default microphone device');
      }

      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
      });

      // AudioContextとノードのセットアップ
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const micSource = this.audioContext.createMediaStreamSource(this.micStream);

      // Gain node for volume control
      this.micGainNode = this.audioContext.createGain();
      this.micGainNode.gain.value = 1.0; // デフォルトは100%

      // Analyser for level monitoring
      this.micAnalyser = this.audioContext.createAnalyser();
      this.micAnalyser.fftSize = 256;

      // Destination for recording
      this.micDestination = this.audioContext.createMediaStreamDestination();

      // Connect nodes: Source -> Gain -> Analyser -> Destination
      micSource.connect(this.micGainNode);
      this.micGainNode.connect(this.micAnalyser);
      this.micGainNode.connect(this.micDestination);

      const bufferLength = this.micAnalyser.frequencyBinCount;
      this.micDataArray = new Uint8Array(bufferLength);

      // MediaRecorder作成（gain適用済みのストリームを使用）
      this.micRecorder = new MediaRecorder(this.micDestination.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.micChunks = [];

      this.micRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.micChunks.push(event.data);
        }
      };

      this.micRecorder.onerror = (event) => {
        console.error('Microphone recorder error:', event);
        this.handleRecordingError('マイク録音中にエラーが発生しました');
      };

      this.micRecorder.start(100); // 100msごとにデータを取得
      console.log('Microphone recording started with audio level monitoring');
    } catch (error) {
      // リソースのクリーンアップ
      this.stopMicStream();

      // エラーの種類に応じた詳細なメッセージ
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('マイクへのアクセスが拒否されました。ブラウザの設定でマイクの使用を許可してください。');
        } else if (error.name === 'NotFoundError') {
          throw new Error('マイクが見つかりませんでした。マイクが接続されていることを確認してください。');
        } else if (error.name === 'NotReadableError') {
          throw new Error('マイクが使用中です。他のアプリケーションでマイクを使用していないか確認してください。');
        } else if (error.name === 'NotSupportedError') {
          throw new Error('このブラウザではマイク録音がサポートされていません。');
        }
      }

      console.error('Failed to start microphone recording:', error);
      throw new Error('マイク録音の開始に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  }

  /**
   * システムオーディオ録音開始
   */
  async startSystemRecording(): Promise<void> {
    try {
      // getDisplayMedia()を使用してシステムオーディオをキャプチャ
      // main/index.tsのsetDisplayMediaRequestHandlerが自動的に呼ばれる
      // @ts-ignore - getDisplayMediaのaudioオプション
      this.systemStream = await navigator.mediaDevices.getDisplayMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
        video: {
          width: 1280,
          height: 720,
        }
      });

      // ビデオトラックを停止（オーディオのみ使用）
      const videoTracks = this.systemStream.getVideoTracks();
      videoTracks.forEach(track => track.stop());

      // オーディオトラックのみを含む新しいストリームを作成
      const audioTracks = this.systemStream.getAudioTracks();
      if (audioTracks.length === 0) {
        // ストリームのクリーンアップ
        this.stopSystemStream();
        throw new Error('システムオーディオトラックが見つかりませんでした。システムオーディオの出力があることを確認してください。');
      }

      console.log('System audio tracks:', audioTracks.map(t => ({
        label: t.label,
        enabled: t.enabled,
        muted: t.muted,
        settings: t.getSettings()
      })));

      this.systemStream = new MediaStream(audioTracks);

      // AudioContextとノードのセットアップ
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }

      const systemSource = this.audioContext.createMediaStreamSource(this.systemStream);

      // Gain node for volume control
      this.systemGainNode = this.audioContext.createGain();
      this.systemGainNode.gain.value = 1.0; // デフォルトは100%

      // Analyser for level monitoring
      this.systemAnalyser = this.audioContext.createAnalyser();
      this.systemAnalyser.fftSize = 256;

      // Destination for recording
      this.systemDestination = this.audioContext.createMediaStreamDestination();

      // Connect nodes: Source -> Gain -> Analyser -> Destination
      systemSource.connect(this.systemGainNode);
      this.systemGainNode.connect(this.systemAnalyser);
      this.systemGainNode.connect(this.systemDestination);

      const bufferLength = this.systemAnalyser.frequencyBinCount;
      this.systemDataArray = new Uint8Array(bufferLength);

      // MediaRecorder作成（gain適用済みのストリームを使用）
      this.systemRecorder = new MediaRecorder(this.systemDestination.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.systemChunks = [];

      this.systemRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.systemChunks.push(event.data);
        }
      };

      this.systemRecorder.onerror = (event) => {
        console.error('System audio recorder error:', event);
        this.handleRecordingError('システムオーディオ録音中にエラーが発生しました');
      };

      this.systemRecorder.start(100);
      console.log('System audio recording started with audio level monitoring');
    } catch (error) {
      // リソースのクリーンアップ
      this.stopSystemStream();

      // エラーの種類に応じた詳細なメッセージ
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          throw new Error('画面共有へのアクセスが拒否されました。ブラウザの設定で画面共有を許可してください。');
        } else if (error.name === 'NotFoundError') {
          throw new Error('画面共有のソースが見つかりませんでした。');
        } else if (error.name === 'NotReadableError') {
          throw new Error('画面共有が使用中です。他のアプリケーションで画面共有を使用していないか確認してください。');
        } else if (error.name === 'NotSupportedError') {
          throw new Error('このブラウザでは画面共有がサポートされていません。');
        } else if (error.message.includes('desktopCapturer') || error.message.includes('desktop source')) {
          // 既に詳細なエラーメッセージがある場合はそのまま使用
          throw error;
        }
      }

      console.error('Failed to start system audio recording:', error);
      throw new Error('システムオーディオ録音の開始に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  }

  /**
   * ミックス録音開始（マイクとシステムオーディオの両方が開始された後に呼び出す）
   */
  startMixRecording(): void {
    if (!this.audioContext || !this.micGainNode || !this.systemGainNode) {
      throw new Error('マイクまたはシステムオーディオが開始されていません');
    }

    try {
      // ミックス用のデスティネーションを作成
      this.mixDestination = this.audioContext.createMediaStreamDestination();

      // 既存のGainNodeから自動バランス調整用のGainNodeを経由してミックスに接続
      // これにより、同じストリームから複数のSourceを作成する問題を回避
      this.micAutoGainNode = this.audioContext.createGain();
      this.micAutoGainNode.gain.value = 1.0; // 初期値は1.0、後で自動調整

      this.systemAutoGainNode = this.audioContext.createGain();
      this.systemAutoGainNode.gain.value = 1.0; // 初期値は1.0、後で自動調整

      // 既存のGainNodeの出力をauto-gainノード経由でミックスデスティネーションに接続
      // 注: 1つのノードから複数の出力先に接続可能（micGainNode → micDestination と micAutoGainNode の両方）
      this.micGainNode.connect(this.micAutoGainNode);
      this.micAutoGainNode.connect(this.mixDestination);

      this.systemGainNode.connect(this.systemAutoGainNode);
      this.systemAutoGainNode.connect(this.mixDestination);

      // ミックスストリーム用のMediaRecorderを作成
      this.mixRecorder = new MediaRecorder(this.mixDestination.stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      this.mixChunks = [];

      this.mixRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.mixChunks.push(event.data);
        }
      };

      this.mixRecorder.onerror = (event) => {
        console.error('Mix recorder error:', event);
        this.handleRecordingError('ミックス録音中にエラーが発生しました');
      };

      this.mixRecorder.start(100);
      console.log('Mix recording started');

      // 音量監視を開始
      this.startVolumeMonitoring();
    } catch (error) {
      console.error('Failed to start mix recording:', error);
      throw new Error('ミックス録音の開始に失敗しました: ' + (error instanceof Error ? error.message : '不明なエラー'));
    }
  }

  /**
   * 音量監視を開始（RMS値を定期的に記録）
   */
  private startVolumeMonitoring(): void {
    // 既存の監視を停止
    if (this.volumeMonitorInterval) {
      clearInterval(this.volumeMonitorInterval);
    }

    // 音量統計をリセット
    this.micRmsHistory = [];
    this.systemRmsHistory = [];

    // 100msごとに音量を測定
    this.volumeMonitorInterval = window.setInterval(() => {
      if (this.micAnalyser && this.micDataArray) {
        this.micAnalyser.getByteTimeDomainData(this.micDataArray);
        const micRms = this.calculateRMS(this.micDataArray);
        this.micRmsHistory.push(micRms);
      }

      if (this.systemAnalyser && this.systemDataArray) {
        this.systemAnalyser.getByteTimeDomainData(this.systemDataArray);
        const systemRms = this.calculateRMS(this.systemDataArray);
        this.systemRmsHistory.push(systemRms);
      }

      // 音量統計が十分に集まったら（3秒分 = 30サンプル）、自動バランス調整を実行
      if (this.micRmsHistory.length >= 30 && this.systemRmsHistory.length >= 30) {
        this.autoBalanceVolume();
      }
    }, 100);
  }

  /**
   * RMS値を計算
   */
  private calculateRMS(dataArray: Uint8Array): number {
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128; // -1 to 1
      sum += normalized * normalized;
    }
    return Math.sqrt(sum / dataArray.length);
  }

  /**
   * 音量の自動バランス調整
   */
  private autoBalanceVolume(): void {
    if (this.micRmsHistory.length === 0 || this.systemRmsHistory.length === 0) {
      return;
    }

    // 平均RMS値を計算
    const micAvgRms = this.micRmsHistory.reduce((a, b) => a + b, 0) / this.micRmsHistory.length;
    const systemAvgRms = this.systemRmsHistory.reduce((a, b) => a + b, 0) / this.systemRmsHistory.length;

    console.log('Volume stats:', {
      micAvgRms: micAvgRms.toFixed(4),
      systemAvgRms: systemAvgRms.toFixed(4),
      micMax: Math.max(...this.micRmsHistory).toFixed(4),
      systemMax: Math.max(...this.systemRmsHistory).toFixed(4),
    });

    // 音量が非常に小さい場合は調整しない（無音の可能性）
    if (micAvgRms < 0.01 || systemAvgRms < 0.01) {
      console.log('Skipping auto-balance: volume too low');
      return;
    }

    // 音量比率を計算
    const ratio = micAvgRms / systemAvgRms;

    // マイクとスピーカーの音量を同じにするためのゲイン値を計算
    if (ratio > 1.5) {
      // マイクの方が大きい場合、スピーカーを増幅
      const systemGain = Math.min(ratio, 3.0); // 最大3倍まで
      if (this.systemAutoGainNode) {
        this.systemAutoGainNode.gain.value = systemGain;
        console.log(`Auto-balanced: system gain = ${systemGain.toFixed(2)}x`);
      }
    } else if (ratio < 0.67) {
      // スピーカーの方が大きい場合、マイクを増幅
      const micGain = Math.min(1 / ratio, 3.0); // 最大3倍まで
      if (this.micAutoGainNode) {
        this.micAutoGainNode.gain.value = micGain;
        console.log(`Auto-balanced: mic gain = ${micGain.toFixed(2)}x`);
      }
    } else {
      console.log('Volume balance is good, no adjustment needed');
    }

    // 統計をリセット（次の測定期間用）
    this.micRmsHistory = [];
    this.systemRmsHistory = [];
  }

  /**
   * 音量監視を停止
   */
  private stopVolumeMonitoring(): void {
    if (this.volumeMonitorInterval) {
      clearInterval(this.volumeMonitorInterval);
      this.volumeMonitorInterval = null;
    }
  }

  /**
   * 録音停止
   */
  async stopRecording(): Promise<{ micBlob: Blob; systemBlob: Blob; mixBlob: Blob }> {
    // 音量監視を停止
    this.stopVolumeMonitoring();

    return new Promise((resolve, reject) => {
      let micStopped = false;
      let systemStopped = false;
      let mixStopped = false;
      let micBlob: Blob | null = null;
      let systemBlob: Blob | null = null;
      let mixBlob: Blob | null = null;
      let hasError = false;

      // タイムアウト処理（10秒）
      const timeout = setTimeout(() => {
        if (!hasError && (!micStopped || !systemStopped || !mixStopped)) {
          hasError = true;
          console.error('Recording stop timeout');

          // 強制的にストリームを停止
          this.stopMicStream();
          this.stopSystemStream();
          this.closeAudioContext();

          reject(new Error('録音停止がタイムアウトしました。録音データが破損している可能性があります。'));
        }
      }, 10000);

      const checkComplete = () => {
        if (micStopped && systemStopped && mixStopped && !hasError) {
          clearTimeout(timeout);

          // AudioContextをクローズ
          this.closeAudioContext();

          resolve({
            micBlob: micBlob!,
            systemBlob: systemBlob!,
            mixBlob: mixBlob!,
          });
        }
      };

      // マイク停止
      try {
        if (this.micRecorder && this.micRecorder.state !== 'inactive') {
          this.micRecorder.onstop = () => {
            try {
              micBlob = new Blob(this.micChunks, { type: 'audio/webm' });
              micStopped = true;
              this.stopMicStream();
              checkComplete();
            } catch (error) {
              if (!hasError) {
                hasError = true;
                clearTimeout(timeout);
                console.error('Failed to create mic blob:', error);
                reject(new Error('マイク録音データの作成に失敗しました'));
              }
            }
          };

          this.micRecorder.onerror = (event) => {
            if (!hasError) {
              hasError = true;
              clearTimeout(timeout);
              console.error('Mic recorder stop error:', event);
              reject(new Error('マイク録音の停止中にエラーが発生しました'));
            }
          };

          this.micRecorder.stop();
        } else {
          micBlob = new Blob([], { type: 'audio/webm' });
          micStopped = true;
        }
      } catch (error) {
        if (!hasError) {
          hasError = true;
          clearTimeout(timeout);
          console.error('Failed to stop mic recorder:', error);
          reject(new Error('マイク録音の停止に失敗しました'));
          return;
        }
      }

      // システムオーディオ停止
      try {
        if (this.systemRecorder && this.systemRecorder.state !== 'inactive') {
          this.systemRecorder.onstop = () => {
            try {
              systemBlob = new Blob(this.systemChunks, { type: 'audio/webm' });
              systemStopped = true;
              this.stopSystemStream();
              checkComplete();
            } catch (error) {
              if (!hasError) {
                hasError = true;
                clearTimeout(timeout);
                console.error('Failed to create system blob:', error);
                reject(new Error('システムオーディオ録音データの作成に失敗しました'));
              }
            }
          };

          this.systemRecorder.onerror = (event) => {
            if (!hasError) {
              hasError = true;
              clearTimeout(timeout);
              console.error('System recorder stop error:', event);
              reject(new Error('システムオーディオ録音の停止中にエラーが発生しました'));
            }
          };

          this.systemRecorder.stop();
        } else {
          systemBlob = new Blob([], { type: 'audio/webm' });
          systemStopped = true;
        }
      } catch (error) {
        if (!hasError) {
          hasError = true;
          clearTimeout(timeout);
          console.error('Failed to stop system recorder:', error);
          reject(new Error('システムオーディオ録音の停止に失敗しました'));
          return;
        }
      }

      // ミックス停止
      try {
        if (this.mixRecorder && this.mixRecorder.state !== 'inactive') {
          this.mixRecorder.onstop = () => {
            try {
              mixBlob = new Blob(this.mixChunks, { type: 'audio/webm' });
              mixStopped = true;
              checkComplete();
            } catch (error) {
              if (!hasError) {
                hasError = true;
                clearTimeout(timeout);
                console.error('Failed to create mix blob:', error);
                reject(new Error('ミックス録音データの作成に失敗しました'));
              }
            }
          };

          this.mixRecorder.onerror = (event) => {
            if (!hasError) {
              hasError = true;
              clearTimeout(timeout);
              console.error('Mix recorder stop error:', event);
              reject(new Error('ミックス録音の停止中にエラーが発生しました'));
            }
          };

          this.mixRecorder.stop();
        } else {
          mixBlob = new Blob([], { type: 'audio/webm' });
          mixStopped = true;
        }
      } catch (error) {
        if (!hasError) {
          hasError = true;
          clearTimeout(timeout);
          console.error('Failed to stop mix recorder:', error);
          reject(new Error('ミックス録音の停止に失敗しました'));
          return;
        }
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
    if (this.mixRecorder && this.mixRecorder.state === 'recording') {
      this.mixRecorder.pause();
    }
    // 音量監視も一時停止
    this.stopVolumeMonitoring();
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
    if (this.mixRecorder && this.mixRecorder.state === 'paused') {
      this.mixRecorder.resume();
    }
    // 音量監視も再開
    if (this.mixRecorder) {
      this.startVolumeMonitoring();
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
    if (!this.micAnalyser || !this.micDataArray) {
      return 0;
    }

    this.micAnalyser.getByteTimeDomainData(this.micDataArray);

    // RMS (Root Mean Square) を計算
    let sum = 0;
    for (let i = 0; i < this.micDataArray.length; i++) {
      const normalized = (this.micDataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.micDataArray.length);

    // 0-100の範囲にスケール
    return Math.min(100, rms * 200);
  }

  getSystemLevel(): number {
    if (!this.systemAnalyser || !this.systemDataArray) {
      return 0;
    }

    this.systemAnalyser.getByteTimeDomainData(this.systemDataArray);

    // RMS (Root Mean Square) を計算
    let sum = 0;
    for (let i = 0; i < this.systemDataArray.length; i++) {
      const normalized = (this.systemDataArray[i] - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / this.systemDataArray.length);

    // 0-100の範囲にスケール
    return Math.min(100, rms * 200);
  }

  /**
   * マイクのゲイン（音量）を設定
   * @param gain 0.0 ～ 3.0（0% ～ 300%）
   */
  setMicGain(gain: number): void {
    if (this.micGainNode) {
      this.micGainNode.gain.value = Math.max(0, Math.min(3, gain));
      console.log('Mic gain set to:', this.micGainNode.gain.value);
    }
  }

  /**
   * システムオーディオのゲイン（音量）を設定
   * @param gain 0.0 ～ 3.0（0% ～ 300%）
   */
  setSystemGain(gain: number): void {
    if (this.systemGainNode) {
      this.systemGainNode.gain.value = Math.max(0, Math.min(3, gain));
      console.log('System gain set to:', this.systemGainNode.gain.value);
    }
  }

  /**
   * AudioContextをクローズ
   */
  private closeAudioContext(): void {
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.micAnalyser = null;
    this.systemAnalyser = null;
    this.micDataArray = null;
    this.systemDataArray = null;
    this.micGainNode = null;
    this.systemGainNode = null;
    this.micDestination = null;
    this.systemDestination = null;
  }

  /**
   * 録音エラーハンドリング
   */
  private handleRecordingError(message: string): void {
    console.error('Recording error:', message);

    // すべてのストリームを停止
    this.stopMicStream();
    this.stopSystemStream();

    // AudioContextをクローズ
    this.closeAudioContext();

    // レコーダーをリセット
    this.micRecorder = null;
    this.systemRecorder = null;
    this.micChunks = [];
    this.systemChunks = [];

    // ユーザーにエラーを通知（UIで表示される）
    alert(message);
  }
}

export default new RecordingService();
