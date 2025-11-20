import React, { useEffect } from 'react';
import { ConfigProvider } from 'antd';
import jaJP from 'antd/es/locale/ja_JP';
import RecordingPanel from './components/RecordingPanel';
import { useRecordingStore } from './stores/recordingStore';

const App: React.FC = () => {
  const { updateProgress, setDevices } = useRecordingStore();

  useEffect(() => {
    // Electronコンテキストが存在しない場合は何もしない（ブラウザでの直接アクセス時）
    if (!window.electronAPI) {
      console.warn('Electron API not available. Running in browser mode.');
      return;
    }

    // 録音進捗のイベントリスナー登録
    window.electronAPI.onRecordingProgress((progress) => {
      updateProgress(progress);
    });

    // デバイス一覧取得
    const loadDevices = async () => {
      console.log('Loading devices...');
      const devices = await window.electronAPI.getDevices();
      console.log('Devices loaded:', devices);
      setDevices(devices.microphones, devices.speakers);
      console.log('Devices set in store');
    };

    loadDevices();
  }, [updateProgress, setDevices]);

  return (
    <ConfigProvider locale={jaJP}>
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f0f2f5'
        }}
      >
        <RecordingPanel />
      </div>
    </ConfigProvider>
  );
};

export default App;
