import React, { useEffect, useState } from 'react';
import {
  Table,
  Input,
  Button,
  Space,
  Modal,
  message,
  Popconfirm,
  Typography,
  Card,
  Drawer
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  SearchOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { useHistoryStore } from '../stores/historyStore';
import AudioPlayer from './AudioPlayer';
import type { Recording } from '../../shared/types';

const { Search } = Input;
const { Text } = Typography;

const HistoryList: React.FC = () => {
  const {
    recordings,
    loading,
    error,
    searchText,
    loadRecordings,
    deleteRecording,
    renameRecording,
    updateMemo,
    setSearchText
  } = useHistoryStore();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [newMemo, setNewMemo] = useState('');
  const [playingRecording, setPlayingRecording] = useState<Recording | null>(null);
  const [playerDrawerVisible, setPlayerDrawerVisible] = useState(false);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // フィルターされた録音
  const filteredRecordings = recordings.filter((recording) =>
    recording.fileName.toLowerCase().includes(searchText.toLowerCase()) ||
    (recording.memo && recording.memo.toLowerCase().includes(searchText.toLowerCase()))
  );

  // 時間のフォーマット（秒 → MM:SS）
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // ファイルサイズのフォーマット
  const formatFileSize = (bytes: number | undefined | null): string => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // 日付のフォーマット
  const formatDate = (dateString: string | Date): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // リネーム処理
  const handleRename = async (id: number) => {
    const recording = recordings.find(r => r.id === id);
    if (!recording) return;

    // タイムスタンプパターン: YYYY-MM-DD_HHMMSS
    const timestampPattern = /^\d{4}-\d{2}-\d{2}_\d{6}/;
    const match = recording.fileName.match(timestampPattern);

    let fullFileName: string;
    if (match) {
      // タイムスタンプ部分を保持
      const timestamp = match[0];
      // カスタム名がある場合は追加、なければタイムスタンプのみ
      fullFileName = newFileName.trim() ? `${timestamp}_${newFileName.trim()}` : timestamp;
    } else {
      // タイムスタンプ形式でない場合はそのまま使用
      fullFileName = newFileName.trim() || recording.fileName;
    }

    try {
      await renameRecording(id, fullFileName);
      message.success('ファイル名を変更しました');
      setEditingId(null);
      setNewFileName('');
    } catch (error) {
      message.error('ファイル名の変更に失敗しました');
    }
  };

  // 削除処理
  const handleDelete = async (id: number) => {
    try {
      await deleteRecording(id);
      message.success('録音を削除しました');
    } catch (error) {
      message.error('録音の削除に失敗しました');
    }
  };

  // 編集ボタンクリック
  const handleEditClick = (record: Recording) => {
    setEditingId(record.id);
    // タイムスタンプパターン: YYYY-MM-DD_HHMMSS
    const timestampPattern = /^\d{4}-\d{2}-\d{2}_\d{6}/;
    const match = record.fileName.match(timestampPattern);

    if (match) {
      // タイムスタンプ後のカスタム部分を取得（_カスタム名 の形式）
      const customPart = record.fileName.slice(match[0].length);
      // _で始まる場合は除去
      setNewFileName(customPart.startsWith('_') ? customPart.slice(1) : customPart);
    } else {
      // タイムスタンプ形式でない場合はそのまま
      setNewFileName(record.fileName);
    }
  };

  // 再生ボタンクリック
  const handlePlayClick = (record: Recording) => {
    setPlayingRecording(record);
    setPlayerDrawerVisible(true);
  };

  // メモ編集開始
  const handleMemoEditClick = (record: Recording) => {
    setEditingMemoId(record.id);
    setNewMemo(record.memo || '');
  };

  // メモ更新
  const handleMemoUpdate = async (id: number) => {
    try {
      await updateMemo(id, newMemo);
      message.success('メモを更新しました');
      setEditingMemoId(null);
      setNewMemo('');
    } catch (error) {
      message.error('メモの更新に失敗しました');
    }
  };

  const columns: ColumnsType<Recording> = [
    {
      title: '録音日時',
      dataIndex: 'recordedAt',
      key: 'recordedAt',
      render: (date: string | Date) => formatDate(date),
      sorter: (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
      defaultSortOrder: 'descend',
      width: 180
    },
    {
      title: 'ファイル名',
      dataIndex: 'fileName',
      key: 'fileName',
      ellipsis: true,
      render: (_: any, record: Recording) => {
        if (editingId === record.id) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onPressEnter={() => handleRename(record.id)}
                placeholder="カスタム名を入力（空欄の場合は日時のみ）"
                autoFocus
              />
              <Button type="primary" onClick={() => handleRename(record.id)}>
                保存
              </Button>
              <Button onClick={() => {
                setEditingId(null);
                setNewFileName('');
              }}>
                キャンセル
              </Button>
            </Space.Compact>
          );
        }
        return <Text>{record.fileName}</Text>;
      }
    },
    {
      title: '録音時間',
      dataIndex: 'duration',
      key: 'duration',
      render: (seconds: number) => formatDuration(seconds),
      sorter: (a, b) => a.duration - b.duration,
      width: 100
    },
    {
      title: 'ファイルサイズ',
      dataIndex: 'fileSize',
      key: 'fileSize',
      render: (bytes: number) => formatFileSize(bytes),
      sorter: (a, b) => (a.fileSize || 0) - (b.fileSize || 0),
      width: 120
    },
    {
      title: 'メモ',
      dataIndex: 'memo',
      key: 'memo',
      ellipsis: true,
      render: (_: any, record: Recording) => {
        if (editingMemoId === record.id) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              <Input.TextArea
                value={newMemo}
                onChange={(e) => setNewMemo(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleMemoUpdate(record.id);
                  }
                }}
                autoFocus
                autoSize={{ minRows: 1, maxRows: 4 }}
                placeholder="メモを入力"
              />
              <Button type="primary" onClick={() => handleMemoUpdate(record.id)}>
                保存
              </Button>
              <Button onClick={() => {
                setEditingMemoId(null);
                setNewMemo('');
              }}>
                キャンセル
              </Button>
            </Space.Compact>
          );
        }
        return (
          <Space>
            <Text ellipsis style={{ flex: 1, maxWidth: 300 }}>
              {record.memo || 'メモなし'}
            </Text>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleMemoEditClick(record)}
              title="メモを編集"
            />
          </Space>
        );
      }
    },
    {
      title: 'アクション',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_: any, record: Recording) => (
        <Space>
          <Button
            type="text"
            icon={<PlayCircleOutlined />}
            title="再生"
            onClick={() => handlePlayClick(record)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditClick(record)}
            title="リネーム"
          />
          <Popconfirm
            title="録音を削除"
            description="この録音を削除してもよろしいですか？"
            onConfirm={() => handleDelete(record.id)}
            okText="削除"
            cancelText="キャンセル"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              title="削除"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  if (error) {
    return (
      <Card style={{ margin: 24 }}>
        <Text type="danger">{error}</Text>
      </Card>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography.Title level={2}>録音履歴</Typography.Title>
          <Button type="primary" onClick={loadRecordings} loading={loading}>
            更新
          </Button>
        </div>

        <Search
          placeholder="ファイル名またはメモで検索"
          allowClear
          enterButton={<SearchOutlined />}
          size="large"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 600 }}
        />

        <Table
          columns={columns}
          dataSource={filteredRecordings}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `全 ${total} 件`
          }}
          scroll={{ x: 1200 }}
        />
      </Space>

      {/* 音声プレイヤーDrawer */}
      <Drawer
        title="録音再生"
        placement="right"
        width={500}
        onClose={() => {
          setPlayerDrawerVisible(false);
          setPlayingRecording(null);
        }}
        open={playerDrawerVisible}
      >
        {playingRecording && (
          <AudioPlayer
            micPath={playingRecording.micPath || null}
            speakerPath={playingRecording.speakerPath || null}
            mixedPath={playingRecording.mixedPath || null}
            fileName={playingRecording.fileName}
          />
        )}
      </Drawer>
    </div>
  );
};

export default HistoryList;
