import { Tray, Menu, nativeImage, BrowserWindow, Notification, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { logger } from '../utils/logger';

/**
 * システムトレイ管理サービス
 * アプリのバックグラウンド動作とトレイメニューを管理
 */
class TrayService {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private isRecording: boolean = false;
  private isPaused: boolean = false;

  /**
   * トレイアイコンを初期化
   */
  initialize(mainWindow: BrowserWindow): void {
    this.mainWindow = mainWindow;

    try {
      // トレイアイコンを作成（仮のパス、後でアイコンファイルを作成）
      const iconPath = this.getIconPath('idle');
      const icon = nativeImage.createFromPath(iconPath);

      this.tray = new Tray(icon);
      this.tray.setToolTip('Recording App');

      // コンテキストメニューを設定
      this.updateContextMenu();

      // トレイアイコンクリックでウィンドウを表示/非表示
      this.tray.on('click', () => {
        this.toggleWindow();
      });

      logger.info('TrayService', 'Tray icon initialized');
    } catch (error) {
      logger.error('TrayService', 'Failed to initialize tray', error);
    }
  }

  /**
   * 録音状態を更新
   */
  updateRecordingState(isRecording: boolean, isPaused: boolean = false): void {
    this.isRecording = isRecording;
    this.isPaused = isPaused;

    // アイコンを更新
    if (this.tray) {
      const state = isRecording ? (isPaused ? 'paused' : 'recording') : 'idle';
      const iconPath = this.getIconPath(state);
      const icon = nativeImage.createFromPath(iconPath);
      this.tray.setImage(icon);
    }

    // メニューを更新
    this.updateContextMenu();

    logger.debug('TrayService', 'Recording state updated', { isRecording, isPaused });
  }

  /**
   * コンテキストメニューを更新
   */
  private updateContextMenu(): void {
    if (!this.tray || !this.mainWindow) return;

    const menuTemplate: Electron.MenuItemConstructorOptions[] = [
      {
        label: 'Recording App',
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'ウィンドウを表示',
        click: () => {
          this.showWindow();
        }
      },
      { type: 'separator' }
    ];

    // 録音状態に応じたメニュー項目
    if (this.isRecording) {
      if (this.isPaused) {
        menuTemplate.push({
          label: '▶️ 録音を再開',
          click: () => {
            this.mainWindow?.webContents.send('tray-toggle-pause');
          }
        });
      } else {
        menuTemplate.push({
          label: '⏸️ 録音を一時停止',
          click: () => {
            this.mainWindow?.webContents.send('tray-toggle-pause');
          }
        });
      }
      menuTemplate.push({
        label: '⏹️ 録音を停止',
        click: () => {
          this.mainWindow?.webContents.send('tray-stop-recording');
        }
      });
    } else {
      menuTemplate.push({
        label: '⏺️ 録音を開始',
        click: () => {
          this.mainWindow?.webContents.send('tray-start-recording');
        }
      });
    }

    menuTemplate.push(
      { type: 'separator' },
      {
        label: '⚙️ 設定',
        click: () => {
          this.showWindow();
          this.mainWindow?.webContents.send('tray-open-settings');
        }
      },
      { type: 'separator' },
      {
        label: '終了',
        click: () => {
          // 録音中の場合は確認
          if (this.isRecording) {
            this.showNotification(
              '録音中です',
              '録音を停止してから終了してください'
            );
            this.showWindow();
          } else {
            this.mainWindow?.close();
          }
        }
      }
    );

    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    this.tray.setContextMenu(contextMenu);
  }

  /**
   * ウィンドウの表示/非表示を切り替え
   */
  private toggleWindow(): void {
    if (!this.mainWindow) return;

    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  }

  /**
   * ウィンドウを表示
   */
  showWindow(): void {
    if (!this.mainWindow) return;

    if (this.mainWindow.isMinimized()) {
      this.mainWindow.restore();
    }
    this.mainWindow.show();
    this.mainWindow.focus();
  }

  /**
   * 通知を表示
   */
  showNotification(title: string, body: string): void {
    if (Notification.isSupported()) {
      const notification = new Notification({
        title,
        body,
        icon: this.getIconPath('idle')
      });
      notification.show();
      logger.debug('TrayService', 'Notification shown', { title, body });
    }
  }

  /**
   * アイコンパスを取得
   */
  private getIconPath(state: 'idle' | 'recording' | 'paused'): string {
    const iconName = state === 'recording' ? 'tray-recording.png' :
                     state === 'paused' ? 'tray-paused.png' :
                     'tray-idle.png';
    const iconPath = path.join(__dirname, '../../assets/icons', iconName);

    // アイコンファイルが存在する場合はそれを使用
    if (fs.existsSync(iconPath)) {
      return iconPath;
    }

    // アイコンファイルが存在しない場合は、アプリのデフォルトアイコンを使用
    // 開発環境ではElectronのデフォルトアイコンが使用される
    logger.warn('TrayService', 'Icon file not found, using default app icon', { iconPath });
    return app.getAppPath();
  }

  /**
   * トレイを破棄
   */
  destroy(): void {
    if (this.tray) {
      this.tray.destroy();
      this.tray = null;
      logger.info('TrayService', 'Tray destroyed');
    }
  }
}

export default new TrayService();
