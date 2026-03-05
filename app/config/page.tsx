'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Button, Space, Divider, message, Modal, Descriptions, Statistic, Row, Col } from 'antd'
import { SettingOutlined, SyncOutlined, ReloadOutlined, DatabaseOutlined } from '@ant-design/icons'
import { postApi } from '@/lib/api'
import { fetchApi } from '@/lib/api'
import type { Stats } from '@/lib/db/schema'

const ConfigPage: React.FC = () => {
  const [syncing, setSyncing] = useState(false)
  const [rebuilding, setRebuilding] = useState(false)
  const [rebuildingCategory, setRebuildingCategory] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // 获取统计信息
  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const res = await fetchApi<string>('/api/qb/torrents/stats')
      if (res.success && res.data) {
        setStats(JSON.parse(res.data))
      }
    } catch (error) {
      console.error('获取统计信息失败:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [])

  // 同步 qBittorrent
  const syncTorrents = useCallback(async () => {
    setSyncing(true)
    try {
      const data = await postApi('/api/qb/torrents/sync')
      if (data?.success) {
        message.success('开始同步 qBittorrent')
        setTimeout(() => {
          fetchStats()
        }, 2000)
      } else {
        message.error(data?.error || '同步失败')
      }
    } catch (error) {
      console.error('同步失败:', error)
      message.error('同步失败')
    } finally {
      setSyncing(false)
    }
  }, [fetchStats])

  // 重建数据
  const rebuildData = useCallback(async (rebuildCategory = false) => {
    if (rebuildCategory) {
      setRebuildingCategory(true)
    } else {
      setRebuilding(true)
    }
    try {
      const data = await postApi('/api/qb/torrents/rebuild', { rebuildCategory })
      if (data?.success) {
        message.success((data.data as any)?.message || '数据已重建')
        setTimeout(() => {
          fetchStats()
        }, 2000)
      } else {
        message.error(data?.error || '重建失败')
      }
    } catch (error) {
      console.error('重建失败:', error)
      message.error('重建失败')
    } finally {
      setRebuilding(false)
      setRebuildingCategory(false)
    }
  }, [fetchStats])

  // 确认重建
  const confirmRebuild = () => {
    Modal.confirm({
      title: '确认重建',
      content: '确定要重建数据吗？这将清空所有本地数据并重新从 qBittorrent 同步。此操作不可逆！',
      okText: '确定',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => rebuildData(false),
    })
  }

  // 确认更新类别
  const confirmUpdateCategory = () => {
    Modal.confirm({
      title: '确认更新类别',
      content: '确定要更新所有种子的类别信息吗？这将从 qBittorrent 获取最新的类别数据。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => rebuildData(true),
    })
  }

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SettingOutlined />
          配置
        </h1>
      </div>

      <Row gutter={[16, 16]}>
        {/* 统计信息 */}
        <Col xs={24} md={24}>
          <Card title={<DatabaseOutlined />} loading={loadingStats}>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Statistic title="种子总数" value={stats?.total || 0} suffix="个" />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="下载中" value={stats?.downloading || 0} suffix="个" valueStyle={{ color: '#1890ff' }} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="做种中" value={stats?.seeding || 0} suffix="个" valueStyle={{ color: '#52c41a' }} />
              </Col>
              <Col xs={12} sm={6}>
                <Statistic title="已暂停" value={stats?.paused || 0} suffix="个" valueStyle={{ color: '#faad14' }} />
              </Col>
              <Col xs={24} sm={6}>
                <Statistic title="总大小" value={formatSize(stats?.total_size || 0)} />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 同步操作 */}
        <Col xs={24} md={12}>
          <Card title="同步操作" bordered>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <h3 style={{ marginTop: 0 }}>同步 qBittorrent</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  从 qBittorrent 获取最新的种子列表并更新到数据库。如果种子已存在则更新状态，否则添加新种子。
                </p>
                <Button 
                  type="primary" 
                  onClick={syncTorrents} 
                  loading={syncing} 
                  icon={<SyncOutlined spin={syncing} />}
                  size="large"
                  block
                >
                  {syncing ? '同步中...' : '开始同步'}
                </Button>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 数据管理 */}
        <Col xs={24} md={12}>
          <Card title="数据管理" bordered>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <h3 style={{ marginTop: 0 }}>重建数据</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  清空所有本地数据（种子、文件、卷）并重新从 qBittorrent 同步。
                  <br />
                  <span style={{ color: '#ff4d4f' }}>⚠️ 此操作不可逆，请谨慎使用！</span>
                </p>
                <Button 
                  danger 
                  onClick={confirmRebuild} 
                  loading={rebuilding} 
                  icon={<ReloadOutlined />}
                  size="large"
                  block
                >
                  重建数据
                </Button>
              </div>

              <Divider />

              <div>
                <h3 style={{ marginTop: 0 }}>更新类别</h3>
                <p style={{ color: '#666', fontSize: '14px' }}>
                  从 qBittorrent 获取最新的类别信息并更新到数据库。
                  <br />
                  保留现有数据，仅更新 category 字段。
                </p>
                <Button 
                  onClick={confirmUpdateCategory} 
                  loading={rebuildingCategory} 
                  icon={<SettingOutlined />}
                  size="large"
                  block
                >
                  更新类别
                </Button>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ConfigPage
