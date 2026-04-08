'use client'

import React, {useCallback, useState} from 'react'
import {Button, Card, message, Space, Typography} from 'antd'
import {LinkOutlined, SyncOutlined} from '@ant-design/icons'
import {postApi} from '@/lib/api'

const ConfigPage: React.FC = () => {
    const [syncing, setSyncing] = useState(false)
    const [linking, setLinking] = useState(false)
    const [rebuildingBangumi, setRebuildingBangumi] = useState(false)
    const [rebuildingMeili, setRebuildingMeili] = useState(false)

    // 同步 qBittorrent
    const syncTorrents = useCallback(async () => {
        setSyncing(true)
        try {
            const data = await postApi('/api/torrents/sync')
            if (data?.success) {
                message.success('同步完成')
            } else {
                message.error(data?.error || '同步失败')
            }
        } catch (error) {
            console.error('同步失败:', error)
            message.error('同步失败')
        } finally {
            setSyncing(false)
        }
    }, [])

    // 关联产品
    const linkProducts = useCallback(async () => {
        setLinking(true)
        try {
            const data = await postApi('/api/volumes/link-products')
            if (data?.success) {
                const result = (data.data as { updated: number; matched: number; skipped: number })
                message.success(`关联完成: 更新了 ${result.updated} 个卷，匹配了 ${result.matched} 个产品${result.skipped > 0 ? `，跳过 ${result.skipped} 个重复` : ''}`)
            } else {
                message.error(data?.error || '关联失败')
            }
        } catch (error) {
            console.error('关联失败:', error)
            message.error('关联失败')
        } finally {
            setLinking(false)
        }
    }, [])

    // 重建 Bangumi 索引
    const rebuildBangumi = useCallback(async () => {
        setRebuildingBangumi(true)
        try {
            const data = await postApi('/api/bangumi/rebuild')
            if (data?.success) {
                message.success('Bangumi 索引重建完成')
            } else {
                message.error(data?.error || '重建失败')
            }
        } catch (error) {
            console.error('Bangumi 重建失败:', error)
            message.error('Bangumi 重建失败')
        } finally {
            setRebuildingBangumi(false)
        }
    }, [])

    // 重建 Meilisearch 索引
    const rebuildMeili = useCallback(async () => {
        setRebuildingMeili(true)
        try {
            const data = await postApi('/api/meili/rebuild')
            if (data?.success) {
                message.success('suruga_ya 索引重建完成')
            } else {
                message.error(data?.error || '重建失败')
            }
        } catch (error) {
            console.error('suruga_ya 重建失败:', error)
            message.error('suruga_ya 重建失败')
        } finally {
            setRebuildingMeili(false)
        }
    }, [])

    return (
        <Space size="middle" orientation="vertical">
            <Card title="同步 qBittorrent">
                <Typography.Paragraph type="secondary">
                    从 qBittorrent 获取最新的种子列表并更新到数据库。如果种子已存在则更新状态，否则添加新种子。
                </Typography.Paragraph>
                <Button
                    onClick={syncTorrents}
                    loading={syncing}
                    icon={<SyncOutlined spin={syncing}/>}
                    block
                >
                    {syncing ? '同步中...' : '开始同步'}
                </Button>
            </Card>

            <Card title="关联产品">
                <Typography.Paragraph type="secondary">
                    根据 catalog_no 匹配 suruga_ya 产品库的型番，将匹配的产品 ID 填入卷的 product_ids 字段。
                </Typography.Paragraph>
                <Button
                    onClick={linkProducts}
                    loading={linking}
                    icon={<LinkOutlined/>}
                    block
                >
                    {linking ? '关联中...' : '开始关联'}
                </Button>
            </Card>

            <Card title="重建 Bangumi 索引">
                <Typography.Paragraph type="secondary" style={{marginBottom: 0}}>
                    执行 bangumi:rebuild 脚本：删除旧索引并从 MongoDB 全量重建 Bangumi 搜索索引。
                </Typography.Paragraph>
                <Button
                    onClick={rebuildBangumi}
                    loading={rebuildingBangumi}
                    icon={<SyncOutlined spin={rebuildingBangumi}/>}
                    block
                >
                    {rebuildingBangumi ? '重建中...' : '开始重建'}
                </Button>
            </Card>

            <Card title="重建 suruga_ya 索引">
                <Typography.Paragraph type="secondary" style={{marginBottom: 0}}>
                    执行 meili:rebuild 脚本：删除旧索引并从 MongoDB 全量重建产品搜索索引。
                </Typography.Paragraph>
                <Button
                    onClick={rebuildMeili}
                    loading={rebuildingMeili}
                    icon={<SyncOutlined spin={rebuildingMeili}/>}
                    block
                >
                    {rebuildingMeili ? '重建中...' : '开始重建'}
                </Button>
            </Card>
        </Space>
    )
}

export default ConfigPage