# ロギングガイド

## 概要

アプリケーションに包括的なロギング機能を追加しました。すべての操作とエラーが詳細にログファイルに記録されます。

## ログファイルの場所

ログファイルは以下の場所に保存されます：

### Windows
```
C:\Users\[ユーザー名]\AppData\Roaming\recording-app\logs\
```

### macOS
```
~/Library/Application Support/recording-app/logs/
```

ログファイル名の形式：`app-[タイムスタンプ].log`

例：`app-2025-01-21T10-30-45.123Z.log`

## ログファイルの確認方法

### 方法1: アプリ起動時にログファイルパスを確認

アプリを起動すると、DevToolsのコンソールに以下のように表示されます：

```
[2025-01-21T10:30:45.123Z] [INFO] [App] Log file location
Data: {
  "path": "C:\\Users\\username\\AppData\\Roaming\\recording-app\\logs\\app-2025-01-21T10-30-45.123Z.log"
}
```

### 方法2: 直接フォルダを開く

**Windows:**
1. `Win + R` キーを押す
2. `%APPDATA%\recording-app\logs` と入力してEnter

**macOS:**
1. Finderを開く
2. `Cmd + Shift + G` キーを押す
3. `~/Library/Application Support/recording-app/logs` と入力してEnter

## ログレベル

### DEBUG
詳細なデバッグ情報（内部状態、詳細な処理フロー）

```
[2025-01-21T10:30:45.123Z] [DEBUG] [RecordingHandler] Recording start time set
Data: {
  "startTime": 1234567890123
}
```

### INFO
通常の操作情報（開始、完了、成功）

```
[2025-01-21T10:30:45.123Z] [INFO] [RecordingHandler] Recording started successfully
```

### WARN
警告（非推奨機能の使用、スタブ実装）

```
[2025-01-21T10:30:45.123Z] [WARN] [AudioCaptureService] Using stub implementation - no actual audio capture
```

### ERROR
エラー（例外、失敗）

```
[2025-01-21T10:30:45.123Z] [ERROR] [RecordingHandler] Failed to stop recording
Data: {
  "name": "Error",
  "message": "Database connection lost",
  "stack": "Error: Database connection lost\n    at ..."
}
```

## 記録される操作

### 録音関連
- 録音開始リクエスト
- 音声キャプチャサービスの起動
- 録音時間の計算
- 録音停止リクエスト
- 音声キャプチャサービスの停止
- ファイル保存処理
- データベースへの記録

### ファイル操作
- ファイルパス生成
- データベースレコード作成
- ファイル保存完了

### データベース操作
- 録音レコードの作成
- 録音レコードのクエリ
- 設定の読み書き

### アプリケーション
- アプリケーション起動
- サービス初期化
- IPC Handlers登録
- アプリケーション終了

## エラー分析の手順

### 1. エラーを再現する

アプリを起動し、エラーが発生する操作を実行します。

例：録音開始 → 数秒待つ → 録音停止

### 2. ログファイルを開く

最新のログファイルを開きます。

### 3. エラー箇所を特定

`[ERROR]` で検索して、エラーが発生した箇所を見つけます。

### 4. フローを追跡

エラーの前後のログを確認して、処理フローを追跡します。

例：
```
[INFO] [RecordingHandler] Stop recording requested
[DEBUG] [RecordingHandler] Stopping progress reporting...
[DEBUG] [RecordingHandler] Progress reporting stopped
[INFO] [RecordingHandler] Recording duration calculated
[DEBUG] [RecordingHandler] Stopping audio capture service...
[INFO] [AudioCaptureService] stopCapture called
[DEBUG] [RecordingHandler] Saving recording files...
[INFO] [FileService] saveRecording called
[ERROR] [DatabaseService] Failed to create recording
Data: {
  "name": "PrismaClientKnownRequestError",
  "message": "Invalid field value...",
  "stack": "..."
}
```

### 5. エラー情報を確認

エラーログの `Data` セクションに以下の情報が含まれます：

- **name**: エラーの種類
- **message**: エラーメッセージ
- **stack**: スタックトレース（エラーが発生したコードの場所）

## トラブルシューティング例

### 録音停止時のエラー

ログを確認して、どのサービスでエラーが発生したか特定します：

1. **AudioCaptureService** → 音声キャプチャの問題
2. **FileService** → ファイル保存の問題
3. **DatabaseService** → データベースの問題

### よくあるエラーパターン

#### データベース接続エラー
```
[ERROR] [DatabaseService] Failed to create recording
Data: {
  "message": "Can't reach database server..."
}
```
→ Prismaが初期化されていない、またはDBファイルが破損

#### ファイルパス生成エラー
```
[ERROR] [FileService] saveRecording failed
Data: {
  "message": "ENOENT: no such file or directory..."
}
```
→ 保存先ディレクトリが存在しない

## ログファイルの管理

### ログファイルのサイズ

ログファイルは自動的に分割されません。長期間使用すると大きくなる可能性があります。

### ログファイルの削除

古いログファイルは手動で削除してください：

```bash
# Windows (PowerShell)
Remove-Item "$env:APPDATA\recording-app\logs\*.log" -Force

# macOS/Linux
rm ~/Library/Application\ Support/recording-app/logs/*.log
```

## 開発者向け情報

### ロガーの使用方法

```typescript
import { logger } from './utils/logger';

// INFO
logger.info('ModuleName', 'Operation successful');

// DEBUG
logger.debug('ModuleName', 'Detailed info', { data: value });

// WARN
logger.warn('ModuleName', 'Warning message');

// ERROR
logger.error('ModuleName', 'Error occurred', error);
```

### ログファイルの構造

```
[タイムスタンプ] [レベル] [モジュール] メッセージ
Data: {JSONデータ}
```

---

**最終更新**: 2025-01-21
