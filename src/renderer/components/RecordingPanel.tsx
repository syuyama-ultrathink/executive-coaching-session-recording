import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Select, Space, Typography, Divider, message, Slider } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  AudioOutlined
} from '@ant-design/icons';
import { useRecordingStore } from '../stores/recordingStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { RecordingQuality } from '../../shared/types';
import RecordingService from '../services/RecordingService';
import LevelMeter from './LevelMeter';

// QUALITY_SETTINGSを直接定義（共有ファイルからのインポートを避ける）
const QUALITY_SETTINGS: Record<RecordingQuality, { sampleRate: number; bitrate: string; label: string }> = {
  standard: { sampleRate: 44100, bitrate: '128k', label: '標準品質 (44.1kHz / 128kbps)' },
  high: { sampleRate: 48000, bitrate: '192k', label: '高品質 (48kHz / 192kbps)' },
  premium: { sampleRate: 48000, bitrate: '320k', label: '最高品質 (48kHz / 320kbps)' }
};

const { Title, Text } = Typography;
const { TextArea } = Input;

const RecordingPanel: React.FC = () => {
  const {
    isRecording,
    isPaused,
    duration,
    fileName,
    memo,
    quality,
    selectedMicDevice,
    selectedSpeakerDevice,
    microphones,
    speakers,
    micLevel,
    speakerLevel,
    micGain,
    systemGain,
    setRecording,
    setPaused,
    setFileName,
    setMemo,
    setQuality,
    setSelectedMicDevice,
    setSelectedSpeakerDevice,
    setMicGain,
    setSystemGain,
    reset
  } = useRecordingStore();

  const { settings } = useSettingsStore();
  const [loading, setLoading] = useState(false);

  // 録音時間を HH:MM:SS 形式で表示
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 録音開始
  const handleStart = async () => {
    try {
      setLoading(true);

      // ヘッドホン使用を推奨する通知
      message.info({
        content: '🎧 最良の音質のため、ヘッドホンの使用を推奨します',
        duration: 3,
      });

      // マイク録音開始（選択されたデバイスと音声処理設定を使用）
      await RecordingService.startMicRecording(selectedMicDevice, {
        echoCancellation: settings.echoCancellation,
        autoGainControl: settings.autoGainControl,
        noiseSuppression: settings.noiseSuppression,
      });

      // システムオーディオ録音開始
      let systemAudioSuccess = false;
      try {
        await RecordingService.startSystemRecording();
        systemAudioSuccess = true;
      } catch (systemError) {
        console.warn('System audio recording failed, continuing with mic only:', systemError);
      }

      // 両方のストリームが開始されたら、ミックス録音を開始
      if (systemAudioSuccess) {
        try {
          RecordingService.startMixRecording();
          message.success('マイク、システムオーディオ、ミックスの録音を開始しました');
        } catch (mixError) {
          console.warn('Mix recording failed:', mixError);
          message.warning('マイクとシステムオーディオの個別録音のみ開始しました');
        }
      } else {
        message.warning('マイクのみの録音を開始しました（システムオーディオの取得に失敗）');
      }

      // 録音時間をリセットしてから録音開始
      useRecordingStore.setState({ duration: 0 });
      setRecording(true);

      // 録音開始後、デバイスリストを更新（メディア権限が付与されたため、正しいラベルが取得できる）
      try {
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        const newMicrophones: Array<{ id: string; name: string; maxInputChannels: number; maxOutputChannels: number }> = [];
        const newSpeakers: Array<{ id: string; name: string; maxInputChannels: number; maxOutputChannels: number }> = [];

        deviceInfos.forEach((device) => {
          if (device.kind === 'audioinput') {
            newMicrophones.push({
              id: device.deviceId,
              name: device.label || `Microphone ${newMicrophones.length + 1}`,
              maxInputChannels: 2,
              maxOutputChannels: 0
            });
          } else if (device.kind === 'audiooutput') {
            newSpeakers.push({
              id: device.deviceId,
              name: device.label || `Speaker ${newSpeakers.length + 1}`,
              maxInputChannels: 0,
              maxOutputChannels: 2
            });
          }
        });

        useRecordingStore.setState({
          microphones: newMicrophones,
          speakers: newSpeakers
        });
      } catch (error) {
        console.warn('Failed to refresh device list:', error);
      }
    } catch (error) {
      message.error('録音開始に失敗しました');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 録音停止
  const handleStop = async () => {
    try {
      setLoading(true);

      // RecordingServiceから録音データ取得（3つのBlob）
      const { micBlob, systemBlob, mixBlob } = await RecordingService.stopRecording();

      console.log('Stopped recording, blob sizes:', {
        mic: micBlob.size,
        system: systemBlob.size,
        mix: mixBlob.size
      });

      // Main Processにファイル保存を依頼
      const result = await window.electronAPI.saveRecordingFiles(
        micBlob,
        systemBlob,
        mixBlob,
        {
          fileName,
          memo,
          quality
        }
      );

      if (result.success) {
        setRecording(false);
        message.success(`録音を保存しました（${formatDuration(duration)}）`);
        reset();
      } else {
        message.error(`録音保存エラー: ${result.error}`);
      }
    } catch (error) {
      message.error('録音停止に失敗しました');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // 一時停止/再開
  const handlePauseResume = async () => {
    try {
      if (isPaused) {
        RecordingService.resumeRecording();
        setPaused(false);
        message.info('録音を再開しました');
      } else {
        RecordingService.pauseRecording();
        setPaused(true);
        message.info('録音を一時停止しました');
      }
    } catch (error) {
      message.error('操作に失敗しました');
      console.error(error);
    }
  };

  // レベルメーター更新
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const intervalId = setInterval(() => {
      const micLevel = RecordingService.getMicLevel();
      const systemLevel = RecordingService.getSystemLevel();

      // storeを直接更新
      useRecordingStore.setState({
        micLevel,
        speakerLevel: systemLevel
      });
    }, 100); // 100msごとに更新

    return () => clearInterval(intervalId);
  }, [isRecording, isPaused]);

  // 録音時間のカウントアップ
  useEffect(() => {
    if (!isRecording || isPaused) return;

    const intervalId = setInterval(() => {
      useRecordingStore.setState((state) => ({
        duration: state.duration + 1
      }));
    }, 1000); // 1秒ごとに更新

    return () => clearInterval(intervalId);
  }, [isRecording, isPaused]);

  // ホットキーイベントリスナー
  useEffect(() => {
    if (!window.electronAPI) return;

    // 録音開始/停止のホットキー
    window.electronAPI.onHotkeyToggleRecording(() => {
      console.log('Hotkey: Toggle Recording');
      if (isRecording) {
        handleStop();
      } else {
        handleStart();
      }
    });

    // 一時停止/再開のホットキー
    window.electronAPI.onHotkeyTogglePause(() => {
      console.log('Hotkey: Toggle Pause');
      if (isRecording) {
        handlePauseResume();
      }
    });
  }, [isRecording, isPaused]); // 依存配列に状態を追加

  return (
    <Card
      style={{
        width: 800,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}
      title={
        <Space>
          <AudioOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={3} style={{ margin: 0 }}>
            Recording App
          </Title>
        </Space>
      }
    >
      {/* 録音時間表示 */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Title
          level={1}
          style={{
            margin: 0,
            fontSize: 64,
            fontFamily: 'monospace',
            color: isRecording ? '#ff4d4f' : '#8c8c8c'
          }}
        >
          {formatDuration(duration)}
        </Title>
        {isRecording && (
          <Text type="danger" style={{ fontSize: 16 }}>
            ● 録音中
          </Text>
        )}
      </div>

      <Divider />

      {/* レベルメーターと音量調整 */}
      <div style={{ marginBottom: 24 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Text strong>マイクレベル</Text>
              <LevelMeter level={micLevel} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ minWidth: 80 }}>音量調整:</Text>
                <Slider
                  min={0}
                  max={300}
                  value={Math.round(micGain * 100)}
                  onChange={(value) => {
                    const gain = value / 100;
                    setMicGain(gain);
                    RecordingService.setMicGain(gain);
                  }}
                  disabled={!isRecording}
                  style={{ flex: 1 }}
                  tooltip={{ formatter: (value) => `${value}%` }}
                />
                <Text style={{ minWidth: 50, textAlign: 'right' }}>{Math.round(micGain * 100)}%</Text>
              </div>
            </Space>
          </div>
          <div>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              <Text strong>スピーカーレベル</Text>
              <LevelMeter level={speakerLevel} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text style={{ minWidth: 80 }}>音量調整:</Text>
                <Slider
                  min={0}
                  max={300}
                  value={Math.round(systemGain * 100)}
                  onChange={(value) => {
                    const gain = value / 100;
                    setSystemGain(gain);
                    RecordingService.setSystemGain(gain);
                  }}
                  disabled={!isRecording}
                  style={{ flex: 1 }}
                  tooltip={{ formatter: (value) => `${value}%` }}
                />
                <Text style={{ minWidth: 50, textAlign: 'right' }}>{Math.round(systemGain * 100)}%</Text>
              </div>
            </Space>
          </div>
        </Space>
      </div>

      <Divider />

      {/* 録音設定 */}
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <div>
          <Text strong>ファイル名</Text>
          <Input
            placeholder="録音ファイル名を入力（空欄の場合は日時のみ）"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            disabled={isRecording}
          />
        </div>

        <div>
          <Text strong>メモ</Text>
          <TextArea
            placeholder="録音に関するメモ"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            disabled={isRecording}
            rows={2}
          />
        </div>

        <div>
          <Text strong>音質</Text>
          <Select
            style={{ width: '100%' }}
            value={quality}
            onChange={setQuality}
            disabled={isRecording}
            options={Object.entries(QUALITY_SETTINGS).map(([key, value]) => ({
              label: value.label,
              value: key
            }))}
          />
        </div>

        <div>
          <Text strong>マイクデバイス</Text>
          <Select
            style={{ width: '100%' }}
            value={selectedMicDevice}
            onChange={setSelectedMicDevice}
            disabled={isRecording}
            options={microphones.map((device) => ({
              label: device.name,
              value: device.id
            }))}
          />
        </div>

        <div>
          <Text strong>スピーカーデバイス</Text>
          <Select
            style={{ width: '100%' }}
            value={selectedSpeakerDevice}
            onChange={setSelectedSpeakerDevice}
            disabled={isRecording}
            options={speakers.map((device) => ({
              label: device.name,
              value: device.id
            }))}
          />
        </div>
      </Space>

      <Divider />

      {/* 録音ボタン */}
      <Space style={{ width: '100%', justifyContent: 'center' }} size="large">
        {!isRecording ? (
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={handleStart}
            loading={loading}
            style={{ width: 150 }}
          >
            録音開始
          </Button>
        ) : (
          <>
            <Button
              size="large"
              icon={<PauseCircleOutlined />}
              onClick={handlePauseResume}
              style={{ width: 150 }}
            >
              {isPaused ? '再開' : '一時停止'}
            </Button>
            <Button
              danger
              size="large"
              icon={<StopOutlined />}
              onClick={handleStop}
              loading={loading}
              style={{ width: 150 }}
            >
              録音停止
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
};

export default RecordingPanel;
