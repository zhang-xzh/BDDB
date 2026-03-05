'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Table,
  Space,
  Button,
  Input,
  Progress,
  Badge,
  Modal,
  message,
  Tag,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { SyncOutlined, CheckCircleOutlined, CloseCircleOutlined, SettingOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import type { Torrent } from '@/lib/db/schema'
import { fetchApi, postApi } from '@/lib/api'
import DiscEditor, { type DiscEditorRef } from '@/components/DiscEditor'

const { Search } = Input
const { confirm } = Modal

interface TorrentWithVolume extends Torrent {
  hasVolumes?: boolean
  volumeCount?: number
}

const HomePage: React.FC = () => {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [torrents, setTorrents] = useState<TorrentWithVolume[]>([])
  const [searchText, setSearchText] = useState('')
  const discEditorRef = useRef<DiscEditorRef>(null)

  const pagination = {
    pageSize: 50,
    showSizeChanger: true,
    showQuickJumper: true,
    showTotal: (total: number) => `共 ${total} 条`,
  }

  // 格式化大小
  const formatSize = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
  }, [])

  // 获取状态样式
  const getStateStatus = (state: string): 'success' | 'processing' | 'warning' | 'default' => {
    if (state === 'downloading') return 'processing'
    if (state === 'uploading') return 'success'
    if (state.includes('paused')) return 'warning'
    if (state === 'completed') return 'success'
    return 'default'
  }

  // 获取状态文本
  const getStateText = (state: string): string => {
    const stateMap: Record<string, string> = {
      downloading: '下载中',
      uploading: '做种中',
      pausedDL: '已暂停',
      pausedUP: '已暂停',
      completed: '已完成',
    }
    return stateMap[state] || state
  }

  // 获取种子列表
  const fetchTorrents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetchApi<string>('/api/qb/torrents/info')
      if (res.success && res.data) {
        setTorrents(JSON.parse(res.data))
      }
    } catch (error) {
      console.error('获取种子列表失败:', error)
    } finally {
      setLoading(false)
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
          fetchTorrents()
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
  }, [fetchTorrents])

  // 搜索
  const handleSearch = useCallback(() => {
    fetchTorrents()
  }, [fetchTorrents])

  // 显示种子详情
  const showTorrentDetail = useCallback((record: Torrent) => {
    editDisc(record)
  }, [])

  // 编辑光盘
  const editDisc = useCallback((record: Torrent) => {
    discEditorRef.current?.open(record.qb_torrent.hash, record.qb_torrent.name, false)
  }, [])

  // 同步光盘文件
  const syncDiscFiles = useCallback((record: Torrent) => {
    discEditorRef.current?.open(record.qb_torrent.hash, record.qb_torrent.name, true)
  }, [])

  // 光盘保存成功回调
  const handleDiscSaved = useCallback(() => {
    fetchTorrents()
  }, [fetchTorrents])

  // 删除种子
  const deleteTorrent = useCallback(async (record: Torrent) => {
    confirm({
      title: '确认删除',
      content: `确定要删除种子 "${record.qb_torrent.name}" 吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const data = await postApi(`/api/qb/torrents/delete?hash=${record.qb_torrent.hash}`)
          if (data?.success) {
            message.success('删除成功')
            fetchTorrents()
          } else {
            message.error(data?.error || '删除失败')
          }
        } catch (error) {
          console.error('删除失败:', error)
          message.error('删除失败')
        }
      },
    })
  }, [fetchTorrents])

  useEffect(() => {
    fetchTorrents()
  }, [fetchTorrents])

  const columns: TableColumnsType<TorrentWithVolume> = [
    {
      title: '类别',
      dataIndex: ['qb_torrent', 'category'],
      key: 'category',
      width: 120,
      filters: Array.from(new Set(torrents.map(t => t.qb_torrent.category).filter(Boolean))).map(cat => ({
        text: cat,
        value: cat,
      })),
      onFilter: (value, record) => record.qb_torrent.category === value,
      render: (category: string) => category || '-',
    },
    {
      title: '卷',
      dataIndex: 'hasVolumes',
      key: 'hasVolumes',
      width: 80,
      filters: [
        { text: '有卷', value: true },
        { text: '无卷', value: false },
      ],
      render: (hasVolumes: boolean, record: TorrentWithVolume) => (
        hasVolumes ? (
          <Tag icon={<CheckCircleOutlined />} color="success">
            {record.volumeCount}
          </Tag>
        ) : (
          <Tag icon={<CloseCircleOutlined />} color="default" />
        )
      ),
    },
    {
      title: '名称',
      dataIndex: ['qb_torrent', 'name'],
      key: 'name',
      ellipsis: true,
      render: (text, record) => (
        <a onClick={() => showTorrentDetail(record)}>{text}</a>
      ),
    },
    {
      title: '进度',
      dataIndex: ['qb_torrent', 'progress'],
      key: 'progress',
      width: 120,
      render: (progress: number) => (
        <Progress
          percent={parseFloat((progress * 100).toFixed(1))}
          status={progress === 1 ? 'success' : 'active'}
          size="small"
        />
      ),
    },
    {
      title: '状态',
      dataIndex: ['qb_torrent', 'state'],
      key: 'state',
      width: 100,
      filters: [
        { text: '下载中', value: 'downloading' },
        { text: '做种中', value: 'uploading' },
        { text: '已暂停', value: 'paused' },
        { text: '已完成', value: 'completed' },
      ],
      render: (state: string) => (
        <Badge status={getStateStatus(state)} text={getStateText(state)} />
      ),
    },
    {
      title: '大小',
      dataIndex: ['qb_torrent', 'size'],
      key: 'size',
      width: 100,
      sorter: (a, b) => (a.qb_torrent?.size || 0) - (b.qb_torrent?.size || 0),
      render: (size: number) => formatSize(size),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <Space>
          <Button type="primary" onClick={syncTorrents} loading={syncing} icon={<SyncOutlined />}>
            同步 qBittorrent
          </Button>
          <Button onClick={() => router.push('/config')} icon={<SettingOutlined />}>
            配置
          </Button>
          <Search
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            onSearch={handleSearch}
            placeholder="搜索种子"
            style={{ width: '200px' }}
            allowClear
          />
        </Space>
      </div>

      {/* 种子列表 */}
      <Table
        columns={columns}
        dataSource={torrents}
        loading={loading}
        pagination={pagination}
        rowKey={(record) => record.qb_torrent.hash}
        size="small"
      />

      {/* 光盘编辑器 */}
      <DiscEditor ref={discEditorRef} onSave={handleDiscSaved} />
    </div>
  )
}

export default HomePage
