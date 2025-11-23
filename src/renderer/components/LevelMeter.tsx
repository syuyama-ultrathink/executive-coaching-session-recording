import React from 'react';
import { Progress } from 'antd';

interface LevelMeterProps {
  level: number; // 0-100
}

const LevelMeter: React.FC<LevelMeterProps> = ({ level }) => {
  // レベルに応じて色を変更
  const getColor = (value: number): string => {
    if (value < 50) return '#52c41a'; // 緑
    if (value < 80) return '#faad14'; // 黄
    return '#ff4d4f'; // 赤（音割れリスク）
  };

  return (
    <div style={{ position: 'relative' }}>
      <Progress
        percent={level}
        strokeColor={getColor(level)}
        showInfo={false}
        size="small"
      />
      {/* 閾値マーカー: 80%で音割れリスク */}
      <div
        style={{
          position: 'absolute',
          left: '80%',
          top: 0,
          bottom: 0,
          width: 2,
          backgroundColor: '#ff4d4f',
          opacity: 0.5,
          pointerEvents: 'none',
        }}
        title="音割れリスク閾値（80%）"
      />
      {/* テキスト表示: レベル値 */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: -2,
        fontSize: 12,
        color: '#666'
      }}>
        {Math.round(level)}%
      </div>
    </div>
  );
};

export default LevelMeter;
