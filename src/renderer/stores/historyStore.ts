import { create } from 'zustand';
import type { Recording } from '../../shared/types';

interface HistoryState {
  recordings: Recording[];
  loading: boolean;
  error: string | null;
  searchText: string;

  // Actions
  setRecordings: (recordings: Recording[]) => void;
  loadRecordings: () => Promise<void>;
  deleteRecording: (id: number) => Promise<void>;
  renameRecording: (id: number, newName: string) => Promise<void>;
  updateMemo: (id: number, memo: string) => Promise<void>;
  setSearchText: (text: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  recordings: [],
  loading: false,
  error: null,
  searchText: '',

  setRecordings: (recordings) => set({ recordings }),

  loadRecordings: async () => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      set({ error: 'Electron APIが利用できません' });
      return;
    }

    set({ loading: true, error: null });

    try {
      const recordings = await window.electronAPI.getRecordings();
      set({ recordings, loading: false });
    } catch (error) {
      console.error('Failed to load recordings:', error);
      set({
        error: '録音一覧の取得に失敗しました',
        loading: false
      });
    }
  },

  deleteRecording: async (id: number) => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    try {
      await window.electronAPI.deleteRecording(id);

      // ローカル状態から削除
      const recordings = get().recordings.filter(r => r.id !== id);
      set({ recordings });
    } catch (error) {
      console.error('Failed to delete recording:', error);
      set({ error: '録音の削除に失敗しました' });
      throw error;
    }
  },

  renameRecording: async (id: number, newName: string) => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    try {
      await window.electronAPI.renameRecording(id, newName);

      // ローカル状態を更新
      const recordings = get().recordings.map(r =>
        r.id === id ? { ...r, fileName: newName } : r
      );
      set({ recordings });
    } catch (error) {
      console.error('Failed to rename recording:', error);
      set({ error: '録音のリネームに失敗しました' });
      throw error;
    }
  },

  updateMemo: async (id: number, memo: string) => {
    if (!window.electronAPI) {
      console.error('Electron API not available');
      return;
    }

    try {
      await window.electronAPI.updateRecordingMemo(id, memo);

      // ローカル状態を更新
      const recordings = get().recordings.map(r =>
        r.id === id ? { ...r, memo } : r
      );
      set({ recordings });
    } catch (error) {
      console.error('Failed to update memo:', error);
      set({ error: 'メモの更新に失敗しました' });
      throw error;
    }
  },

  setSearchText: (text) => set({ searchText: text }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
