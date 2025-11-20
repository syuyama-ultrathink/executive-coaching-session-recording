"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const constants_1 = require("../shared/constants");
// Renderer Processに公開するAPI
const electronAPI = {
    // Recording
    startRecording: (options) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.START_RECORDING, options),
    stopRecording: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.STOP_RECORDING),
    pauseRecording: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.PAUSE_RECORDING),
    resumeRecording: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.RESUME_RECORDING),
    // Devices
    getDevices: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.GET_DEVICES),
    // Recordings
    getRecordings: () => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.GET_RECORDINGS),
    deleteRecording: (id) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.DELETE_RECORDING, id),
    renameRecording: (id, newName) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.RENAME_RECORDING, id, newName),
    // Settings
    getSetting: (key) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.GET_SETTING, key),
    setSetting: (key, value) => electron_1.ipcRenderer.invoke(constants_1.IPC_CHANNELS.SET_SETTING, key, value),
    // Events
    onRecordingProgress: (callback) => {
        electron_1.ipcRenderer.on(constants_1.IPC_CHANNELS.RECORDING_PROGRESS, (_event, progress) => {
            callback(progress);
        });
    },
    onRecordingError: (callback) => {
        electron_1.ipcRenderer.on(constants_1.IPC_CHANNELS.RECORDING_ERROR, (_event, error) => {
            callback(error);
        });
    }
};
// Context Isolationを有効にしてAPIを公開
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
