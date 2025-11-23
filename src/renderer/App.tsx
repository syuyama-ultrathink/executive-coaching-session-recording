import React, { useEffect, useState } from 'react';
import { ConfigProvider, Layout, Menu, Button } from 'antd';
import { AudioOutlined, HistoryOutlined, SettingOutlined } from '@ant-design/icons';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import jaJP from 'antd/es/locale/ja_JP';
import RecordingPanel from './components/RecordingPanel';
import HistoryList from './components/HistoryList';
import SettingsPanel from './components/SettingsPanel';
import { useRecordingStore } from './stores/recordingStore';
import { useSettingsStore } from './stores/settingsStore';
import type { AudioDevice } from '../shared/types';

const { Header, Content } = Layout;

const AppContent: React.FC = () => {
  const location = useLocation();
  const currentPath = location.pathname;
  const [settingsVisible, setSettingsVisible] = useState(false);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <div style={{ color: 'white', fontSize: 20, fontWeight: 'bold', marginRight: 40 }}>
            Recording App
          </div>
          <Menu
            theme="dark"
            mode="horizontal"
            selectedKeys={[currentPath]}
            style={{ flex: 1, minWidth: 0 }}
            items={[
              {
                key: '/',
                icon: <AudioOutlined />,
                label: <Link to="/">録音</Link>
              },
              {
                key: '/history',
                icon: <HistoryOutlined />,
                label: <Link to="/history">履歴</Link>
              }
            ]}
          />
        </div>
        <Button
          type="text"
          icon={<SettingOutlined />}
          onClick={() => setSettingsVisible(true)}
          style={{ color: 'white' }}
        />
      </Header>
      <Content>
        <Routes>
          <Route
            path="/"
            element={
              <div
                style={{
                  width: '100%',
                  height: 'calc(100vh - 64px)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#f0f2f5'
                }}
              >
                <RecordingPanel />
              </div>
            }
          />
          <Route path="/history" element={<HistoryList />} />
        </Routes>
      </Content>

      {/* 設定パネル */}
      <SettingsPanel
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
      />
    </Layout>
  );
};

const App: React.FC = () => {
  const { updateProgress, setDevices } = useRecordingStore();
  const { loadSettings } = useSettingsStore();

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
      try {
        console.log('Loading devices...');

        // navigator.mediaDevices.enumerateDevices()を使用して実際のデバイスを列挙
        const deviceInfos = await navigator.mediaDevices.enumerateDevices();
        console.log('Enumerated devices:', deviceInfos);

        const microphones: AudioDevice[] = [];
        const speakers: AudioDevice[] = [];

        deviceInfos.forEach((device) => {
          if (device.kind === 'audioinput') {
            microphones.push({
              id: device.deviceId,
              name: device.label || `Microphone ${microphones.length + 1}`,
              maxInputChannels: 2,
              maxOutputChannels: 0
            });
          } else if (device.kind === 'audiooutput') {
            speakers.push({
              id: device.deviceId,
              name: device.label || `Speaker ${speakers.length + 1}`,
              maxInputChannels: 0,
              maxOutputChannels: 2
            });
          }
        });

        console.log('Parsed devices:', { microphones, speakers });
        setDevices(microphones, speakers);
        console.log('Devices set in store');
      } catch (error) {
        console.error('Failed to enumerate devices:', error);
      }
    };

    // 設定読み込み
    loadSettings();
    loadDevices();
  }, [updateProgress, setDevices, loadSettings]);

  return (
    <ConfigProvider locale={jaJP}>
      <Router>
        <AppContent />
      </Router>
    </ConfigProvider>
  );
};

export default App;
