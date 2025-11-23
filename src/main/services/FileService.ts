import { app } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import type { RecordingFiles, RecordingMetadata } from '../../shared/types';
import databaseService from './DatabaseService';
import { logger } from '../utils/logger';

// FFmpegのパスを設定
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

class FileService {
  private basePath: string;

  constructor() {
    // デフォルト保存先
    this.basePath = path.join(app.getPath("documents"), "Recordings");
  }

  async initialize(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
      console.log(`Recordings directory initialized: ${this.basePath}`);
    } catch (error) {
      console.error("Failed to initialize recordings directory:", error);
      throw error;
    }
  }

  async saveRecording(
    metadata: RecordingMetadata,
    duration: number
  ): Promise<RecordingFiles> {
    logger.info('FileService', 'saveRecording called', { metadata, duration });

    try {
      const timestamp = this.generateTimestamp();
      const baseName = metadata.fileName
        ? `${timestamp}_${metadata.fileName}`
        : timestamp;
      logger.debug('FileService', 'Generated base name', { baseName, timestamp });

      const micPath = path.join(this.basePath, `${baseName}_mic.mp3`);
      const speakerPath = path.join(this.basePath, `${baseName}_speaker.mp3`);
      const mixedPath = path.join(this.basePath, `${baseName}_mixed.mp3`);

      logger.info('FileService', 'File paths generated', { micPath, speakerPath, mixedPath });

      logger.debug('FileService', 'Creating database record...');
      await databaseService.createRecording({
        fileName: baseName,
        filePath: mixedPath,
        micPath,
        speakerPath,
        mixedPath,
        duration,
        fileSize: 0,
        memo: metadata.memo,
        quality: metadata.quality
      });
      logger.info('FileService', 'Database record created successfully');

      logger.info('FileService', 'saveRecording completed successfully', { micPath, speakerPath, mixedPath });
      return { micPath, speakerPath, mixedPath };
    } catch (error) {
      logger.error('FileService', 'saveRecording failed', error);
      throw error;
    }
  }

  async saveRecordingFromBlobs(
    micBuffer: Buffer,
    systemBuffer: Buffer,
    mixBuffer: Buffer,
    metadata: RecordingMetadata
  ): Promise<RecordingFiles & { duration: number }> {
    const timestamp = this.generateTimestamp();
    const baseName = metadata.fileName
      ? `${timestamp}_${metadata.fileName}`
      : timestamp;

    const tempMicWebm = path.join(this.basePath, `${baseName}_mic_temp.webm`);
    const tempSystemWebm = path.join(this.basePath, `${baseName}_system_temp.webm`);
    const tempMixWebm = path.join(this.basePath, `${baseName}_mix_temp.webm`);

    const micPath = path.join(this.basePath, `${baseName}_mic.mp3`);
    const speakerPath = path.join(this.basePath, `${baseName}_speaker.mp3`);
    const mixedPath = path.join(this.basePath, `${baseName}_mixed.mp3`);

    try {
      // WebMファイルとして保存
      if (micBuffer.length > 0) {
        await fs.writeFile(tempMicWebm, micBuffer);
        console.log(`Saved mic WebM: ${tempMicWebm} (${micBuffer.length} bytes)`);
      }

      if (systemBuffer.length > 0) {
        await fs.writeFile(tempSystemWebm, systemBuffer);
        console.log(`Saved system WebM: ${tempSystemWebm} (${systemBuffer.length} bytes)`);
      }

      if (mixBuffer.length > 0) {
        await fs.writeFile(tempMixWebm, mixBuffer);
        console.log(`Saved mix WebM: ${tempMixWebm} (${mixBuffer.length} bytes)`);
      }

      let duration = 0;

      // MP3に変換
      if (micBuffer.length > 0) {
        duration = await this.convertToMp3(tempMicWebm, micPath);
        console.log(`Converted mic to MP3: ${micPath}, duration: ${duration}s`);
      }

      if (systemBuffer.length > 0) {
        await this.convertToMp3(tempSystemWebm, speakerPath);
        console.log(`Converted system to MP3: ${speakerPath}`);
      }

      if (mixBuffer.length > 0) {
        duration = await this.convertToMp3(tempMixWebm, mixedPath);
        console.log(`Converted mix to MP3: ${mixedPath}, duration: ${duration}s`);
      } else if (micBuffer.length > 0) {
        // mixBufferがない場合は、micをコピー（後方互換性）
        await fs.copyFile(micPath, mixedPath);
      }

      // 一時ファイルを削除
      if (micBuffer.length > 0) {
        await fs.unlink(tempMicWebm).catch(err => console.warn("Failed to delete temp mic file:", err));
      }
      if (systemBuffer.length > 0) {
        await fs.unlink(tempSystemWebm).catch(err => console.warn("Failed to delete temp system file:", err));
      }
      if (mixBuffer.length > 0) {
        await fs.unlink(tempMixWebm).catch(err => console.warn("Failed to delete temp mix file:", err));
      }

      const fileSize = micBuffer.length > 0
        ? (await fs.stat(mixedPath)).size
        : 0;

      console.log(`Saving to database with duration: ${duration}`);

      await databaseService.createRecording({
        fileName: baseName,
        filePath: mixedPath,
        micPath,
        speakerPath,
        mixedPath,
        duration,
        fileSize,
        memo: metadata.memo || "",
        quality: metadata.quality
      });

      console.log("Recording saved to database");

      return { micPath, speakerPath, mixedPath, duration };
    } catch (error) {
      console.error("Failed to save recording from blobs:", error);
      throw error;
    }
  }

  private async convertToMp3(inputPath: string, outputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat("mp3")
        .audioBitrate("192k")
        .audioCodec("libmp3lame")
        .on("end", async () => {
          console.log(`FFmpeg conversion completed: ${outputPath}`);
          try {
            const duration = await this.getAudioDuration(outputPath);
            resolve(duration);
          } catch (err) {
            console.warn("Failed to get duration, using 1 second as fallback:", err);
            resolve(1);
          }
        })
        .on("error", (err) => {
          console.error("FFmpeg conversion error:", err);
          reject(err);
        })
        .save(outputPath);
    });
  }

  private async getAudioDuration(filePath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          reject(err);
          return;
        }
        const duration = metadata.format.duration || 0;
        console.log(`Audio duration: ${duration} seconds`);
        resolve(Math.floor(duration));
      });
    });
  }

  async deleteRecording(id: number): Promise<void> {
    await databaseService.markAsDeleted(id);
    console.log(`Recording ${id} marked as deleted`);
  }

  async renameRecording(id: number, newName: string): Promise<void> {
    const recording = await databaseService.getRecording(id);
    if (!recording) {
      throw new Error(`Recording ${id} not found`);
    }

    const timestamp = recording.fileName.split("_")[0];
    const newBaseName = `${timestamp}_${newName}`;

    await databaseService.updateRecording(id, {
      fileName: newBaseName
    });

    console.log(`Recording ${id} renamed to ${newBaseName}`);
  }

  private generateTimestamp(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day}_${hours}${minutes}${seconds}`;
  }

  getBasePath(): string {
    return this.basePath;
  }

  setBasePath(newPath: string): void {
    this.basePath = newPath;
  }
}

export default new FileService();
