import { app } from 'electron';
import path from 'path';
import fs from 'fs';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

class Logger {
  private logFilePath: string;
  private logStream: fs.WriteStream | null = null;
  private isInitialized = false;

  constructor() {
    const logsDir = path.join(app.getPath('userData'), 'logs');
    const timestamp = this.getTimestamp().replace(/:/g, '-');
    this.logFilePath = path.join(logsDir, `app-${timestamp}.log`);
  }

  /**
   * ロガーの初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      const logsDir = path.dirname(this.logFilePath);

      // ログディレクトリを作成
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // ログファイルのWriteStreamを作成
      this.logStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });

      this.isInitialized = true;
      this.info('Logger', 'Logger initialized', { logFilePath: this.logFilePath });
    } catch (error) {
      console.error('Failed to initialize logger:', error);
    }
  }

  /**
   * ログメッセージを出力
   */
  private log(level: LogLevel, module: string, message: string, data?: any): void {
    const timestamp = this.getTimestamp();
    const logMessage = this.formatLogMessage(timestamp, level, module, message, data);

    // コンソール出力（EPIPEエラーを無視）
    try {
      console.log(logMessage);
    } catch (error) {
      // EPIPEエラー（broken pipe）を無視
      // 開発環境でのパイプ切断は正常動作に影響しない
    }

    // ファイル出力
    if (this.logStream && this.isInitialized) {
      try {
        this.logStream.write(logMessage + '\n');
      } catch (error) {
        // ファイル書き込みエラーも無視（ログ出力の失敗でアプリを停止させない）
      }
    }
  }

  /**
   * ログメッセージのフォーマット
   */
  private formatLogMessage(
    timestamp: string,
    level: LogLevel,
    module: string,
    message: string,
    data?: any
  ): string {
    let logLine = `[${timestamp}] [${level}] [${module}] ${message}`;

    if (data) {
      try {
        const dataStr = JSON.stringify(data, this.getCircularReplacer(), 2);
        logLine += `\nData: ${dataStr}`;
      } catch (error) {
        logLine += `\nData: [Failed to serialize: ${error}]`;
      }
    }

    return logLine;
  }

  /**
   * 循環参照を処理するためのreplacer
   */
  private getCircularReplacer() {
    const seen = new WeakSet();
    return (key: string, value: any) => {
      if (typeof value === 'object' && value !== null) {
        if (seen.has(value)) {
          return '[Circular]';
        }
        seen.add(value);
      }
      return value;
    };
  }

  /**
   * タイムスタンプを取得
   */
  private getTimestamp(): string {
    const now = new Date();
    return now.toISOString();
  }

  /**
   * DEBUGレベルのログ
   */
  debug(module: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, module, message, data);
  }

  /**
   * INFOレベルのログ
   */
  info(module: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, module, message, data);
  }

  /**
   * WARNレベルのログ
   */
  warn(module: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, module, message, data);
  }

  /**
   * ERRORレベルのログ
   */
  error(module: string, message: string, error?: any): void {
    const errorData = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      : error;

    this.log(LogLevel.ERROR, module, message, errorData);
  }

  /**
   * ログファイルを閉じる
   */
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
    this.isInitialized = false;
  }

  /**
   * ログファイルのパスを取得
   */
  getLogFilePath(): string {
    return this.logFilePath;
  }
}

// シングルトンインスタンス
export const logger = new Logger();
