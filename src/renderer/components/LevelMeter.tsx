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
    return '#ff4d4f'; // 赤
  };

  return (
    <Progress
      percent={level}
      strokeColor={getColor(level)}
      showInfo={false}
      size="small"
    />
  );
};

export default LevelMeter;
