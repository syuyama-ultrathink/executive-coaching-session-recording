# Phase 1 セットアップガイド

Phase 1（MVP）の開発環境セットアップ手順です。

## 前提条件

- **Node.js**: 18.x 以降
- **npm**: 10.x 以降
- **Git**: 最新版

### macOSの場合
```bash
# BlackHoleのインストール（システムオーディオキャプチャ用）
brew install blackhole-2ch
```

## セットアップ手順

### 1. 依存関係のインストール

```bash
cd "G:\共有ドライブ\CompanyDataSource_ExecutiveCoaching\200_Dev\001_RecordingApp"
npm install
```

### 2. Prismaのセットアップ

```bash
# Prisma Clientの生成
npm run prisma:generate

# データベースマイグレーション
npm run prisma:migrate
```

マイグレーション名を聞かれたら `init` と入力してください。

### 3. 開発サーバー起動

```bash
npm run dev
```

このコマンドで以下が起動します：
- Electronアプリ
- Vite開発サーバー（ホットリロード対応）

## Phase 1の機能

Phase 1では以下の機能が実装されています：

### ✅ 実装済み
- 基本的なUI（録音パネル）
- 録音ボタン（開始/一時停止/停止）
- 録音時間表示
- レベルメーター表示（モック）
- 録音設定（ファイル名、メモ、音質選択）
- デバイス選択（マイク/スピーカー）
- データベース連携（SQLite + Prisma）
- IPC通信（Main ⇔ Renderer）

### 🔧 スタブ実装（後のPhaseで詳細実装予定）
- 音声キャプチャ（AudioCaptureService）
- MP3エンコーディング（EncodingService）
- ファイル保存（FileService）

## トラブルシューティング

### `npm install`でエラーが出る

```bash
# キャッシュをクリア
npm cache clean --force

# node_modulesを削除して再インストール
rm -rf node_modules
npm install
```

### Prismaマイグレーションがエラーになる

```bash
# Prismaキャッシュをクリア
npx prisma generate --force

# データベースファイルを削除して再作成
rm prisma/recordings.db
npm run prisma:migrate
```

### Electronアプリが起動しない

1. `dist/main`フォルダが存在するか確認
   ```bash
   npm run build:main
   ```

2. ポート3000が使用されていないか確認
   ```bash
   # Windows
   netstat -ano | findstr :3000

   # macOS/Linux
   lsof -i :3000
   ```

### TypeScriptのコンパイルエラー

```bash
# TypeScriptの型チェック
npx tsc --noEmit

# ESLintでコードチェック
npm run lint
```

## 開発のヒント

### ホットリロード
Renderer Process（React）は自動でホットリロードされます。
Main Processを変更した場合は、アプリを再起動してください（Ctrl+Cで停止 → `npm run dev`）。

### デバッグ
開発モードでは自動的にDevToolsが開きます。
- **Console**: ログ確認
- **Network**: IPC通信の確認
- **React DevTools**: コンポーネントの状態確認

### データベース確認

```bash
# Prisma Studio（GUIツール）を起動
npx prisma studio
```

ブラウザで http://localhost:5555 が開き、データベースの中身を確認・編集できます。

## 次のステップ

Phase 1の動作確認後、以下の機能を実装していきます：

### Phase 1.5: 実際の録音機能実装
- AudioCaptureServiceの詳細実装
  - Windows: WASAPI loopback
  - macOS: BlackHole連携
- EncodingServiceの詳細実装
  - FFmpegによるMP3エンコーディング
  - 音声ミキシング
- FileServiceの詳細実装
  - 実際のファイル書き込み

### Phase 2: 履歴管理
- 録音履歴画面
- 再生機能
- リネーム・削除機能

### Phase 3: 高度な機能
- ホットキー対応
- バックグラウンド録音
- 設定画面

## ヘルプ

問題が解決しない場合は、以下を確認してください：

1. **ログ確認**
   - Main Processのログ: ターミナル出力
   - Renderer Processのログ: DevTools Console

2. **環境確認**
   ```bash
   node --version  # v18.x以降
   npm --version   # v10.x以降
   ```

3. **ファイル構造確認**
   ```
   src/
   ├── main/
   ├── renderer/
   ├── preload/
   └── shared/
   ```

---

**バージョン**: Phase 1 MVP
**最終更新**: 2025-11-17
