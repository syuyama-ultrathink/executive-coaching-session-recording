import React, { useEffect, useState } from 'react';
import {
  Drawer,
  Form,
  Select,
  Radio,
  Button,
  Space,
  Typography,
  Divider,
  message,
  Input,
  Card,
  Switch
} from 'antd';
import {
  SettingOutlined,
  FolderOpenOutlined,
  AudioOutlined,
  BgColorsOutlined,
  ThunderboltOutlined,
  SoundOutlined
} from '@ant-design/icons';
import { useSettingsStore } from '../stores/settingsStore';
import type { RecordingQuality, AudioDevice } from '../../shared/types';

const { Title, Text } = Typography;

interface SettingsPanelProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ visible, onClose }) => {
  const { settings, loading, loadSettings, updateSetting, resetSettings } = useSettingsStore();
  const [form] = Form.useForm();
  const [devices, setDevices] = useState<{ microphones: AudioDevice[]; speakers: AudioDevice[] }>({
    microphones: [],
    speakers: []
  });

  // 初回ロード
  useEffect(() => {
    if (visible) {
      loadSettings();
      loadDevices();
    }
  }, [visible, loadSettings]);

  // 設定が読み込まれたらフォームに反映
  useEffect(() => {
    form.setFieldsValue(settings);
  }, [settings, form]);

  // デバイス一覧を取得
  const loadDevices = async () => {
    if (!window.electronAPI) return;

    try {
      const deviceList = await window.electronAPI.getDevices();
      setDevices(deviceList);
    } catch (error) {
      console.error('Failed to load devices:', error);
      message.error('デバイス一覧の取得に失敗しました');
    }
  };

  // フォルダ選択（今のところプレースホルダー）
  const handleSelectFolder = () => {
    message.info('フォルダ選択機能は今後実装予定です');
  };

  // 設定保存
  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      // 各設定を保存
      for (const [key, value] of Object.entries(values)) {
        await updateSetting(key as any, value);
      }

      message.success('設定を保存しました');
      onClose();
    } catch (error) {
      console.error('Failed to save settings:', error);
      message.error('設定の保存に失敗しました');
    }
  };

  // 設定リセット
  const handleReset = async () => {
    try {
      await resetSettings();
      form.setFieldsValue(settings);
      message.success('設定をリセットしました');
    } catch (error) {
      console.error('Failed to reset settings:', error);
      message.error('設定のリセットに失敗しました');
    }
  };

  return (
    <Drawer
      title={
        <Space>
          <SettingOutlined />
          <span>設定</span>
        </Space>
      }
      placement="right"
      width={600}
      onClose={onClose}
      open={visible}
      footer={
        <Space style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handleReset}>
            リセット
          </Button>
          <Space>
            <Button onClick={onClose}>
              キャンセル
            </Button>
            <Button type="primary" onClick={handleSave} loading={loading}>
              保存
            </Button>
          </Space>
        </Space>
      }
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
      >
        {/* 保存先設定 */}
        <Card
          size="small"
          title={
            <Space>
              <FolderOpenOutlined />
              <span>保存先</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            label="デフォルト保存先"
            name="defaultSavePath"
            extra="録音ファイルのデフォルト保存場所"
          >
            <Input
              readOnly
              placeholder="デフォルト（ドキュメント/Recordings）"
              suffix={
                <Button
                  type="text"
                  icon={<FolderOpenOutlined />}
                  onClick={handleSelectFolder}
                />
              }
            />
          </Form.Item>
        </Card>

        {/* 音質設定 */}
        <Card
          size="small"
          title={
            <Space>
              <AudioOutlined />
              <span>音質</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            label="デフォルト音質"
            name="defaultQuality"
            extra="新規録音時のデフォルト音質"
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="standard">
                  <Space direction="vertical" size={0}>
                    <Text strong>標準（128kbps）</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ファイルサイズ小、一般的な会話に最適
                    </Text>
                  </Space>
                </Radio>
                <Radio value="high">
                  <Space direction="vertical" size={0}>
                    <Text strong>高音質（192kbps）</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      バランスの取れた音質、推奨設定
                    </Text>
                  </Space>
                </Radio>
                <Radio value="premium">
                  <Space direction="vertical" size={0}>
                    <Text strong>最高音質（320kbps）</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      ファイルサイズ大、音楽や高品質録音用
                    </Text>
                  </Space>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Card>

        {/* 音声処理設定 */}
        <Card
          size="small"
          title={
            <Space>
              <SoundOutlined />
              <span>音声処理</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            label="エコーキャンセレーション"
            name="echoCancellation"
            valuePropName="checked"
            extra="スピーカーからの音がマイクに入り込むのを軽減（推奨: ON、ヘッドホン使用時はOFFでも可）"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="自動ゲインコントロール"
            name="autoGainControl"
            valuePropName="checked"
            extra="マイク音量を自動的に調整（音量の大小を均一化）"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="ノイズサプレッション"
            name="noiseSuppression"
            valuePropName="checked"
            extra="背景ノイズを低減（キーボード音、ファンノイズなど）"
          >
            <Switch />
          </Form.Item>
        </Card>

        {/* デバイス設定 */}
        <Card
          size="small"
          title={
            <Space>
              <AudioOutlined />
              <span>デバイス</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            label="デフォルトマイク"
            name="defaultMicDeviceId"
            extra="録音開始時に自動選択されるマイク"
          >
            <Select
              placeholder="システムデフォルトを使用"
              allowClear
              options={[
                { value: null, label: 'システムデフォルト' },
                ...devices.microphones.map(device => ({
                  value: device.id,
                  label: device.name
                }))
              ]}
            />
          </Form.Item>

          <Form.Item
            label="デフォルトスピーカー"
            name="defaultSpeakerDeviceId"
            extra="システムオーディオキャプチャ用デバイス"
          >
            <Select
              placeholder="システムデフォルトを使用"
              allowClear
              options={[
                { value: null, label: 'システムデフォルト' },
                ...devices.speakers.map(device => ({
                  value: device.id,
                  label: device.name
                }))
              ]}
            />
          </Form.Item>
        </Card>

        {/* ホットキー設定 */}
        <Card
          size="small"
          title={
            <Space>
              <ThunderboltOutlined />
              <span>ホットキー</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            label="録音開始/停止"
            name="hotkey_startStop"
            extra="グローバルショートカット（Phase 3で実装予定）"
          >
            <Input placeholder="Ctrl+Shift+R" disabled />
          </Form.Item>

          <Form.Item
            label="一時停止/再開"
            name="hotkey_pauseResume"
            extra="録音中の一時停止/再開"
          >
            <Input placeholder="Ctrl+Shift+P" disabled />
          </Form.Item>
        </Card>

        {/* テーマ設定 */}
        <Card
          size="small"
          title={
            <Space>
              <BgColorsOutlined />
              <span>外観</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Form.Item
            label="テーマ"
            name="theme"
            extra="アプリケーションの配色テーマ"
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="light">ライト</Radio>
                <Radio value="dark">ダーク</Radio>
                <Radio value="system">システム設定に従う</Radio>
              </Space>
            </Radio.Group>
          </Form.Item>
        </Card>
      </Form>
    </Drawer>
  );
};

export default SettingsPanel;
