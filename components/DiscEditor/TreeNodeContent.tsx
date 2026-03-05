import React from 'react'
import { Select, Typography } from 'antd'

interface TreeNodeContentProps {
  title: string
  nodeKey: string
  getNodeVolume: (key: string) => number | undefined
  onVolumeChange: (key: string, volumeNo: number | null) => void
  maxVolumes: number
}

export function TreeNodeContent({
  title,
  nodeKey,
  getNodeVolume,
  onVolumeChange,
  maxVolumes,
}: TreeNodeContentProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
      <Typography.Text ellipsis={{ tooltip: title }} style={{ flex: 1 }}>
        {title}
      </Typography.Text>
      <Select
        value={getNodeVolume(nodeKey)}
        onChange={(val) => onVolumeChange(nodeKey, val)}
        style={{ width: '100px', flexShrink: 0 }}
        size="small"
        placeholder="卷号"
        allowClear
      >
        {Array.from({ length: maxVolumes }, (_, i) => i + 1).map(vol => (
          <Select.Option key={vol} value={vol}>第 {vol} 卷</Select.Option>
        ))}
      </Select>
    </div>
  )
}
