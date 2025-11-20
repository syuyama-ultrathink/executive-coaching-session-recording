import { PrismaClient } from '@prisma/client';
import type { Recording, RecordingQuality } from '../../shared/types';

class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * データベース初期化
   */
  async initialize(): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('Database connected successfully');
    } catch (error) {
      console.error('Database connection error:', error);
      throw error;
    }
  }

  /**
   * 録音レコード作成
   */
  async createRecording(data: {
    fileName: string;
    filePath: string;
    micPath?: string;
    speakerPath?: string;
    mixedPath?: string;
    duration: number;
    fileSize?: number;
    memo?: string;
    quality: RecordingQuality;
  }): Promise<Recording> {
    const recording = await this.prisma.recording.create({
      data: {
        fileName: data.fileName,
        filePath: data.filePath,
        micPath: data.micPath,
        speakerPath: data.speakerPath,
        mixedPath: data.mixedPath,
        recordedAt: new Date(),
        duration: data.duration,
        fileSize: data.fileSize,
        memo: data.memo || '',
        quality: data.quality,
        isDeleted: false
      }
    });

    return recording as Recording;
  }

  /**
   * 録音一覧取得（論理削除除外）
   */
  async getRecordings(includeDeleted = false): Promise<Recording[]> {
    const recordings = await this.prisma.recording.findMany({
      where: includeDeleted ? {} : { isDeleted: false },
      orderBy: { recordedAt: 'desc' }
    });

    return recordings as Recording[];
  }

  /**
   * 録音詳細取得
   */
  async getRecording(id: number): Promise<Recording | null> {
    const recording = await this.prisma.recording.findUnique({
      where: { id }
    });

    return recording as Recording | null;
  }

  /**
   * 録音更新
   */
  async updateRecording(
    id: number,
    data: Partial<Omit<Recording, 'id' | 'createdAt' | 'updatedAt'>>
  ): Promise<Recording> {
    const recording = await this.prisma.recording.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date()
      }
    });

    return recording as Recording;
  }

  /**
   * 論理削除
   */
  async markAsDeleted(id: number): Promise<Recording> {
    const recording = await this.prisma.recording.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date()
      }
    });

    return recording as Recording;
  }

  /**
   * 設定取得
   */
  async getSetting(key: string): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: { key }
    });

    return setting?.value || null;
  }

  /**
   * 設定保存
   */
  async setSetting(key: string, value: string): Promise<void> {
    await this.prisma.setting.upsert({
      where: { key },
      update: { value, updatedAt: new Date() },
      create: { key, value }
    });
  }

  /**
   * データベースクローズ
   */
  async close(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default new DatabaseService();
