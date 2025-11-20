import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI, AudioCaptureOptions, RecordingMetadata, RecordingProgress } from '../shared/types';

// IPC_CHANNELSを直接定義（共有ファイルからのインポートを避ける）
const IPC_CHANNELS = {
  START_RECORDING: 'start-recording',
  STOP_RECORDING: 'stop-recording',
  PAUSE_RECORDING: 'pause-recording',
  RESUME_RECORDING: 'resume-recording',
  RECORDING_PROGRESS: 'recording-progress',
  RECORDING_ERROR: 'recording-error',
  GET_DEVICES: 'get-devices',
  GET_RECORDINGS: 'get-recordings',
  DELETE_RECORDING: 'delete-recording',
  RENAME_RECORDING: 'rename-recording',
  GET_SETTING: 'get-setting',
  SET_SETTING: 'set-setting'
} as const;

// Renderer Processに公開するAPI
const electronAPI: ElectronAPI = {
  // Recording
  startRecording: (options: AudioCaptureOptions & RecordingMetadata) =>
    ipcRenderer.invoke(IPC_CHANNELS.START_RECORDING, options),

  stopRecording: () =>
    ipcRenderer.invoke(IPC_CHANNELS.STOP_RECORDING),

  pauseRecording: () =>
    ipcRenderer.invoke(IPC_CHANNELS.PAUSE_RECORDING),

  resumeRecording: () =>
    ipcRenderer.invoke(IPC_CHANNELS.RESUME_RECORDING),

  // Devices
  getDevices: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_DEVICES),

  // Desktop Capturer - IPC経由でmainプロセスから取得
  getDesktopSources: async () => {
    return await ipcRenderer.invoke('get-desktop-sources');
  },

  // Save recording files
  saveRecordingFiles: async (micBlob: Blob, systemBlob: Blob, metadata: RecordingMetadata) => {
    // BlobをArrayBufferに変換
    const micBuffer = await micBlob.arrayBuffer();
    const systemBuffer = await systemBlob.arrayBuffer();

    // ArrayBufferをUint8Arrayに変換
    const micData = new Uint8Array(micBuffer);
    const systemData = new Uint8Array(systemBuffer);

    return ipcRenderer.invoke('save-recording-files', {
      micData: Array.from(micData),
      systemData: Array.from(systemData),
      metadata
    });
  },

  // Recordings
  getRecordings: () =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_RECORDINGS),

  deleteRecording: (id: number) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_RECORDING, id),

  renameRecording: (id: number, newName: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.RENAME_RECORDING, id, newName),

  // Settings
  getSetting: (key: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.GET_SETTING, key),

  setSetting: (key: string, value: string) =>
    ipcRenderer.invoke(IPC_CHANNELS.SET_SETTING, key, value),

  // Events
  onRecordingProgress: (callback: (progress: RecordingProgress) => void) => {
    ipcRenderer.on(IPC_CHANNELS.RECORDING_PROGRESS, (_event, progress) => {
      callback(progress);
    });
  },

  onRecordingError: (callback: (error: string) => void) => {
    ipcRenderer.on(IPC_CHANNELS.RECORDING_ERROR, (_event, error) => {
      callback(error);
    });
  }
};

// Context Isolationを有効にしてAPIを公開
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
