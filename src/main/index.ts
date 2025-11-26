import { app, BrowserWindow, ipcMain, session, desktopCapturer, protocol, globalShortcut } from 'electron';
import path from 'path';
import fs from 'fs';
import { registerRecordingHandlers } from './ipc/recordingHandlers';
import { registerFileHandlers } from './ipc/fileHandlers';
import { registerSettingsHandlers } from './ipc/settingsHandlers';
import databaseService from './services/DatabaseService';
import fileService from './services/FileService';
import trayService from './services/TrayService';
import { logger } from './utils/logger';

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

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

  // DisplayMediaのリクエストを処理（システムオーディオキャプチャ用）
  session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
    logger.info('DisplayMediaRequest', 'Display media request received');

    desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
      logger.debug('DisplayMediaRequest', 'Desktop sources retrieved', { count: sources.length });

      // 最初の画面ソースを選択（通常はプライマリディスプレイ）
      const screenSource = sources.find(source => source.id.startsWith('screen'));

      if (screenSource) {
        logger.info('DisplayMediaRequest', 'Screen source selected', {
          id: screenSource.id,
          name: screenSource.name
        });

        // ビデオは不要、オーディオのみループバック
        callback({
          video: screenSource,
          audio: 'loopback' // システムオーディオのループバック
        });
      } else {
        logger.warn('DisplayMediaRequest', 'No screen source found');
        callback({});
      }
    }).catch((error) => {
      logger.error('DisplayMediaRequest', 'Failed to get desktop sources', error);
      callback({});
    });
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
    // トレイサービスを初期化
    if (mainWindow) {
      trayService.initialize(mainWindow);
      logger.info('App', 'Tray service initialized');
    }
  });

  // ウィンドウを閉じる際の処理（トレイに最小化）
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      trayService.showNotification(
        'Recording App',
        'アプリはバックグラウンドで実行中です。トレイアイコンから操作できます。'
      );
      logger.info('App', 'Window hidden to tray');
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// グローバルショートカットを登録
function registerGlobalShortcuts() {
  try {
    // 設定から読み込む（今はデフォルト値を使用）
    const startStopShortcut = 'CommandOrControl+Shift+R';
    const pauseResumeShortcut = 'CommandOrControl+Shift+P';

    // 録音開始/停止
    const startStopRegistered = globalShortcut.register(startStopShortcut, () => {
      logger.info('GlobalShortcut', 'Start/Stop shortcut triggered');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('hotkey-toggle-recording');
      }
    });

    if (startStopRegistered) {
      logger.info('GlobalShortcut', 'Start/Stop shortcut registered', { shortcut: startStopShortcut });
    } else {
      logger.error('GlobalShortcut', 'Failed to register Start/Stop shortcut', { shortcut: startStopShortcut });
    }

    // 一時停止/再開
    const pauseResumeRegistered = globalShortcut.register(pauseResumeShortcut, () => {
      logger.info('GlobalShortcut', 'Pause/Resume shortcut triggered');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('hotkey-toggle-pause');
      }
    });

    if (pauseResumeRegistered) {
      logger.info('GlobalShortcut', 'Pause/Resume shortcut registered', { shortcut: pauseResumeShortcut });
    } else {
      logger.error('GlobalShortcut', 'Failed to register Pause/Resume shortcut', { shortcut: pauseResumeShortcut });
    }
  } catch (error) {
    logger.error('GlobalShortcut', 'Failed to register shortcuts', error);
  }
}

// グローバルショートカットを解除
function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
  logger.info('GlobalShortcut', 'All shortcuts unregistered');
}

// カスタムプロトコルの登録（app.whenReady()の前に呼ぶ必要がある）
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media',
    privileges: {
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true
    }
  }
]);

// アプリケーション初期化
app.whenReady().then(async () => {
  try {
    // カスタムプロトコルハンドラーを登録
    protocol.handle('media', async (request) => {
      try {
        const url = request.url.slice('media://'.length);
        const filePath = decodeURIComponent(url);

        logger.debug('MediaProtocol', 'File request', { filePath });

        // ファイルの存在確認
        if (!fs.existsSync(filePath)) {
          logger.error('MediaProtocol', 'File not found', { filePath });
          return new Response('File not found', { status: 404 });
        }

        // ファイルを読み込み
        const data = fs.readFileSync(filePath);
        const ext = path.extname(filePath).toLowerCase();

        // MIMEタイプの決定
        let contentType = 'application/octet-stream';
        if (ext === '.mp3') {
          contentType = 'audio/mpeg';
        } else if (ext === '.webm') {
          contentType = 'audio/webm';
        } else if (ext === '.wav') {
          contentType = 'audio/wav';
        }

        logger.debug('MediaProtocol', 'Serving file', { filePath, contentType, size: data.length });

        return new Response(data, {
          headers: {
            'Content-Type': contentType,
            'Content-Length': data.length.toString(),
            'Accept-Ranges': 'bytes'
          }
        });
      } catch (error) {
        logger.error('MediaProtocol', 'Error serving file', error);
        return new Response('Internal server error', { status: 500 });
      }
    });

    // ロガー初期化
    await logger.initialize();
    logger.info('App', 'Application started');
    logger.info('App', 'Log file location', { path: logger.getLogFilePath() });

    // サービス初期化
    logger.info('App', 'Initializing services...');
    await databaseService.initialize();
    await fileService.initialize();
    logger.info('App', 'Services initialized successfully');
  } catch (error) {
    logger.error('App', 'Failed to initialize services', error);
    console.error('Failed to initialize services:', error);
  }

  // IPC Handlersを登録
  logger.info('App', 'Registering IPC handlers...');
  registerRecordingHandlers();
  registerFileHandlers();
  registerSettingsHandlers();
  logger.info('App', 'IPC handlers registered');

  createWindow();

  // グローバルショートカットを登録
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// すべてのウィンドウが閉じられたときの処理
// トレイモードをサポートするため、ウィンドウが閉じてもアプリは終了しない
app.on('window-all-closed', () => {
  // macOSでは明示的に終了しない限りアプリを終了しない
  // Windowsでもトレイモードをサポートするため、同様の動作にする
  logger.info('App', 'All windows closed, running in tray mode');
});

// アプリケーション終了時のクリーンアップ
app.on('will-quit', () => {
  // グローバルショートカットを解除
  unregisterGlobalShortcuts();
});

app.on('before-quit', async () => {
  isQuitting = true;

  try {
    logger.info('App', 'Application shutting down...');

    // トレイを破棄
    trayService.destroy();

    // 録音中の場合は停止する
    // TODO: 録音停止処理

    // データベースクローズ
    await databaseService.close();
    logger.info('App', 'Services closed successfully');

    // ロガーをクローズ
    logger.close();
  } catch (error) {
    logger.error('App', 'Failed to close services', error);
    console.error('Failed to close services:', error);
    logger.close();
  }
});

// エクスポート（IPC Handlerから参照できるように）
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
