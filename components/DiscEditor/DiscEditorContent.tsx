'use client'

import React from 'react'
import { Card, Space, Empty, Spin, Button } from 'antd'
import { VolumeFormList } from './VolumeFormList'
import { FileTree } from './FileTree'
import type { VolumeForm, FileItem, NodeData } from '@/lib/db/schema'

interface DiscEditorContentProps {
  loading: boolean
  saving: boolean
  files: FileItem[]
  treeData: any[]
  nodeData: Map<string, NodeData>
  defaultExpandedKeys: string[]
  selectedVolumes: number[]
  maxVolumes: number
  volumeForms: Record<number, VolumeForm>
  onVolumeFormChange: (vol: number, form: VolumeForm) => void
  onVolumeChange: (key: string, volumeNo: number | null) => void
  getNodeVolume: (key: string) => number | undefined
  onCancel: () => void
  onSubmit: () => void
}

export function DiscEditorContent({
  loading,
  saving,
  files,
  treeData,
  nodeData,
  defaultExpandedKeys,
  selectedVolumes,
  maxVolumes,
  volumeForms,
  onVolumeFormChange,
  onVolumeChange,
  getNodeVolume,
  onCancel,
  onSubmit,
}: DiscEditorContentProps) {
  return (
    <Spin spinning={loading}>
      <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <VolumeFormList
          selectedVolumes={selectedVolumes}
          volumeForms={volumeForms}
          onVolumeFormChange={onVolumeFormChange}
        />

        {files.length > 0 ? (
          <Card
            size="small"
            title={
              <Space>
                <span>文件列表</span>
                <span style={{ color: '#999', fontWeight: 'normal' }}>{files.length} 个文件</span>
              </Space>
            }
            styles={{ body: { padding: '12px' } }}
          >
            <FileTree
              treeData={treeData}
              defaultExpandedKeys={defaultExpandedKeys}
              nodeData={nodeData}
              getNodeVolume={getNodeVolume}
              onVolumeChange={onVolumeChange}
              maxVolumes={maxVolumes}
            />
          </Card>
        ) : (
          <Empty description="暂无文件数据" />
        )}

        <Space style={{ justifyContent: 'flex-end' }}>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" loading={saving} onClick={onSubmit}>保存</Button>
        </Space>
      </div>
    </Spin>
  )
}
