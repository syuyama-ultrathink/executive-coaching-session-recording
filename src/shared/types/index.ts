// 共通型定義

export type RecordingQuality = 'standard' | 'high' | 'premium';

export interface AudioCaptureOptions {
  micDeviceId?: string;
  speakerDeviceId?: string;
  sampleRate: number;
  channels: number;
  quality: RecordingQuality;
}

export interface RecordingFiles {
  micPath: string;
  speakerPath: string;
  mixedPath: string;
}

export interface Recording {
  id: number;
  fileName: string;
  filePath: string;
  micPath?: string;
  speakerPath?: string;
  mixedPath?: string;
  recordedAt: Date;
  duration: number;
  fileSize?: number;
  memo?: string;
  quality: RecordingQuality;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecordingMetadata {
  fileName: string;
  memo?: string;
  quality: RecordingQuality;
}

export interface AudioDevice {
  id: string;
  name: string;
  maxInputChannels: number;
  maxOutputChannels: number;
}

export interface RecordingProgress {
  duration: number;
  micLevel: number;
  speakerLevel: number;
}

export interface DesktopCapturerSource {
  id: string;
  name: string;
  thumbnail: any;
}

export interface ElectronAPI {
  // Recording
  startRecording: (options: AudioCaptureOptions & RecordingMetadata) => Promise<{ success: boolean; id?: number; error?: string }>;
  stopRecording: () => Promise<{ success: boolean; files?: RecordingFiles; error?: string }>;
  pauseRecording: () => Promise<{ success: boolean; error?: string }>;
  resumeRecording: () => Promise<{ success: boolean; error?: string }>;

  // Devices
  getDevices: () => Promise<{ microphones: AudioDevice[]; speakers: AudioDevice[] }>;

  // Desktop Capturer
  getDesktopSources?: () => Promise<DesktopCapturerSource[]>;

  // Save recording files
  saveRecordingFiles?: (micBlob: Blob, systemBlob: Blob, metadata: RecordingMetadata) => Promise<{ success: boolean; error?: string }>;

  // Recordings
  getRecordings: () => Promise<Recording[]>;
  deleteRecording: (id: number) => Promise<{ success: boolean; error?: string }>;
  renameRecording: (id: number, newName: string) => Promise<{ success: boolean; error?: string }>;

  // Settings
  getSetting: (key: string) => Promise<string | null>;
  setSetting: (key: string, value: string) => Promise<{ success: boolean; error?: string }>;

  // Events
  onRecordingProgress: (callback: (progress: RecordingProgress) => void) => void;
  onRecordingError: (callback: (error: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
