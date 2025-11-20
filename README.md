# Recording App

クロスプラットフォーム（Windows/macOS）対応の録音アプリケーション

## 概要

マイク入力とスピーカー出力を同時に録音し、3つのファイル（マイクのみ、スピーカーのみ、ミックス）を生成するデスクトップアプリケーション。

## 主な機能

- ✅ マイク＋スピーカー同時録音
- ✅ 3ファイル生成（マイク / スピーカー / ミックス）
- ✅ MP3形式での保存
- ✅ 録音品質選択（標準 / 高 / 最高）
- ✅ 録音履歴管理
- ✅ ホットキー対応
- ✅ クラウド連携（Google Drive / Dropbox）

## 技術スタック

- **フレームワーク**: Electron 28.x
- **言語**: TypeScript 5.x
- **UI**: React 18.x + Ant Design 5.x
- **状態管理**: Zustand
- **データベース**: SQLite + Prisma
- **音声処理**: FFmpeg, node-record-lpcm16
- **ビルド**: electron-builder

## 必要環境

- **Node.js**: 18.x 以降
- **npm**: 10.x 以降

### macOSの場合
- **BlackHole**: システムオーディオキャプチャ用の仮想オーディオデバイス
  - インストール: `brew install blackhole-2ch`

## セットアップ手順

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Prismaのセットアップ

```bash
npm run prisma:generate
npm run prisma:migrate
```

### 3. 開発サーバー起動

```bash
npm run dev
```

## 開発コマンド

```bash
# 開発モード
npm run dev

# ビルド
npm run build

# Windows用ビルド
npm run build:win

# macOS用ビルド
npm run build:mac

# テスト実行
npm test

# テスト（Watch モード）
npm run test:watch

# Lint
npm run lint

# Lint + 自動修正
npm run lint:fix

# フォーマット
npm run format
```

## プロジェクト構造

```
recording-app/
├── src/
│   ├── main/                    # メインプロセス
│   │   ├── index.ts            # エントリーポイント
│   │   ├── services/           # ビジネスロジック
│   │   │   ├── AudioCaptureService.ts
│   │   │   ├── EncodingService.ts
│   │   │   ├── FileService.ts
│   │   │   ├── DatabaseService.ts
│   │   │   └── CloudService.ts
│   │   ├── ipc/                # IPC handlers
│   │   └── utils/              # ユーティリティ
│   │
│   ├── renderer/               # レンダラープロセス
│   │   ├── App.tsx             # Reactアプリエントリー
│   │   ├── components/         # Reactコンポーネント
│   │   ├── stores/             # Zustand stores
│   │   ├── hooks/              # カスタムフック
│   │   └── utils/
│   │
│   ├── preload/                # Preloadスクリプト
│   └── shared/                 # 共通型定義
│
├── prisma/                     # データベース
│   └── schema.prisma
│
├── tests/                      # テスト
├── docs/                       # ドキュメント
│   ├── requirements/           # 要件定義
│   └── design/                 # 設計書
│
└── assets/                     # アイコン・画像
```

## ドキュメント

- [要件定義書](./docs/requirements/RecordingApp_Requirements.md)
- [技術スタック選定書](./docs/design/TechStack_Selection.md)
- [システムアーキテクチャ設計書](./docs/design/SystemArchitecture_Design.md)

## 開発フェーズ

### Phase 1: MVP（最小機能版）
- [x] 要件定義
- [x] 技術スタック選定
- [x] システムアーキテクチャ設計
- [x] 開発環境セットアップ
- [ ] 基本録音機能実装
- [ ] 3ファイル生成実装
- [ ] 基本UI実装

### Phase 2: 履歴管理
- [ ] データベース実装
- [ ] 録音履歴画面
- [ ] 再生機能

### Phase 3: 高度な機能
- [ ] ホットキー対応
- [ ] デバイス選択
- [ ] バックグラウンド録音
- [ ] 設定画面

### Phase 4: クラウド連携
- [ ] Google Drive連携
- [ ] Dropbox連携

## トラブルシューティング

### macOSでシステムオーディオが録音できない

BlackHoleがインストールされているか確認してください。

```bash
brew list | grep blackhole
```

インストールされていない場合：

```bash
brew install blackhole-2ch
```

インストール後、Audio MIDI Setupでマルチ出力デバイスを作成してください。

### Windowsでマイク/スピーカーにアクセスできない

設定 > プライバシー > マイク/スピーカー で、アプリのアクセス許可を確認してください。

## ライセンス

MIT

## 作成者

Your Company

---

**バージョン**: 0.1.0
**最終更新**: 2025-11-17
