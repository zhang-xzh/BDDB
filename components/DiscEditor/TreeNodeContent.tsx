import React from 'react'
import { Select, Cascader, Switch, Space, Typography } from 'antd'

interface TreeNodeContentProps {
  title: string
  nodeKey: string
  worksCount: number
  visibleVolumes: number
  loadMoreVolumes: () => void
  getNodeVolume: (key: string) => number | undefined
  getNodeShared: (key: string) => boolean
  getNodeSharedVolumes: (key: string) => number[]
  onVolumeChange: (key: string, volumeNo: number | null) => void
  onSharedVolumeChange: (key: string, volumes: number[]) => void
  onToggleShared: (key: string, shared: boolean) => void
}

// volume_no encoding for multi-work: workIndex * 1000 + volNo
const toCascaderValue = (vn: number | undefined): [number, number] | undefined => {
  if (vn === undefined) return undefined
  return [Math.floor(vn / 1000), vn % 1000]
}
const fromCascaderValue = (val: (string | number)[]): number =>
  (val[0] as number) * 1000 + (val[1] as number)

export function TreeNodeContent({
  title,
  nodeKey,
  worksCount,
  visibleVolumes,
  loadMoreVolumes,
  getNodeVolume,
  getNodeShared,
  getNodeSharedVolumes,
  onVolumeChange,
  onSharedVolumeChange,
  onToggleShared,
}: TreeNodeContentProps) {
  const isShared = getNodeShared(nodeKey)
  const volumeNo = getNodeVolume(nodeKey)
  const sharedVolumes = getNodeSharedVolumes(nodeKey)

  const selectOptions = Array.from({ length: visibleVolumes }, (_, i) => ({
    value: i + 1,
    label: `第 ${i + 1} 卷`,
  }))

  const cascaderOptions = Array.from({ length: worksCount }, (_, wi) => ({
    label: `作品 ${wi + 1}`,
    value: wi + 1,
    children: Array.from({ length: visibleVolumes }, (_, vi) => ({
      label: `第 ${vi + 1} 卷`,
      value: vi + 1,
    })),
  }))

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop - clientHeight < 20) loadMoreVolumes()
  }

  const renderSelector = () => {
    if (worksCount === 1) {
      return (
        <Select
          mode={isShared ? 'multiple' : undefined}
          value={isShared ? sharedVolumes : volumeNo}
          onChange={(val) => {
            if (isShared) onSharedVolumeChange(nodeKey, val as number[])
            else onVolumeChange(nodeKey, (val as number | undefined) ?? null)
          }}
          style={{ minWidth: isShared ? 150 : 100, flexShrink: 0 }}
          size="small"
          placeholder="卷号"
          allowClear
          options={selectOptions}
          onPopupScroll={handleScroll}
        />
      )
    }
    // Multi-work: Cascader
    if (!isShared) {
      return (
        <Cascader
          value={toCascaderValue(volumeNo)}
          onChange={(val) => {
            if (!val || (val as (string | number)[]).length === 0) onVolumeChange(nodeKey, null)
            else onVolumeChange(nodeKey, fromCascaderValue(val as (string | number)[]))
          }}
          options={cascaderOptions}
          placeholder="作品/卷"
          size="small"
          style={{ width: 160, flexShrink: 0 }}
          allowClear
        />
      )
    }
    return (
      <Cascader
        multiple
        value={sharedVolumes.map(vn => toCascaderValue(vn)!)}
        onChange={(vals) => {
          onSharedVolumeChange(nodeKey, (vals as (string | number)[][]).map(fromCascaderValue))
        }}
        options={cascaderOptions}
        placeholder="作品/卷（多选）"
        size="small"
        style={{ minWidth: 200, flexShrink: 0 }}
      />
    )
  }

  return (
    <Space style={{ width: '100%', justifyContent: 'space-between' }} size={4}>
      <Typography.Text ellipsis={{ tooltip: title }} style={{ flex: 1 }}>
        {title}
      </Typography.Text>
      <Space size={4}>
        <Switch
          size="small"
          checked={isShared}
          onChange={(checked) => onToggleShared(nodeKey, checked)}
          checkedChildren="共享"
          unCheckedChildren="共享"
        />
        {renderSelector()}
      </Space>
    </Space>
  )
}
