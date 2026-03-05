import React from 'react'
import { Card, Space, Input } from 'antd'
import type { VolumeForm } from '@/lib/db/schema'

interface VolumeFormListProps {
  selectedVolumes: number[]
  volumeForms: Record<number, VolumeForm>
  onVolumeFormChange: (vol: number, form: VolumeForm) => void
}

export function VolumeFormList({
  selectedVolumes,
  volumeForms,
  onVolumeFormChange,
}: VolumeFormListProps) {
  if (selectedVolumes.length === 0) return null

  const getVolumeForm = (vol: number): VolumeForm => {
    return volumeForms[vol] || { catalog_no: '', volume_name: '' }
  }

  return (
    <Card size="small" title="卷信息" styles={{ body: { padding: '12px' } }}>
      <Space style={{ width: '100%' }} size={12} orientation="vertical">
        {selectedVolumes.map(vol => (
          <div key={vol} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 500, minWidth: '60px' }}>第{vol}卷</span>
            <Input
              value={getVolumeForm(vol).catalog_no}
              onChange={e => onVolumeFormChange(vol, { ...getVolumeForm(vol), catalog_no: e.target.value })}
              placeholder="型番"
              style={{ width: '120px' }}
            />
            <Input
              value={getVolumeForm(vol).volume_name}
              onChange={e => onVolumeFormChange(vol, { ...getVolumeForm(vol), volume_name: e.target.value })}
              placeholder="标题"
              style={{ width: '240px' }}
            />
          </div>
        ))}
      </Space>
    </Card>
  )
}
