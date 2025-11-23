# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

クロスプラットフォーム（Windows/macOS）対応の録音アプリケーション。Electronベースで、マイク入力とスピーカー出力を同時に録音し、3つのファイル（マイクのみ、スピーカーのみ、ミックス）をMP3形式で生成する。

## 開発コマンド

### セットアップ
```bash
# 依存関係のインストール
npm install

# Prismaのセットアップ（初回のみ）
npm run prisma:generate
npm run prisma:migrate  # マイグレーション名: "init"
```

### 開発
```bash
# 開発サーバー起動（Vite + Electron）
npm run dev

# Main Processのみビルド
npm run build:main

# Renderer Processのみ開発サーバー起動
npm run dev:renderer
```

### ビルド
```bash
# フルビルド（Main + Renderer）
npm run build

# プラットフォーム別ビルド
npm run build:win   # Windows用NSIS インストーラー
npm run build:mac   # macOS用DMGイメージ
```

### テスト・品質チェック
```bash
# テスト実行
npm test
npm run test:watch

# コード品質チェック
npm run lint
npm run lint:fix
npm run format
```

### データベース
```bash
# Prisma Studio（GUI）起動
npx prisma studio  # http://localhost:5555

# マイグレーション作成
npm run prisma:migrate

# Prisma Client再生成
npm run prisma:generate
```

## アーキテクチャ

### プロセス構成
Electronのマルチプロセスアーキテクチャを採用：

- **Main Process** (`src/main/`)
  - Node.js環境で実行
  - 音声キャプチャ、ファイルI/O、データベース操作を担当
  - IPC Handlerを通じてRenderer Processと通信

- **Renderer Process** (`src/renderer/`)
  - Chromium環境で実行
  - React + Ant DesignによるUI
  - Zustandで状態管理
  - Context Isolation有効（セキュリティ）

- **Preload Script** (`src/preload/`)
  - Main ProcessとRenderer Processの橋渡し
  - `contextBridge`でセキュアなAPIを公開

### ディレクトリ構造
```
src/
├── main/                    # Main Process（Node.js）
│   ├── index.ts            # エントリーポイント
│   ├── services/           # ビジネスロジック
│   │   ├── AudioCaptureService.ts   # 音声キャプチャ
│   │   ├── EncodingService.ts       # MP3エンコーディング
│   │   ├── FileService.ts           # ファイルI/O
│   │   └── DatabaseService.ts       # SQLite操作（Prisma）
│   └── ipc/                # IPC Handlers
│       ├── recordingHandlers.ts
│       ├── fileHandlers.ts
│       └── settingsHandlers.ts
│
├── renderer/               # Renderer Process（React）
│   ├── index.tsx          # エントリーポイント
│   ├── App.tsx            # ルートコンポーネント
│   ├── components/        # UIコンポーネント
│   ├── stores/            # Zustand stores
│   └── services/          # フロントエンド用サービス
│
├── preload/               # Preload Script
│   └── index.ts          # contextBridge定義
│
└── shared/               # 共通型定義・定数
    ├── types/
    └── constants/
```

### 録音フロー
1. **User** → Renderer: 「録音開始」ボタンクリック
2. **Renderer** → Main: `ipcRenderer.invoke('start-recording')`
3. **Main**: AudioCaptureService.startCapture()
   - Windows: WASAPI loopback
   - macOS: BlackHole経由
4. **Main**: 音声ストリーム → 一時WAVファイル保存
5. **User** → Renderer: 「録音停止」ボタンクリック
6. **Main**: EncodingService.encode()
   - WAV → MP3変換（FFmpeg）
   - 2トラックをミックス → 3ファイル生成
7. **Main**: DatabaseService.createRecording()
   - メタデータをSQLiteに保存

### IPC通信パターン
Main ProcessとRenderer Process間の通信は必ず`preload/index.ts`を経由：

```typescript
// Renderer → Main（非同期呼び出し）
const result = await window.electronAPI.startRecording(options);

// Main → Renderer（イベント通知）
window.electronAPI.onRecordingProgress((progress) => {
  // 録音進捗を受信
});
```

## 技術スタック詳細

### コアテクノロジー
- **Electron 28.x**: デスクトップアプリフレームワーク
- **TypeScript 5.x**: 型安全な開発
- **React 18.x**: UIフレームワーク
- **Ant Design 5.x**: UIコンポーネントライブラリ
- **Zustand**: 軽量状態管理
- **SQLite + Prisma**: ローカルデータベース

### 音声処理
- **node-record-lpcm16**: マイク録音
- **naudiodon** (macOS): BlackHole経由でシステムオーディオ
- **WASAPI loopback** (Windows): システムオーディオ
- **FFmpeg**: MP3エンコーディング、音声ミックス

### 開発ツール
- **Vite**: 高速ビルド・HMR
- **electron-builder**: アプリパッケージング
- **Jest**: ユニットテスト
- **ESLint + Prettier**: コード品質

## 重要な実装ポイント

### セキュリティ
- **Context Isolation**: 必ずtrue（`main/index.ts:18`）
- **Node Integration**: 必ずfalse（`main/index.ts:19`）
- **Preload Script**: `contextBridge`のみで安全にAPIを公開

### プラットフォーム別処理
システムオーディオキャプチャはOSごとに異なる実装：

```typescript
// AudioCaptureService.ts
if (process.platform === 'win32') {
  // Windows: WASAPI loopback
} else if (process.platform === 'darwin') {
  // macOS: BlackHole
  // 事前にBlackHoleインストール必須: brew install blackhole-2ch
}
```

### データベーススキーマ
```prisma
// prisma/schema.prisma
model Recording {
  id          Int      @id @default(autoincrement())
  fileName    String
  filePath    String   // mixedPathのメインファイル
  recordedAt  DateTime
  duration    Int      // 秒単位
  fileSize    Int?
  memo        String?
  quality     String   // 'standard' | 'high' | 'premium'
  isDeleted   Boolean  @default(false)
}
```

### 音質設定
```typescript
// EncodingService内の品質マップ
{
  standard: { sampleRate: 44100, bitrate: '128k' },
  high:     { sampleRate: 48000, bitrate: '192k' },
  premium:  { sampleRate: 48000, bitrate: '320k' }
}
```

## 開発フェーズ

### Phase 1: MVP（完了）
- ✅ 基本UI実装（録音パネル、レベルメーター）
- ✅ データベース連携（Prisma + SQLite）
- ✅ IPC通信基盤
- 🔧 音声キャプチャ・エンコーディングはスタブ実装

### Phase 1.5: 実録音機能（次）
- 🔄 AudioCaptureServiceの詳細実装
- 🔄 EncodingServiceの詳細実装
- 🔄 FileServiceの詳細実装
- 🔄 3ファイル生成（mic/speaker/mixed）

### Phase 2: 履歴管理
- ⏭️ 録音履歴画面
- ⏭️ 再生機能
- ⏭️ ファイル管理（リネーム・削除）

### Phase 3: 高度な機能
- ⏭️ ホットキー対応（electron-localshortcut）
- ⏭️ バックグラウンド録音
- ⏭️ 設定画面

### Phase 4: クラウド連携
- ⏭️ Google Drive連携（googleapis）
- ⏭️ Dropbox連携（dropbox SDK）

## トラブルシューティング

### macOSでシステムオーディオが録音できない
BlackHoleのインストールが必要：
```bash
brew install blackhole-2ch
```

インストール後、Audio MIDI Setupでマルチ出力デバイスを作成し、アプリ側でデバイス選択。

### Electronアプリが起動しない
1. Main Processのビルド確認：
   ```bash
   npm run build:main
   ls dist/main/  # index.jsが存在するか
   ```

2. ポート3000の確認：
   ```bash
   # Windows
   netstat -ano | findstr :3000

   # macOS/Linux
   lsof -i :3000
   ```

### Prismaエラー
```bash
# Prismaキャッシュクリア
npx prisma generate --force

# データベース再作成
rm prisma/recordings.db
npm run prisma:migrate
```

### TypeScriptエラー
```bash
# 型チェックのみ実行
npx tsc --noEmit

# 依存関係の再インストール
rm -rf node_modules package-lock.json
npm install
```

## コーディング規約

### TypeScript
- 型定義は`src/shared/types/`に集約
- `any`の使用は最小限に
- IPC通信の型は`ElectronAPI`インターフェースで厳密に定義

### React
- Functional Component + Hooks
- カスタムフックは`src/renderer/hooks/`
- 状態管理はZustand（Reduxより軽量）

### ファイル命名
- コンポーネント: PascalCase（`RecordingPanel.tsx`）
- サービス: PascalCase + Service接尾辞（`AudioCaptureService.ts`）
- Store: camelCase + Store接尾辞（`recordingStore.ts`）

### コミットメッセージ
プレフィックスを使用：
- `feat:` 新機能
- `fix:` バグ修正
- `refactor:` リファクタリング
- `test:` テスト追加
- `docs:` ドキュメント

## 参考ドキュメント

- [要件定義書](./docs/requirements/RecordingApp_Requirements.md)
- [技術スタック選定書](./docs/design/TechStack_Selection.md)
- [システムアーキテクチャ設計書](./docs/design/SystemArchitecture_Design.md)
- [セットアップガイド](./SETUP_GUIDE.md)
- [テスト確認ガイド](./TEST_GUIDE.md)
