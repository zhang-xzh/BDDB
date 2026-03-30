'use client'

import React, {useCallback, useState} from 'react'
import {Button, Card, Col, Flex, message, Row, Space, Typography} from 'antd'
import {LinkOutlined, SettingOutlined, SyncOutlined} from '@ant-design/icons'
import {postApi} from '@/lib/api'
import {SPACING} from '@/lib/utils'

const ConfigPage: React.FC = () => {
    const [syncing, setSyncing] = useState(false)
    const [linking, setLinking] = useState(false)

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

    return (
        <Flex vertical gap={SPACING.lg}>
            <Flex align="center" gap={8}>
                <SettingOutlined style={{fontSize: 24}}/>
                <Typography.Title level={4} style={{margin: 0}}>配置</Typography.Title>
            </Flex>

            <Row gutter={[SPACING.md, SPACING.md]}>
                {/* 同步操作 */}
                <Col xs={24} md={12}>
                    <Card title="同步操作" size="small" styles={{body: {padding: SPACING.md}}}>
                        <Space style={{width: '100%'}} size={SPACING.md} orientation="vertical">
                            <Flex vertical gap="small">
                                <Typography.Text strong style={{fontSize: 13}}>同步 qBittorrent</Typography.Text>
                                <Typography.Paragraph type="secondary" style={{fontSize: 12}}>
                                    从 qBittorrent 获取最新的种子列表并更新到数据库。如果种子已存在则更新状态，否则添加新种子。
                                </Typography.Paragraph>
                                <Button
                                    type="primary"
                                    onClick={syncTorrents}
                                    loading={syncing}
                                    icon={<SyncOutlined spin={syncing}/>}
                                    size="middle"
                                    block
                                >
                                    {syncing ? '同步中...' : '开始同步'}
                                </Button>
                            </Flex>

                        </Space>
                    </Card>
                </Col>

                {/* 数据管理 */}
                <Col xs={24} md={12}>
                    <Card title="数据管理" size="small" styles={{body: {padding: SPACING.md}}}>
                        <Space style={{width: '100%'}} size={SPACING.md} orientation="vertical">
                            <Flex vertical gap="small">
                                <Typography.Text strong style={{fontSize: 13}}>关联产品</Typography.Text>
                                <Typography.Paragraph type="secondary" style={{fontSize: 12, marginBottom: 0}}>
                                    根据 catalog_no 匹配 suruga_ya 产品库的型番，将匹配的产品 ID 填入卷的 product_ids 字段。
                                </Typography.Paragraph>
                                <Button
                                    onClick={linkProducts}
                                    loading={linking}
                                    icon={<LinkOutlined/>}
                                    size="middle"
                                    block
                                >
                                    {linking ? '关联中...' : '开始关联'}
                                </Button>
                            </Flex>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </Flex>
    )
}

export default ConfigPage