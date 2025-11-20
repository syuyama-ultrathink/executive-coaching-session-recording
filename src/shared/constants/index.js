"use strict";
// 共通定数
Object.defineProperty(exports, "__esModule", { value: true });
exports.SETTINGS_KEYS = exports.IPC_CHANNELS = exports.DEFAULT_QUALITY = exports.DEFAULT_CHANNELS = exports.DEFAULT_SAMPLE_RATE = exports.QUALITY_SETTINGS = void 0;
exports.QUALITY_SETTINGS = {
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
exports.DEFAULT_SAMPLE_RATE = 48000;
exports.DEFAULT_CHANNELS = 2;
exports.DEFAULT_QUALITY = 'high';
exports.IPC_CHANNELS = {
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
    // Settings
    GET_SETTING: 'get-setting',
    SET_SETTING: 'set-setting'
};
exports.SETTINGS_KEYS = {
    DEFAULT_SAVE_PATH: 'defaultSavePath',
    DEFAULT_QUALITY: 'defaultQuality',
    DEFAULT_MIC_DEVICE: 'defaultMicDevice',
    DEFAULT_SPEAKER_DEVICE: 'defaultSpeakerDevice'
};
