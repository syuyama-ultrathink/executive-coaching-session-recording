// 共通定数

import type { RecordingQuality } from '../types';

export const QUALITY_SETTINGS: Record<RecordingQuality, { sampleRate: number; bitrate: string; label: string }> = {
  standard: {
    sampleRate: 44100,
    bitrate: '128k',
    label: '標準品質 (44.1kHz / 128kbps)'
  },
  high: {
    sampleRate: 48000,
    bitrate: '192k',
    label: '高品質 (48kHz / 192kbps)'
  },
  premium: {
    sampleRate: 48000,
    bitrate: '320k',
    label: '最高品質 (48kHz / 320kbps)'
  }
};

export const DEFAULT_SAMPLE_RATE = 48000;
export const DEFAULT_CHANNELS = 2;
export const DEFAULT_QUALITY: RecordingQuality = 'high';

export const IPC_CHANNELS = {
  // Recording
  START_RECORDING: 'start-recording',
  STOP_RECORDING: 'stop-recording',
  PAUSE_RECORDING: 'pause-recording',
  RESUME_RECORDING: 'resume-recording',
  RECORDING_PROGRESS: 'recording-progress',
  RECORDING_ERROR: 'recording-error',

  // Devices
  GET_DEVICES: 'get-devices',

  // Recordings
  GET_RECORDINGS: 'get-recordings',
  DELETE_RECORDING: 'delete-recording',
  RENAME_RECORDING: 'rename-recording',
  UPDATE_RECORDING_MEMO: 'update-recording-memo',

  // Settings
  GET_SETTING: 'get-setting',
  SET_SETTING: 'set-setting'
} as const;

export const SETTINGS_KEYS = {
  DEFAULT_SAVE_PATH: 'defaultSavePath',
  DEFAULT_QUALITY: 'defaultQuality',
  DEFAULT_MIC_DEVICE: 'defaultMicDevice',
  DEFAULT_SPEAKER_DEVICE: 'defaultSpeakerDevice'
} as const;
