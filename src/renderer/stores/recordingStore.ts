import { create } from 'zustand';
import type { RecordingQuality, AudioDevice, RecordingProgress } from '../../shared/types';

const DEFAULT_QUALITY: RecordingQuality = 'high';

interface RecordingState {
  // 録音状態
  isRecording: boolean;
  isPaused: boolean;
  duration: number;

  // 録音設定
  fileName: string;
  memo: string;
  quality: RecordingQuality;

  // デバイス
  selectedMicDevice: string | undefined;
  selectedSpeakerDevice: string | undefined;
  microphones: AudioDevice[];
  speakers: AudioDevice[];

  // レベルメーター
  micLevel: number;
  speakerLevel: number;

  // ゲイン（音量調整）
  micGain: number;
  systemGain: number;

  // Actions
  setRecording: (isRecording: boolean) => void;
  setPaused: (isPaused: boolean) => void;
  setDuration: (duration: number) => void;
  setFileName: (fileName: string) => void;
  setMemo: (memo: string) => void;
  setQuality: (quality: RecordingQuality) => void;
  setSelectedMicDevice: (deviceId: string | undefined) => void;
  setSelectedSpeakerDevice: (deviceId: string | undefined) => void;
  setDevices: (microphones: AudioDevice[], speakers: AudioDevice[]) => void;
  updateProgress: (progress: RecordingProgress) => void;
  setMicGain: (gain: number) => void;
  setSystemGain: (gain: number) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  // Initial state
  isRecording: false,
  isPaused: false,
  duration: 0,
  fileName: '',
  memo: '',
  quality: DEFAULT_QUALITY,
  selectedMicDevice: undefined,
  selectedSpeakerDevice: undefined,
  microphones: [],
  speakers: [],
  micLevel: 0,
  speakerLevel: 0,
  micGain: 1.0, // 100% (範囲: 0.0 ～ 3.0)
  systemGain: 1.0, // 100% (範囲: 0.0 ～ 3.0)

  // Actions
  setRecording: (isRecording) => set({ isRecording }),
  setPaused: (isPaused) => set({ isPaused }),
  setDuration: (duration) => set({ duration }),
  setFileName: (fileName) => set({ fileName }),
  setMemo: (memo) => set({ memo }),
  setQuality: (quality) => set({ quality }),
  setSelectedMicDevice: (deviceId) => set({ selectedMicDevice: deviceId }),
  setSelectedSpeakerDevice: (deviceId) => set({ selectedSpeakerDevice: deviceId }),
  setDevices: (microphones, speakers) => set({ microphones, speakers }),

  updateProgress: (progress) =>
    set({
      duration: progress.duration,
      micLevel: progress.micLevel,
      speakerLevel: progress.speakerLevel
    }),

  setMicGain: (gain) => set({ micGain: gain }),
  setSystemGain: (gain) => set({ systemGain: gain }),

  reset: () =>
    set({
      isRecording: false,
      isPaused: false,
      duration: 0,
      fileName: '',
      memo: '',
      micLevel: 0,
      speakerLevel: 0
    })
}));
