# 技術スタック選定書

作成日: 2025-11-17
バージョン: 1.0.0

## 1. 概要

録音アプリケーション開発における技術スタックの選定結果をまとめる。クロスプラットフォーム（Windows/macOS）対応のネイティブデスクトップアプリケーションとして、パフォーマンス、開発効率、保守性を考慮して選定を行った。

## 2. フレームワーク選定

### 2.1 候補比較: Electron vs Tauri

#### 比較表（2025年現在）

| 項目 | Electron | Tauri | 評価 |
|------|----------|-------|------|
| **バンドルサイズ** | 80-244 MB | 2.5-10 MB | ⭐ Tauri |
| **メモリ使用量** | 100-409 MB | 20-40 MB | ⭐ Tauri |
| **起動時間** | 1-4秒 | <0.5-2秒 | ⭐ Tauri |
| **バックエンド言語** | JavaScript/Node.js | Rust | △ |
| **Webエンジン** | Chromium（バンドル） | OS標準WebView | ⭐ Tauri |
| **クロスプラットフォーム一貫性** | 高い | 中程度 | ⭐ Electron |
| **エコシステム** | 非常に豊富 | 成長中 | ⭐ Electron |
| **学習コスト** | 低い（JS/TS） | 中程度（Rust） | ⭐ Electron |
| **音声処理ライブラリ** | 豊富（npm） | 限定的 | ⭐ Electron |
| **開発速度** | 高い | 中程度 | ⭐ Electron |

#### Electronの利点
- **豊富なエコシステム**: npmパッケージを活用した迅速な開発
- **成熟度**: 長年の実績とコミュニティサポート
- **音声処理**: 多数の音声関連ライブラリが利用可能
- **開発効率**: JavaScriptベースで学習コストが低い
- **クロスプラットフォーム一貫性**: どのOSでも同じUIレンダリング

#### Tauriの利点
- **軽量**: バンドルサイズが1/10以下、メモリ使用量も1/5程度
- **高速起動**: 起動時間が半分以下
- **セキュリティ**: Rustによる安全性の高い実装
- **パフォーマンス**: システムリソース消費が少ない

### 2.2 選定結果: **Electron**を採用

#### 採用理由
1. **音声処理ライブラリの充実**:
   - npmに豊富な音声録音・エンコーディングライブラリが存在
   - WASAPI、Core Audioのラッパーが利用可能

2. **開発速度の優先**:
   - TypeScript/JavaScriptベースで迅速な開発が可能
   - チーム全体の学習コストが低い

3. **エコシステム**:
   - 実績のあるElectron製アプリ（VSCode、Slack、Discord等）
   - 豊富なドキュメントとコミュニティサポート

4. **要件との適合性**:
   - パフォーマンス要件（CPU 10%以下）は達成可能
   - バンドルサイズは許容範囲内（ユーザーは気にしない）

#### Tauriを採用しない理由
- 音声処理のRustライブラリが限定的
- 開発チームのRust経験が不足
- 初期開発速度がElectronより遅い

### 2.3 Electronバージョン
- **Electron 28.x 以降**（最新安定版）
- Node.js 18.x以降をバンドル

## 3. 技術スタック詳細

### 3.1 言語・ランタイム

| レイヤー | 技術 | バージョン | 理由 |
|---------|------|-----------|------|
| フロントエンド | TypeScript | 5.x | 型安全性、保守性向上 |
| バックエンド | Node.js | 18.x+ | Electronバンドル |
| パッケージマネージャ | npm | 10.x | 標準的なパッケージ管理 |

### 3.2 UIフレームワーク

#### 採用: **React 18.x + TypeScript**

**理由**:
- コンポーネントベースの設計
- 豊富なUIライブラリ
- チームの経験とスキルセット
- Electron公式サンプルでも推奨

**代替案検討**:
- Vue.js: 学習コストは低いが、Reactほどエコシステムが豊富でない
- Svelte: パフォーマンスは良いが、ライブラリが少ない

### 3.3 UIコンポーネントライブラリ

#### 採用: **Ant Design (antd) 5.x**

**理由**:
- デスクトップアプリに適したコンポーネント群
- 高品質なデザイン
- TypeScript完全対応
- 日本語ドキュメント完備

**主要コンポーネント**:
- Button, Input, Slider（音量調整）
- Table（録音履歴）
- Modal, Drawer（設定画面）
- Progress（録音時間表示）
- Message/Notification（通知）

### 3.4 音声処理ライブラリ

#### 3.4.1 マイク録音

**採用**: **node-record-lpcm16** または **@waveform/audio-recorder**

```javascript
const recorder = require('node-record-lpcm16');

const file = fs.createWriteStream('output.wav', { encoding: 'binary' });
recorder.record({
  sampleRate: 48000,
  channels: 2
}).stream().pipe(file);
```

#### 3.4.2 システムオーディオキャプチャ

**Windows**: **WASAPI loopback** (node-audio-capture)

```javascript
const AudioCapture = require('node-audio-capture');

const capture = new AudioCapture({
  device: 'loopback',
  sampleRate: 48000,
  channels: 2
});

capture.start();
```

**macOS**: **BlackHole + node-portaudio**

ユーザーに事前セットアップを案内:
1. BlackHoleのインストール
2. Audio MIDI Setupでマルチ出力デバイス作成
3. アプリから仮想デバイスを選択

```javascript
const portAudio = require('naudiodon');

const ai = new portAudio.AudioIO({
  inOptions: {
    channelCount: 2,
    sampleFormat: portAudio.SampleFormat16Bit,
    sampleRate: 48000,
    deviceId: blackholeDeviceId
  }
});
```

#### 3.4.3 MP3エンコーディング

**採用**: **@ffmpeg/ffmpeg** (WebAssembly版)

```javascript
const { createFFmpeg } = require('@ffmpeg/ffmpeg');

const ffmpeg = createFFmpeg({ log: true });
await ffmpeg.load();

// WAVをMP3に変換
await ffmpeg.run('-i', 'input.wav', '-codec:a', 'libmp3lame', '-b:a', '192k', 'output.mp3');
```

**代替案**: **fluent-ffmpeg** (ネイティブFFmpeg使用)

#### 3.4.4 オーディオミキシング

**採用**: **Web Audio API** (レンダラープロセス内)

```javascript
const audioContext = new AudioContext();

// マイクとスピーカーの2トラックをミックス
const micSource = audioContext.createMediaStreamSource(micStream);
const speakerSource = audioContext.createMediaStreamSource(speakerStream);

const merger = audioContext.createChannelMerger(2);
micSource.connect(merger, 0, 0);
speakerSource.connect(merger, 0, 1);

const dest = audioContext.createMediaStreamDestination();
merger.connect(dest);
```

### 3.5 データベース

#### 採用: **SQLite3 (better-sqlite3)**

**理由**:
- ローカルファイルベース（サーバー不要）
- 高速で軽量
- ACID特性による信頼性
- TypeScript型定義完備

**スキーマ管理**: **Prisma**

```prisma
// schema.prisma
datasource db {
  provider = "sqlite"
  url      = "file:./recordings.db"
}

model Recording {
  id          Int      @id @default(autoincrement())
  fileName    String
  filePath    String
  recordedAt  DateTime
  duration    Int
  fileSize    Int?
  memo        String?
  quality     String   // 'standard' | 'high' | 'premium'
  isDeleted   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Setting {
  key        String   @id
  value      String
  updatedAt  DateTime @updatedAt
}
```

### 3.6 状態管理

#### 採用: **Zustand**

**理由**:
- Reduxより軽量で簡潔
- TypeScript完全対応
- ボイラープレートが少ない
- Reactとの統合が容易

```typescript
import create from 'zustand';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  fileName: string;
  setRecording: (val: boolean) => void;
  setPaused: (val: boolean) => void;
  setDuration: (val: number) => void;
  setFileName: (val: string) => void;
}

export const useRecordingStore = create<RecordingState>((set) => ({
  isRecording: false,
  isPaused: false,
  duration: 0,
  fileName: '',
  setRecording: (val) => set({ isRecording: val }),
  setPaused: (val) => set({ isPaused: val }),
  setDuration: (val) => set({ duration: val }),
  setFileName: (val) => set({ fileName: val })
}));
```

### 3.7 クラウド連携

#### 3.7.1 Google Drive API

```bash
npm install googleapis
```

```typescript
import { google } from 'googleapis';

const oauth2Client = new google.auth.OAuth2(
  CLIENT_ID,
  CLIENT_SECRET,
  REDIRECT_URI
);

const drive = google.drive({ version: 'v3', auth: oauth2Client });

// ファイルアップロード
await drive.files.create({
  requestBody: {
    name: 'recording.mp3',
    parents: [folderId]
  },
  media: {
    mimeType: 'audio/mpeg',
    body: fs.createReadStream('recording.mp3')
  }
});
```

#### 3.7.2 Dropbox API

```bash
npm install dropbox
```

```typescript
import { Dropbox } from 'dropbox';

const dbx = new Dropbox({ accessToken: ACCESS_TOKEN });

await dbx.filesUpload({
  path: '/recordings/recording.mp3',
  contents: fs.readFileSync('recording.mp3')
});
```

### 3.8 ホットキー管理

#### 採用: **electron-localshortcut**

```javascript
const electronLocalshortcut = require('electron-localshortcut');

// 録音開始/停止
electronLocalshortcut.register(mainWindow, 'Ctrl+Shift+R', () => {
  toggleRecording();
});

// 一時停止/再開
electronLocalshortcut.register(mainWindow, 'Ctrl+Shift+P', () => {
  togglePause();
});
```

### 3.9 システムトレイ

#### 採用: **Electron Tray API**

```javascript
const { Tray, Menu } = require('electron');

const tray = new Tray('icon.png');

const contextMenu = Menu.buildFromTemplate([
  { label: '録音開始', click: () => startRecording() },
  { label: '録音停止', click: () => stopRecording() },
  { type: 'separator' },
  { label: '終了', click: () => app.quit() }
]);

tray.setContextMenu(contextMenu);
```

### 3.10 ビルド・パッケージング

#### 採用: **electron-builder**

```json
// package.json
{
  "build": {
    "appId": "com.yourcompany.recordingapp",
    "productName": "Recording App",
    "files": [
      "dist/**/*",
      "node_modules/**/*",
      "package.json"
    ],
    "directories": {
      "buildResources": "assets"
    },
    "win": {
      "target": ["nsis"],
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": ["dmg"],
      "icon": "assets/icon.icns",
      "category": "public.app-category.productivity"
    }
  }
}
```

## 4. 開発ツール

### 4.1 開発環境

| ツール | バージョン | 用途 |
|--------|-----------|------|
| **VS Code** | 最新 | IDE |
| **ESLint** | 8.x | コード品質 |
| **Prettier** | 3.x | コードフォーマット |
| **TypeScript ESLint** | 6.x | TypeScript Linting |

### 4.2 テストツール

| ツール | 用途 |
|--------|------|
| **Jest** | 単体テスト |
| **React Testing Library** | UIテスト |
| **Spectron** | Electronアプリ統合テスト |
| **Playwright** | E2Eテスト |

### 4.3 CI/CD

| ツール | 用途 |
|--------|------|
| **GitHub Actions** | CI/CDパイプライン |
| **electron-builder** | 自動ビルド・配布 |

## 5. アーキテクチャパターン

### 5.1 プロセス構成

Electronのマルチプロセスアーキテクチャを採用:

```
┌─────────────────────────────────────┐
│      Main Process (Node.js)         │
│  - 音声キャプチャ                     │
│  - ファイルI/O                        │
│  - データベース操作                   │
│  - システム連携                       │
└────────────┬────────────────────────┘
             │ IPC通信
┌────────────▼────────────────────────┐
│   Renderer Process (Chromium)       │
│  - React UI                          │
│  - 状態管理 (Zustand)                │
│  - Web Audio API (レベルメーター)    │
└─────────────────────────────────────┘
```

### 5.2 IPC通信

**Main → Renderer**:
```typescript
// Main Process
mainWindow.webContents.send('recording-started', { timestamp: Date.now() });

// Renderer Process
ipcRenderer.on('recording-started', (event, data) => {
  console.log('Recording started at:', data.timestamp);
});
```

**Renderer → Main**:
```typescript
// Renderer Process
ipcRenderer.invoke('start-recording', { quality: 'high' });

// Main Process
ipcMain.handle('start-recording', async (event, options) => {
  return await audioService.startRecording(options);
});
```

### 5.3 ディレクトリ構成

```
recording-app/
├── src/
│   ├── main/                    # メインプロセス
│   │   ├── index.ts            # エントリーポイント
│   │   ├── services/           # ビジネスロジック
│   │   │   ├── AudioCaptureService.ts
│   │   │   ├── EncodingService.ts
│   │   │   ├── FileService.ts
│   │   │   └── CloudService.ts
│   │   ├── ipc/                # IPC handlers
│   │   │   ├── recordingHandlers.ts
│   │   │   ├── fileHandlers.ts
│   │   │   └── settingsHandlers.ts
│   │   └── utils/              # ユーティリティ
│   │
│   ├── renderer/               # レンダラープロセス
│   │   ├── App.tsx             # Reactアプリエントリー
│   │   ├── components/         # Reactコンポーネント
│   │   │   ├── RecordingPanel.tsx
│   │   │   ├── LevelMeter.tsx
│   │   │   ├── HistoryList.tsx
│   │   │   └── SettingsPanel.tsx
│   │   ├── stores/             # Zustand stores
│   │   │   ├── recordingStore.ts
│   │   │   ├── historyStore.ts
│   │   │   └── settingsStore.ts
│   │   ├── hooks/              # カスタムフック
│   │   └── utils/
│   │
│   ├── preload/                # Preloadスクリプト
│   │   └── index.ts
│   │
│   └── shared/                 # 共通型定義
│       ├── types/
│       └── constants/
│
├── prisma/
│   └── schema.prisma           # データベーススキーマ
│
├── assets/                     # アイコン・画像
│
├── tests/                      # テスト
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

## 6. セキュリティ対策

### 6.1 Context Isolation

```typescript
// main/index.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,        // 必須
    nodeIntegration: false,         // 必須
    preload: path.join(__dirname, 'preload.js')
  }
});
```

### 6.2 Preloadスクリプト

```typescript
// preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  startRecording: (options) => ipcRenderer.invoke('start-recording', options),
  stopRecording: () => ipcRenderer.invoke('stop-recording'),
  onRecordingProgress: (callback) => ipcRenderer.on('recording-progress', callback)
});
```

### 6.3 CSP (Content Security Policy)

```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'">
```

## 7. パフォーマンス最適化

### 7.1 音声処理の最適化

- **ストリーミング処理**: バッファリングを最小限に
- **Worker Thread**: 音声エンコーディングを別スレッドで処理

```typescript
const { Worker } = require('worker_threads');

const encoderWorker = new Worker('./encoderWorker.js');
encoderWorker.postMessage({ audioData: buffer });
```

### 7.2 UIの最適化

- **React.memo**: 不要な再レンダリング防止
- **useMemo/useCallback**: 計算結果のメモ化
- **仮想スクロール**: 録音履歴の大量データ表示

## 8. 開発スケジュール

### Phase 1: MVP（4週間）
- Week 1-2: 基本録音機能（マイク＋スピーカー）
- Week 3: 3ファイル生成とMP3エンコーディング
- Week 4: 基本UI（録音ボタン、レベルメーター）

### Phase 2: 履歴管理（2週間）
- Week 5: データベース実装とPrisma統合
- Week 6: 録音履歴画面と再生機能

### Phase 3: 高度な機能（3週間）
- Week 7: ホットキー対応
- Week 8: デバイス選択とバックグラウンド録音
- Week 9: 設定画面

### Phase 4: クラウド連携（2週間）
- Week 10: Google Drive連携
- Week 11: Dropbox連携と最終調整

## 9. リスクと対策

### 9.1 技術的リスク

| リスク | 対策 |
|--------|------|
| macOSでのシステムオーディオキャプチャが複雑 | BlackHoleの自動インストールスクリプト提供 |
| 長時間録音でのメモリリーク | Worker Threadとストリーミング処理 |
| クロスプラットフォームでの音質差異 | プラットフォーム別の品質テスト |

### 9.2 スケジュールリスク

| リスク | 対策 |
|--------|------|
| 音声処理の実装が想定より複雑 | MVP機能を最小限に絞る |
| クラウド連携のAPI制限 | Phase 4を独立させ、後回し可能に |

## 10. 次のステップ

1. ✅ 技術スタック選定完了
2. 🔄 システムアーキテクチャ詳細設計
3. ⏭️ 開発環境セットアップ
4. ⏭️ MVP開発開始

---

**承認者**:
**承認日**:

**バージョン履歴**:
- v1.0.0 (2025-11-17): 初版作成
