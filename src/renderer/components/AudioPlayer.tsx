import React, { useRef, useState, useEffect } from 'react';
import { Card, Slider, Button, Space, Typography, Select, Row, Col } from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  SoundOutlined
} from '@ant-design/icons';

const { Text } = Typography;
const { Option } = Select;

interface AudioPlayerProps {
  micPath: string | null;
  speakerPath: string | null;
  mixedPath: string | null;
  fileName: string;
}

type AudioTrack = 'mic' | 'speaker' | 'mixed';

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  micPath,
  speakerPath,
  mixedPath,
  fileName
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const [currentTrack, setCurrentTrack] = useState<AudioTrack>('mixed');

  // トラックパスの取得
  const getTrackPath = (track: AudioTrack): string | null => {
    switch (track) {
      case 'mic':
        return micPath;
      case 'speaker':
        return speakerPath;
      case 'mixed':
        return mixedPath;
      default:
        return null;
    }
  };

  // 現在のトラックパスを取得
  const currentPath = getTrackPath(currentTrack);

  // トラック変更時にオーディオソースを更新
  useEffect(() => {
    if (audioRef.current && currentPath) {
      console.log('Loading audio from path:', currentPath);
      const wasPlaying = isPlaying;
      const savedTime = currentTime;

      // オーディオをリセット
      audioRef.current.pause();
      // カスタムプロトコルを使用してファイルを読み込む
      audioRef.current.src = `media://${encodeURIComponent(currentPath)}`;
      audioRef.current.currentTime = savedTime;

      console.log('Audio src set to:', audioRef.current.src);

      // 再生中だった場合は再開
      if (wasPlaying) {
        audioRef.current.play().catch(err => {
          console.error('Failed to resume playback:', err);
          setIsPlaying(false);
        });
      }
    }
  }, [currentPath]);

  // 再生/一時停止
  const togglePlay = () => {
    if (!audioRef.current || !currentPath) {
      console.log('Cannot play: audioRef or currentPath is null', { audioRef: !!audioRef.current, currentPath });
      return;
    }

    console.log('Toggle play. Current state:', { isPlaying, currentPath, src: audioRef.current.src });

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      console.log('Attempting to play audio...');
      audioRef.current.play().then(() => {
        console.log('Audio playback started successfully');
      }).catch(err => {
        console.error('Failed to play audio:', err);
      });
      setIsPlaying(true);
    }
  };

  // 時間更新
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  // メタデータ読み込み
  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      console.log('Metadata loaded. Duration:', audioRef.current.duration);
      setDuration(audioRef.current.duration);
    }
  };

  // エラー処理
  const handleError = (e: React.SyntheticEvent<HTMLAudioElement, Event>) => {
    const audio = e.currentTarget;
    console.error('Audio error:', {
      error: audio.error,
      code: audio.error?.code,
      message: audio.error?.message,
      src: audio.src,
      currentPath
    });
  };

  // 再生終了
  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  // シーク
  const handleSeek = (value: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value;
      setCurrentTime(value);
    }
  };

  // 音量変更
  const handleVolumeChange = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  };

  // 時間フォーマット
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 利用可能なトラックを確認
  const availableTracks: AudioTrack[] = [];
  if (micPath) availableTracks.push('mic');
  if (speakerPath) availableTracks.push('speaker');
  if (mixedPath) availableTracks.push('mixed');

  // デフォルトトラックを設定
  useEffect(() => {
    if (mixedPath) {
      setCurrentTrack('mixed');
    } else if (micPath) {
      setCurrentTrack('mic');
    } else if (speakerPath) {
      setCurrentTrack('speaker');
    }
  }, [micPath, speakerPath, mixedPath]);

  if (availableTracks.length === 0) {
    return (
      <Card>
        <Text type="secondary">再生可能な音声ファイルがありません</Text>
      </Card>
    );
  }

  const trackLabels: Record<AudioTrack, string> = {
    mic: 'マイク',
    speaker: 'スピーカー',
    mixed: 'ミックス'
  };

  return (
    <Card
      title={
        <Space>
          <SoundOutlined />
          <span>{fileName}</span>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleError}
        src={currentPath ? `media://${encodeURIComponent(currentPath)}` : undefined}
      />

      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* トラック選択 */}
        {availableTracks.length > 1 && (
          <Row gutter={16} align="middle">
            <Col>
              <Text>トラック:</Text>
            </Col>
            <Col flex="auto">
              <Select
                value={currentTrack}
                onChange={setCurrentTrack}
                style={{ width: 200 }}
              >
                {availableTracks.map(track => (
                  <Option key={track} value={track}>
                    {trackLabels[track]}
                  </Option>
                ))}
              </Select>
            </Col>
          </Row>
        )}

        {/* 再生コントロール */}
        <Row gutter={16} align="middle">
          <Col>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
              onClick={togglePlay}
            />
          </Col>
          <Col>
            <Text>{formatTime(currentTime)}</Text>
          </Col>
          <Col flex="auto">
            <Slider
              value={currentTime}
              max={duration || 0}
              step={0.1}
              onChange={handleSeek}
              tooltip={{ formatter: (value) => formatTime(value || 0) }}
            />
          </Col>
          <Col>
            <Text>{formatTime(duration)}</Text>
          </Col>
        </Row>

        {/* 音量コントロール */}
        <Row gutter={16} align="middle">
          <Col>
            <SoundOutlined />
          </Col>
          <Col flex="auto" style={{ maxWidth: 200 }}>
            <Slider
              value={volume}
              onChange={handleVolumeChange}
              tooltip={{ formatter: (value) => `${value}%` }}
            />
          </Col>
          <Col>
            <Text>{volume}%</Text>
          </Col>
        </Row>
      </Space>
    </Card>
  );
};

export default AudioPlayer;
