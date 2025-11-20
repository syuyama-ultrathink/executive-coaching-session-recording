import { app, BrowserWindow, ipcMain, session } from 'electron';
import path from 'path';
import { registerRecordingHandlers } from './ipc/recordingHandlers';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import databaseService from './services/DatabaseService';
import fileService from './services/FileService';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, '../preload/index.js'),
      // メディアキャプチャを有効化
      enableBlinkFeatures: 'GetDisplayMedia'
    },
    title: 'Recording App',
    show: false
  });

  // メディアアクセス権限のリクエストを処理
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'display-capture'];
    if (allowedPermissions.includes(permission)) {
      callback(true); // 許可
    } else {
      callback(false); // 拒否
    }
  });

  // 開発環境とプロダクションで異なるURLをロード
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // ウィンドウ準備完了後に表示
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// アプリケーション初期化
app.whenReady().then(async () => {
  try {
    // サービス初期化
    await databaseService.initialize();
    await fileService.initialize();
    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }

  // IPC Handlersを登録
  registerRecordingHandlers();
  registerFileHandlers();
  registerSettingsHandlers();

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// すべてのウィンドウが閉じられたときの処理
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// アプリケーション終了時のクリーンアップ
app.on('before-quit', async () => {
  try {
    // 録音中の場合は停止する
    // TODO: 録音停止処理

    // データベースクローズ
    await databaseService.close();
    console.log('Services closed successfully');
  } catch (error) {
    console.error('Failed to close services:', error);
  }
});

// エクスポート（IPC Handlerから参照できるように）
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
